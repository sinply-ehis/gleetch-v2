// Shared implementation for all three overlay variants below — same
// diagonal color-wash technique (a ::before pseudo-element with a
// fading gradient, drifting via background-position), differing only
// in which CSS mix-blend-mode composites it onto whatever's underneath.
// screen lightens/glows, multiply deepens shadows, overlay (the literal
// blend mode, not to be confused with this effect's own category) does
// a punchier mix of both depending on the base element's tones.
function overlayWeb(mode, intensity, rng, params = {}) {
  const opacity = (params.overlayOpacity ?? 0.5).toFixed(2);
  const color = params.overlayColor ?? '#00E5FF';
  const dur = (3 + (1 - intensity) * 9).toFixed(2);
  return {
    rules: `.gleetch-fx{position:relative;}.gleetch-fx::before{content:'';position:absolute;inset:0;pointer-events:none;mix-blend-mode:${mode};opacity:${opacity};background:linear-gradient(120deg,${color},transparent 60%);background-size:220% 220%;animation:gleetch-ov-${mode} ${dur}s ease-in-out infinite;}
@keyframes gleetch-ov-${mode}{0%,100%{background-position:0% 0%;}50%{background-position:100% 100%;}}`,
  };
}

const overlayParams = (defaultColor) => [
  { key: 'overlayOpacity', type: 'range', label: 'opacity', default: 0.5, min: 0.15, max: 0.85, step: 0.05 },
  { key: 'overlayColor', type: 'color', label: 'color', default: defaultColor },
];

export function overlayScreenWeb(intensity, rng, params) { return overlayWeb('screen', intensity, rng, params); }
export function overlayMultiplyWeb(intensity, rng, params) { return overlayWeb('multiply', intensity, rng, params); }
export function overlayBlendWeb(intensity, rng, params) { return overlayWeb('overlay', intensity, rng, params); }

export const OVERLAY_WEB_EFFECTS = [
  { id: 'overlayScreenWeb', label: 'OVERLAY SCREEN', hint: 'lightening color-wash blend', category: 'overlay', mediaTypes: ['web'], fn: overlayScreenWeb, params: overlayParams('#00E5FF') },
  { id: 'overlayMultiplyWeb', label: 'OVERLAY MULTIPLY', hint: 'darkening color-wash blend', category: 'overlay', mediaTypes: ['web'], fn: overlayMultiplyWeb, params: overlayParams('#FF2D6B') },
  { id: 'overlayBlendWeb', label: 'OVERLAY BLEND', hint: 'contrast-punching mix blend', category: 'overlay', mediaTypes: ['web'], fn: overlayBlendWeb, params: overlayParams('#FF2D6B') },
];
