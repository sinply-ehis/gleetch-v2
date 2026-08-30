export const CANVAS_SIZE = 512;
export const SEED_MAX = 2147483647;

export function randomSeed() {
  try {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return (a[0] % SEED_MAX) + 1;
  } catch {
    return Math.floor(Math.random() * SEED_MAX) + 1;
  }
}
