// Jittered-grid cell centers: one center per grid cell, at a random offset
// within it. Gives evenly-distributed-but-organic cells without the O(n^2)
// cost pure random scatter needs for even coverage, and guarantees the true
// nearest center to any pixel always sits within its own grid cell or the
// 8 neighboring ones — so nearestCell only ever has to check those 9.
function buildCells(W, H, cellSize, rng) {
  const cols = Math.max(1, Math.ceil(W / cellSize));
  const rows = Math.max(1, Math.ceil(H / cellSize));
  const centers = new Float64Array(cols * rows * 2);
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const idx = (gy * cols + gx) * 2;
      centers[idx] = Math.min(W - 1, (gx + 0.15 + rng() * 0.7) * cellSize);
      centers[idx + 1] = Math.min(H - 1, (gy + 0.15 + rng() * 0.7) * cellSize);
    }
  }
  return { centers, cols, rows };
}

function nearestCell(x, y, cellSize, cols, rows, centers) {
  const gx = Math.min(cols - 1, Math.floor(x / cellSize));
  const gy = Math.min(rows - 1, Math.floor(y / cellSize));
  let best = 0, bestD = Infinity;
  for (let dy = -1; dy <= 1; dy++) {
    const ny = gy + dy;
    if (ny < 0 || ny >= rows) continue;
    for (let dx = -1; dx <= 1; dx++) {
      const nx = gx + dx;
      if (nx < 0 || nx >= cols) continue;
      const idx = (ny * cols + nx) * 2;
      const ddx = x - centers[idx], ddy = y - centers[idx + 1];
      const d = ddx * ddx + ddy * ddy;
      if (d < bestD) { bestD = d; best = ny * cols + nx; }
    }
  }
  return best;
}

import { lerpBuffer } from '../../core/blend.js';

// Voronoi tessellation — one shared implementation, two very different
// reads of it depending on the cellColor param: VORONOI fills each cell
// with its own source-average color (stained-glass/mosaic), CRYSTALLIZE
// keeps the original image and draws only the facet boundaries over it
// (cracked-glass). Both registry entries below point at this same
// function; only their default cellColor differs.
//
// realtimeSafe: false — the nearest-cell search plus boundary dilation is
// meaningfully heavier than the other stylize effects (measured, not
// guessed: see the benchmark in the PR notes). Full-quality frame capture
// only on video, same as oilPaint.
export function voronoiCells(buf, W, H, intensity, rng, params) {
  if (intensity <= 0) return new Uint8ClampedArray(buf);
  const cellSize = Math.max(10, Math.min(100, params?.cellSize ?? 30));
  const mode = params?.cellColor ?? 'source-average';
  const edgeThickness = Math.max(1, Math.min(3, Math.round(params?.edgeThickness ?? 1)));
  const { centers, cols, rows } = buildCells(W, H, cellSize, rng);
  const cellCount = cols * rows;

  const assign = new Int32Array(W * H);
  const sumR = new Float64Array(cellCount), sumG = new Float64Array(cellCount), sumB = new Float64Array(cellCount);
  const counts = new Int32Array(cellCount);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = nearestCell(x, y, cellSize, cols, rows, centers);
      const idx = y * W + x;
      assign[idx] = cell;
      if (mode === 'source-average') {
        const i = idx * 4;
        sumR[cell] += buf[i]; sumG[cell] += buf[i + 1]; sumB[cell] += buf[i + 2];
        counts[cell]++;
      }
    }
  }

  const edgeShade = 0;
  const full = new Uint8ClampedArray(buf.length);
  full.set(buf);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x, cell = assign[idx];
      let edge = false;
      for (let dy = -edgeThickness; dy <= edgeThickness && !edge; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= H) continue;
        for (let dx = -edgeThickness; dx <= edgeThickness; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= W) continue;
          if (assign[ny * W + nx] !== cell) { edge = true; break; }
        }
      }
      const i = idx * 4;
      if (mode === 'source-average') {
        if (edge) { full[i] = full[i + 1] = full[i + 2] = edgeShade; }
        else {
          const n = counts[cell] || 1;
          full[i] = sumR[cell] / n; full[i + 1] = sumG[cell] / n; full[i + 2] = sumB[cell] / n;
        }
      } else if (edge) {
        full[i] = full[i + 1] = full[i + 2] = edgeShade;
      }
    }
  }
  if (intensity >= 1) return full;
  return lerpBuffer(buf, full, intensity);
}

const cellParams = (defaultMode) => [
  { key: 'cellSize', type: 'range', label: 'CELL SIZE', default: 30, min: 12, max: 70, step: 2 },
  { key: 'cellColor', type: 'select', label: 'FILL', default: defaultMode, options: [{ value: 'source-average', label: 'Filled' }, { value: 'outline-only', label: 'Outline' }] },
  { key: 'edgeThickness', type: 'range', label: 'EDGE', default: 1, min: 1, max: 3, step: 1 },
];

export const GEOMETRIC_EFFECTS = [
  { id: 'voronoi', label: 'VORONOI', hint: 'stained-glass cell mosaic (full-quality frame capture only)', category: 'stylize', mediaTypes: ['image', 'video'], realtimeSafe: false, fn: voronoiCells, params: cellParams('source-average') },
  { id: 'crystallize', label: 'CRYSTALLIZE', hint: 'faceted outline over the source image (full-quality frame capture only)', category: 'stylize', mediaTypes: ['image', 'video'], realtimeSafe: false, fn: voronoiCells, params: cellParams('outline-only') },
];
