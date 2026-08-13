// Seeded PRNG + noise — every effect derives randomness from these so
// output is fully reproducible from a single seed integer.

export function prng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hash2(x, y, seed) {
  let h = (((seed * 0x9e3779b9) >>> 0) ^ ((x * 0x85ebca6b) >>> 0) ^ ((y * 0xc2b2ae35) >>> 0)) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x45d9f3b) >>> 0;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function vnoise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  return (
    hash2(ix, iy, seed) * (1 - u) * (1 - v) +
    hash2(ix + 1, iy, seed) * u * (1 - v) +
    hash2(ix, iy + 1, seed) * (1 - u) * v +
    hash2(ix + 1, iy + 1, seed) * u * v
  );
}

export function fbm(x, y, seed, octaves = 5, scale = 4) {
  let value = 0, amp = 1, freq = scale, norm = 0;
  for (let o = 0; o < octaves; o++) {
    value += vnoise(x * freq, y * freq, seed + o * 7919) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return value / norm;
}

// Deterministic seed derived from a string — used where something needs a
// stable-but-varied seed tied to a label rather than true randomness (e.g.
// a UI element that should look the same every render, not reroll itself).
export function seedFromString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(h, 31) + str.charCodeAt(i)) >>> 0;
  return h || 1;
}
