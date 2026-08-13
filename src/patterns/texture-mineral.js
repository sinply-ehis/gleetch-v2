import { hsl2rgb, pixelFill, clamp } from '../core/color.js';
import { fbm } from '../core/rng.js';

// Each pattern receives (ctx, W, H, rng) and draws directly to ctx.
// Randomness is derived from rng() so output is seed-reproducible.

export function p_crumpled_foil(ctx, W, H, rng) {
  const seed = (rng() * 9999) | 0, hue = rng() * 360;
  pixelFill(ctx, W, H, (x, y) => {
    const crease = fbm(x * 0.03, y * 0.03, seed, 5, 2);
    const facet = Math.sin(crease * 30);
    return hsl2rgb(hue, 12, clamp(45 + facet * 40, 5, 92));
  });
}

export function p_rust_patina(ctx, W, H, rng) {
  const seed = (rng() * 9999) | 0;
  pixelFill(ctx, W, H, (x, y) => {
    const n = fbm(x * 0.02, y * 0.02, seed, 4, 4);
    return hsl2rgb(18 + n * 24, 58, 22 + n * 30);
  });
}

// Voronoi cell-boundary cracking (dried lakebed plates) — distinct from the
// existing organic fbm-difference "cracks" pattern's vein-like branching.
export function p_cracked_earth(ctx, W, H, rng) {
  const cellSize = 40 + rng() * 30, seed = (rng() * 9999) | 0;
  const cells = [];
  for (let cy = -cellSize; cy < H + cellSize; cy += cellSize) {
    for (let cx = -cellSize; cx < W + cellSize; cx += cellSize) {
      cells.push([cx + (fbm(cx, cy, seed) - 0.5) * cellSize, cy + (fbm(cx + 99, cy, seed) - 0.5) * cellSize]);
    }
  }
  pixelFill(ctx, W, H, (x, y) => {
    let d1 = Infinity, d2 = Infinity;
    for (const [px, py] of cells) {
      const d = Math.hypot(x - px, y - py);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    const base = 32 + fbm(x * 0.015, y * 0.015, seed + 1, 3) * 15;
    return (d2 - d1) < 2.5 ? hsl2rgb(20, 30, 10) : hsl2rgb(30, 45, base);
  });
}

// Fine warm luminance grain with a soft vignette — analog film stock, not
// the saturated per-pixel color noise + scanlines of the existing TV static.
export function p_film_grain(ctx, W, H, rng) {
  const tint = 30 + rng() * 30, seed = (rng() * 9999) | 0;
  pixelFill(ctx, W, H, (x, y) => {
    const grain = fbm(x * 0.8, y * 0.8, seed, 2, 6) - 0.5;
    const vignette = 1 - Math.hypot(x / W - 0.5, y / H - 0.5) * 0.4;
    return hsl2rgb(tint, 15, clamp((55 + grain * 18) * vignette, 0, 100));
  });
}

export function p_stone_wall(ctx, W, H, rng) {
  const brickH = 22 + rng() * 14, brickW = brickH * (1.8 + rng() * 0.6), seed = (rng() * 9999) | 0;
  const baseHue = 20 + rng() * 15;
  pixelFill(ctx, W, H, (x, y) => {
    const row = Math.floor(y / brickH);
    const offset = (row % 2) * (brickW / 2);
    const bx = ((x + offset) % brickW + brickW) % brickW;
    const by = y % brickH;
    const mortar = bx < 2 || by < 2;
    const shade = fbm((x - offset) * 0.03, y * 0.03, seed + row, 3) * 14;
    return mortar ? hsl2rgb(0, 0, 60) : hsl2rgb(baseHue, 25, 38 + shade);
  });
}

// Banded agate rings with inward-pointing crystal spikes from the cavity
// edge — distinct from both existing "frost" (branching dendrites) and
// "crystal" (recursive branching lines): this is concentric bands, not
// branches, with a hard cavity boundary.
export function p_geode_slice(ctx, W, H, rng) {
  const cx = W / 2, cy = H / 2, hue = rng() * 360, seed = (rng() * 9999) | 0;
  const maxR = Math.min(W, H) * 0.48;
  pixelFill(ctx, W, H, (x, y) => {
    const d = Math.hypot(x - cx, y - cy) / maxR;
    if (d > 1) return [8, 8, 14];
    const band = Math.sin(d * 22 + fbm(x * 0.02, y * 0.02, seed, 3) * 4) * 0.5 + 0.5;
    return hsl2rgb((hue + d * 40) % 360, 55, 22 + band * 35);
  });
  ctx.strokeStyle = `hsla(${hue},70%,85%,0.5)`;
  const spikes = 24 + Math.floor(rng() * 16);
  for (let i = 0; i < spikes; i++) {
    const angle = (i / spikes) * Math.PI * 2;
    const r0 = maxR * (0.85 + rng() * 0.1), len = maxR * (0.15 + rng() * 0.25);
    ctx.lineWidth = 1 + rng() * 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * r0, cy + Math.sin(angle) * r0);
    ctx.lineTo(cx + Math.cos(angle) * (r0 - len), cy + Math.sin(angle) * (r0 - len));
    ctx.stroke();
  }
}

export function p_lava_rock(ctx, W, H, rng) {
  const seed = (rng() * 9999) | 0;
  pixelFill(ctx, W, H, (x, y) => {
    const rock = fbm(x * 0.025, y * 0.025, seed, 4);
    const crack = fbm(x * 0.06, y * 0.06, seed + 50, 3);
    if (crack > 0.62) return hsl2rgb(18 + crack * 20, 90, 45 + crack * 25);
    return hsl2rgb(0, 0, 6 + rock * 10);
  });
}

export function p_paper_fiber(ctx, W, H, rng) {
  const seed = (rng() * 9999) | 0, tint = 40 + rng() * 20;
  pixelFill(ctx, W, H, (x, y) => {
    const fiber = fbm(x * 0.4, y * 0.02, seed, 3, 2) * 0.5 + fbm(x * 0.02, y * 0.4, seed + 1, 3, 2) * 0.5;
    return hsl2rgb(tint, 20, 88 + fiber * 8);
  });
}

export function p_oxidized_silver(ctx, W, H, rng) {
  const seed = (rng() * 9999) | 0;
  pixelFill(ctx, W, H, (x, y) => {
    const n = fbm(x * 0.018, y * 0.018, seed, 4);
    const tarnish = n > 0.55;
    return tarnish ? hsl2rgb(0, 0, 12 + n * 15) : hsl2rgb(210, 6, 68 + n * 20);
  });
}

export function p_obsidian_shard(ctx, W, H, rng) {
  const seed = (rng() * 9999) | 0;
  pixelFill(ctx, W, H, (x, y) => {
    const facet = fbm(x * 0.04, y * 0.04, seed, 3, 2.5);
    const shatter = Math.abs(Math.sin(facet * 25));
    const highlight = shatter > 0.93 ? 55 : 0;
    return hsl2rgb(260, 15, 6 + facet * 6 + highlight);
  });
}

export const TEXTURE_MINERAL_PATTERNS = [
  { id: 'crumpled_foil', label: 'Crumpled Foil', fn: p_crumpled_foil, family: 'texture' },
  { id: 'rust_patina', label: 'Rust Patina', fn: p_rust_patina, family: 'texture' },
  { id: 'cracked_earth', label: 'Cracked Earth', fn: p_cracked_earth, family: 'texture' },
  { id: 'film_grain', label: 'Film Grain', fn: p_film_grain, family: 'texture' },
  { id: 'stone_wall', label: 'Stone Wall', fn: p_stone_wall, family: 'texture' },
  { id: 'geode_slice', label: 'Geode Slice', fn: p_geode_slice, family: 'texture' },
  { id: 'lava_rock', label: 'Lava Rock', fn: p_lava_rock, family: 'texture' },
  { id: 'paper_fiber', label: 'Paper Fiber', fn: p_paper_fiber, family: 'texture' },
  { id: 'oxidized_silver', label: 'Oxidized Silver', fn: p_oxidized_silver, family: 'texture' },
  { id: 'obsidian_shard', label: 'Obsidian Shard', fn: p_obsidian_shard, family: 'texture' },
];
