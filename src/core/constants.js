export const CANVAS_SIZE = 512;
export const SEED_MAX = 999997;

export function randomSeed() {
  return Math.floor(Math.random() * SEED_MAX) + 1;
}
