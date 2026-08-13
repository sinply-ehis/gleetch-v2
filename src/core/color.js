export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export function hsl2rgb(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0) * 255 | 0, f(8) * 255 | 0, f(4) * 255 | 0];
}

export function setpx(data, i, r, g, b, a = 255) {
  data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a;
}

// #rgb, #rrggbb, or bare rrggbb -> [r,g,b]. Falls back to white on anything
// that doesn't parse cleanly (e.g. a param default that's momentarily
// missing) rather than propagating NaN into a pixel buffer.
export function hexToRgb(hex) {
  if (!hex) return [255, 255, 255];
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(n)) return [255, 255, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// fn(x, y, normX, normY) -> [r,g,b] | [r,g,b,a] | null (null = leave pixel as-is)
export function pixelFill(ctx, W, H, fn) {
  const id = ctx.createImageData(W, H);
  const d = id.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const result = fn(x, y, x / W, y / H);
      if (result) setpx(d, i, result[0], result[1], result[2], result[3] ?? 255);
    }
  }
  ctx.putImageData(id, 0, 0);
}
