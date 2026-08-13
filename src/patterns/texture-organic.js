import { hsl2rgb, pixelFill, clamp } from '../core/color.js';
import { fbm } from '../core/rng.js';

// Side-view plank grain (warped horizontal lines + knots) — distinct from
// the existing "wood_grain" pattern's end-grain concentric rings.
export function p_plank_grain(ctx, W, H, rng) {
  const hue = 20 + rng() * 15, seed = (rng() * 9999) | 0;
  const knots = Array.from({ length: 2 + Math.floor(rng() * 3) }, () => [rng() * W, rng() * H]);
  pixelFill(ctx, W, H, (x, y) => {
    let warp = 0;
    for (const [kx, ky] of knots) warp += 40 / (1 + Math.hypot(x - kx, y - ky) * 0.05);
    const grain = Math.sin((y + warp) * 0.15 + fbm(x * 0.01, y * 0.01, seed, 3) * 8) * 0.5 + 0.5;
    return hsl2rgb(hue, 55, 26 + grain * 22 + fbm(x * 0.05, y * 0.05, seed + 1, 2) * 6);
  });
}

export function p_crumpled_paper(ctx, W, H, rng) {
  const seed = (rng() * 9999) | 0, tint = 35 + rng() * 20;
  pixelFill(ctx, W, H, (x, y) => {
    const crease = fbm(x * 0.02, y * 0.02, seed, 6, 2);
    return hsl2rgb(tint, 15, 78 + Math.sin(crease * 20) * 12);
  });
}

export function p_fabric_weave(ctx, W, H, rng) {
  const thread = 4 + rng() * 4, hue = rng() * 360, seed = (rng() * 9999) | 0;
  pixelFill(ctx, W, H, (x, y) => {
    const wx = Math.sin((x / thread) * Math.PI) * 0.5 + 0.5;
    const wy = Math.sin((y / thread) * Math.PI) * 0.5 + 0.5;
    const over = Math.floor(x / thread) % 2 === Math.floor(y / thread) % 2;
    const noise = fbm(x * 0.1, y * 0.1, seed, 2) * 6;
    return hsl2rgb(hue, 35, (over ? 42 : 30) + (over ? wx : wy) * 18 + noise);
  });
}

export function p_leather_grain(ctx, W, H, rng) {
  const seed = (rng() * 9999) | 0, hue = 20 + rng() * 15;
  pixelFill(ctx, W, H, (x, y) => {
    const bump = fbm(x * 0.15, y * 0.15, seed, 4, 3);
    const pore = fbm(x * 0.6, y * 0.6, seed + 1, 2, 5) > 0.72 ? -14 : 0;
    return hsl2rgb(hue, 45, 24 + bump * 16 + pore);
  });
}

export function p_rusted_metal(ctx, W, H, rng) {
  const seed = (rng() * 9999) | 0;
  pixelFill(ctx, W, H, (x, y) => {
    const rust = fbm(x * 0.025, y * 0.025, seed, 4);
    const scratch = Math.sin(x * 0.3 + fbm(x * 0.01, y * 0.01, seed + 3) * 10) > 0.985;
    if (scratch) return hsl2rgb(0, 0, 75);
    return rust > 0.5 ? hsl2rgb(16 + rust * 20, 60, 30 + rust * 15) : hsl2rgb(0, 0, 38 + rust * 20);
  });
}

export function p_corroded_copper(ctx, W, H, rng) {
  const seed = (rng() * 9999) | 0;
  pixelFill(ctx, W, H, (x, y) => {
    const n = fbm(x * 0.02, y * 0.02, seed, 5);
    return n > 0.58 ? hsl2rgb(165 + n * 20, 45, 38 + n * 15) : hsl2rgb(25, 55, 42 + n * 20);
  });
}

// Horizontal sedimentary rock bands with eroded edges — flat color bands,
// distinct from the existing "sand_dunes" pattern's smooth rippled shading.
export function p_canyon_strata(ctx, W, H, rng) {
  const seed = (rng() * 9999) | 0;
  const bandCount = 8 + Math.floor(rng() * 6);
  const hues = Array.from({ length: bandCount }, () => 15 + rng() * 30);
  pixelFill(ctx, W, H, (x, y) => {
    const erosion = fbm(x * 0.02, y * 0.1, seed, 3) * 18;
    const band = Math.floor(clamp(((y + erosion) / H) * bandCount, 0, bandCount - 1));
    const shade = fbm(x * 0.05, band * 10, seed + 1, 2) * 15;
    return hsl2rgb(hues[band], 55, 32 + shade + band * 1.5);
  });
}

export function p_carbon_fiber(ctx, W, H, rng) {
  const size = 6 + rng() * 4, seed = (rng() * 9999) | 0;
  pixelFill(ctx, W, H, (x, y) => {
    const diag = ((x + y) % (size * 2)) / (size * 2);
    const weave = diag < 0.5 ? diag * 2 : (1 - diag) * 2;
    return hsl2rgb(210, 15, 8 + weave * 10 + fbm(x * 0.08, y * 0.08, seed, 2) * 4);
  });
}

export function p_moss_growth(ctx, W, H, rng) {
  const seed = (rng() * 9999) | 0;
  pixelFill(ctx, W, H, (x, y) => {
    const patch = fbm(x * 0.02, y * 0.02, seed, 5);
    if (patch < 0.5) return hsl2rgb(30, 30, 25);
    const growth = fbm(x * 0.08, y * 0.08, seed + 2, 3);
    return hsl2rgb(95 + growth * 20, 45, 20 + growth * 25);
  });
}

export function p_static_snow(ctx, W, H, rng) {
  const seed = (rng() * 9999) | 0;
  pixelFill(ctx, W, H, (x, y) => {
    const v = 40 + fbm(x * 0.12, y * 0.12, seed, 3, 3) * 200;
    return [clamp(v, 0, 255), clamp(v, 0, 255), clamp(v + 15, 0, 255)];
  });
}

export const TEXTURE_ORGANIC_PATTERNS = [
  { id: 'plank_grain', label: 'Plank Grain', fn: p_plank_grain, family: 'texture' },
  { id: 'crumpled_paper', label: 'Crumpled Paper', fn: p_crumpled_paper, family: 'texture' },
  { id: 'fabric_weave', label: 'Fabric Weave', fn: p_fabric_weave, family: 'texture' },
  { id: 'leather_grain', label: 'Leather Grain', fn: p_leather_grain, family: 'texture' },
  { id: 'rusted_metal', label: 'Rusted Metal', fn: p_rusted_metal, family: 'texture' },
  { id: 'corroded_copper', label: 'Corroded Copper', fn: p_corroded_copper, family: 'texture' },
  { id: 'canyon_strata', label: 'Canyon Strata', fn: p_canyon_strata, family: 'texture' },
  { id: 'carbon_fiber', label: 'Carbon Fiber', fn: p_carbon_fiber, family: 'texture' },
  { id: 'moss_growth', label: 'Moss Growth', fn: p_moss_growth, family: 'texture' },
  { id: 'static_snow', label: 'Static Snow', fn: p_static_snow, family: 'texture' },
];
