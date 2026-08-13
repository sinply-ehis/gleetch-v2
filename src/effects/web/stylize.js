import { hexToRgb } from '../../core/color.js';

const rgba = (hex, a) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };

// Layered radial-gradients rather than the classic box-shadow "starfield"
// trick — box-shadow offsets must be fixed lengths, not percentages, so a
// box-shadow field would only look right at one assumed element size.
// Percentage-positioned gradients scale correctly on whatever element
// .gleetch-fx ends up applied to, small button or full page section alike.
// particleCount stays a fixed-choice select rather than a free range: it
// controls how many gradient layers get generated into the CSS string
// itself, not something a browser can smoothly interpolate at runtime.
export function cssParticleDrift(intensity, rng, params = {}) {
  const count = Number(params.particleCount ?? 40);
  const color = params.particleColor ?? '#E8E8FF';
  const speed = params.driftSpeed ?? 5;
  const dur = (19 - speed * 1.6).toFixed(1);
  const size = (1 + intensity * 1.8).toFixed(1);
  const layers = [];
  for (let i = 0; i < count; i++) {
    const x = (rng() * 100).toFixed(1), y = (rng() * 100).toFixed(1);
    const a = (0.25 + rng() * 0.55).toFixed(2);
    layers.push(`radial-gradient(circle ${size}px at ${x}% ${y}%, ${rgba(color, a)}, transparent ${size}px)`);
  }
  return {
    rules: `.gleetch-fx{position:relative;}.gleetch-fx::before{content:'';position:absolute;inset:0;pointer-events:none;background-image:${layers.join(',')};animation:gleetch-drift ${dur}s ease-in-out infinite;}
@keyframes gleetch-drift{0%,100%{transform:translate(0,0);}50%{transform:translate(2%,-6%);}}`,
  };
}

// Stacked drop-shadows at increasing blur radius is the standard CSS neon
// technique — filter (not box-shadow/text-shadow) so it hugs whatever
// shape the element actually is, not just its bounding box. The subtle
// opacity dip on a loop mimics a real neon tube's flicker without fading
// the element away; glowIntensity/glowSpread shape the static look,
// intensity (the main slider) only affects how much it flickers.
export function neonGlow(intensity, rng, params = {}) {
  const color = params.glowColor ?? '#00E5FF';
  const glowIntensity = params.glowIntensity ?? 5;
  const glowSpread = params.glowSpread ?? 5;
  const dur = (1.6 + rng() * 2.4).toFixed(2);
  const b1 = (1 + glowSpread * 0.6).toFixed(1);
  const b2 = (2 + glowSpread * 1.4).toFixed(1);
  const b3 = (4 + glowSpread * 2.6).toFixed(1);
  const strength = (0.4 + (glowIntensity / 10) * 0.6).toFixed(2);
  const dip = (0.9 - intensity * 0.35).toFixed(2);
  return {
    rules: `.gleetch-fx{filter:drop-shadow(0 0 ${b1}px ${color}) drop-shadow(0 0 ${b2}px ${rgba(color, strength)}) drop-shadow(0 0 ${b3}px ${rgba(color, (strength * 0.7).toFixed(2))});}`,
    keyframes: `@keyframes gleetch-neon{0%,100%{opacity:1;}50%{opacity:${dip};}}`,
    animation: `gleetch-neon ${dur}s ease-in-out infinite`,
  };
}

// Deliberately not a reskin of NOISE STATIC: that effect is fine, harsh
// fractalNoise flickering fast (TV static). This uses coarser `turbulence`
// noise (bigger grain clumps), desaturated via feColorMatrix so color
// noise doesn't tint the page, and drifts opacity slowly instead of
// flickering — closer to analog film grain than video interference.
export function filmGrain(intensity, rng, params = {}) {
  const opacity = (params.grainOpacity ?? 0.2).toFixed(2);
  const speed = params.flickerSpeed ?? 5;
  const dur = (2.4 - speed * 0.12).toFixed(2);
  const freq = (0.35 + intensity * 0.35).toFixed(2);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg'><filter id='g'><feTurbulence type='turbulence' baseFrequency='${freq}' numOctaves='3'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%25' height='100%25' filter='url(%23g)'/></svg>`;
  return {
    rules: `.gleetch-fx{position:relative;}.gleetch-fx::after{content:'';position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;opacity:${opacity};background-image:url("data:image/svg+xml,${svg}");animation:gleetch-grain ${dur}s ease-in-out infinite;}
@keyframes gleetch-grain{0%,100%{opacity:${opacity};}50%{opacity:${(opacity * 0.55).toFixed(2)};}}`,
  };
}

export const STYLIZE_WEB_EFFECTS = [
  {
    id: 'cssParticleDrift', label: 'PARTICLE DRIFT', hint: 'drifting dust-field overlay', category: 'stylize', mediaTypes: ['web'], fn: cssParticleDrift,
    params: [
      { key: 'particleCount', type: 'select', label: 'count', default: '40', options: [{ value: '20', label: '20' }, { value: '40', label: '40' }, { value: '60', label: '60' }] },
      { key: 'particleColor', type: 'color', label: 'color', default: '#E8E8FF' },
      { key: 'driftSpeed', type: 'range', label: 'speed', default: 5, min: 1, max: 10, step: 1 },
    ],
  },
  {
    id: 'neonGlow', label: 'NEON GLOW', hint: 'flickering stacked-glow filter', category: 'color-tone', mediaTypes: ['web'], fn: neonGlow,
    params: [
      { key: 'glowColor', type: 'color', label: 'color', default: '#00E5FF' },
      { key: 'glowIntensity', type: 'range', label: 'strength', default: 5, min: 1, max: 10, step: 1 },
      { key: 'glowSpread', type: 'range', label: 'spread', default: 5, min: 1, max: 10, step: 1 },
    ],
  },
  {
    id: 'filmGrain', label: 'FILM GRAIN', hint: 'coarse desaturated analog grain', category: 'stylize', mediaTypes: ['web'], fn: filmGrain,
    params: [
      { key: 'grainOpacity', type: 'range', label: 'opacity', default: 0.2, min: 0.05, max: 0.5, step: 0.05 },
      { key: 'flickerSpeed', type: 'range', label: 'speed', default: 5, min: 1, max: 10, step: 1 },
    ],
  },
];
