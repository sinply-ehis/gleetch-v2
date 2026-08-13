// Each web effect returns { keyframes?, animation?, rules? } instead of
// transformed data — these GENERATE CSS rather than transform a buffer.
// All target a single shared class, .gleetch-fx, so multiple effects can
// layer onto the same element. Two composability notes worth being honest
// about rather than papering over:
//   - `animation` contributions are merged into ONE combined shorthand on
//     .gleetch-fx (comma-separated), so effects animating DIFFERENT
//     properties genuinely run simultaneously.
//   - Effects that animate the SAME property (filter: RGB SPLIT / HUE
//     CYCLE / INVERT PULSE, or transform: GLITCH SLICE / VHS WOBBLE) will
//     have the later-selected one win for that property during overlap —
//     standard CSS cascade behavior, not a bug, but worth knowing before
//     you combine e.g. both filter-based effects and expect both to show.

export function cssRgbSplit(intensity) {
  const off = (1 + intensity * 4).toFixed(1);
  return { rules: `.gleetch-fx{filter:drop-shadow(${off}px 0 0 rgba(255,45,107,.7)) drop-shadow(-${off}px 0 0 rgba(0,229,255,.7));}` };
}

export function cssHueCycle(intensity) {
  const dur = (3 + (1 - intensity) * 6).toFixed(1);
  return {
    keyframes: `@keyframes gleetch-hue{0%{filter:hue-rotate(0deg);}100%{filter:hue-rotate(360deg);}}`,
    animation: `gleetch-hue ${dur}s linear infinite`,
  };
}

export function cssScanlines(intensity) {
  const opacity = (0.08 + intensity * 0.3).toFixed(2);
  const gap = Math.max(2, Math.round(6 - intensity * 3));
  return { rules: `.gleetch-fx{position:relative;}.gleetch-fx::after{content:'';position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,${opacity}) 0,rgba(0,0,0,${opacity}) 1px,transparent 1px,transparent ${gap}px);}` };
}

export function cssNoiseStatic(intensity, rng) {
  const opacity = (0.04 + intensity * 0.12).toFixed(2);
  const dur = (0.15 + rng() * 0.1).toFixed(2);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>`;
  return { rules: `.gleetch-fx{position:relative;}.gleetch-fx::before{content:'';position:absolute;inset:0;pointer-events:none;opacity:${opacity};background-image:url("data:image/svg+xml,${svg}");animation:gleetch-noise ${dur}s steps(1) infinite;}
@keyframes gleetch-noise{0%,100%{opacity:${opacity};}50%{opacity:${(opacity * 0.4).toFixed(2)};}}` };
}

export function cssGlitchSlice(intensity, rng) {
  const dur = (0.35 + rng() * 0.5).toFixed(2);
  const n = 5 + Math.floor(intensity * 5);
  let frames = `0%,100%{clip-path:inset(0 0 0 0);transform:translateX(0);}`;
  for (let i = 1; i < n; i++) {
    const pct = ((i / n) * 100).toFixed(1);
    const top = rng() * 70;
    const bottom = Math.max(0, 100 - top - rng() * 25).toFixed(1);
    const shift = ((rng() * 2 - 1) * (4 + intensity * 14)).toFixed(1);
    frames += `${pct}%{clip-path:inset(${top.toFixed(1)}% 0 ${bottom}% 0);transform:translateX(${shift}px);}`;
  }
  return { keyframes: `@keyframes gleetch-slice{${frames}}`, animation: `gleetch-slice ${dur}s steps(1) infinite` };
}

export function cssDatamoshJump(intensity, rng) {
  const dur = (0.5 + rng() * 0.8).toFixed(2);
  const n = 4 + Math.floor(intensity * 4);
  let frames = `0%,100%{box-shadow:0 0 0 rgba(0,0,0,0);}`;
  for (let i = 1; i < n; i++) {
    const pct = ((i / n) * 100).toFixed(1);
    const spread = (2 + rng() * (6 + intensity * 10)).toFixed(1);
    const dx = ((rng() * 2 - 1) * 10).toFixed(1), dy = ((rng() * 2 - 1) * 10).toFixed(1);
    const color = rng() < 0.5 ? '255,45,107' : '0,229,255';
    frames += `${pct}%{box-shadow:${dx}px ${dy}px 0 ${spread}px rgba(${color},0.4);}`;
  }
  return { keyframes: `@keyframes gleetch-jump{${frames}}`, animation: `gleetch-jump ${dur}s steps(1) infinite` };
}

export function cssVhsWobble(intensity, rng) {
  const dur = (2 + rng() * 2).toFixed(2);
  const skew = (0.3 + intensity * 1.2).toFixed(2);
  return {
    keyframes: `@keyframes gleetch-vhs{0%,100%{transform:skewX(0) scaleY(1);}25%{transform:skewX(${skew}deg) scaleY(1.004);}75%{transform:skewX(-${skew}deg) scaleY(0.997);}}`,
    animation: `gleetch-vhs ${dur}s ease-in-out infinite`,
  };
}

export function cssInvertPulse(intensity, rng) {
  const dur = (2.5 + rng() * 3).toFixed(2);
  const hold = Math.max(80, 96 - intensity * 12);
  return {
    keyframes: `@keyframes gleetch-invert{0%,${hold.toFixed(0)}%,100%{filter:invert(0);}${(hold + 2).toFixed(0)}%{filter:invert(1);}}`,
    animation: `gleetch-invert ${dur}s steps(1) infinite`,
  };
}

export const WEB_EFFECTS = [
  { id: 'cssRgbSplit', label: 'RGB SPLIT', hint: 'chromatic aberration via drop-shadow', category: 'color-tone', mediaTypes: ['web'], fn: cssRgbSplit },
  { id: 'cssHueCycle', label: 'HUE CYCLE', hint: 'slow rotating hue-shift', category: 'color-tone', mediaTypes: ['web'], fn: cssHueCycle },
  { id: 'cssScanlines', label: 'SCANLINES', hint: 'CRT scanline overlay', category: 'stylize', mediaTypes: ['web'], fn: cssScanlines },
  { id: 'cssNoiseStatic', label: 'NOISE STATIC', hint: 'flickering turbulence grain', category: 'corruption', mediaTypes: ['web'], fn: cssNoiseStatic },
  { id: 'cssGlitchSlice', label: 'GLITCH SLICE', hint: 'clip-path band-jump', category: 'corruption', mediaTypes: ['web'], fn: cssGlitchSlice },
  { id: 'cssDatamoshJump', label: 'DATAMOSH JUMP', hint: 'jumping color-shadow flash', category: 'corruption', mediaTypes: ['web'], fn: cssDatamoshJump },
  { id: 'cssVhsWobble', label: 'VHS WOBBLE', hint: 'skew/scale tape wobble', category: 'distortion', mediaTypes: ['web'], fn: cssVhsWobble },
  { id: 'cssInvertPulse', label: 'INVERT PULSE', hint: 'brief color inversion flash', category: 'corruption', mediaTypes: ['web'], fn: cssInvertPulse },
];
