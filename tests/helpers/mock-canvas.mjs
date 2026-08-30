// Loose Canvas2D mock: not pixel-accurate, just needs to (a) implement every
// method the patterns/overlay effects call without throwing, and (b) leave
// a valid, non-degenerate Uint8ClampedArray so downstream consumers have
// real data to work with. See CONTRIBUTING.md for why this exists instead
// of a headless-browser dependency.
function parseColor(str) {
  if (typeof str !== 'string') return [128, 128, 128, 255];
  const hex = str.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
  }
  const hsl = str.match(/hsla?\(([-\d.]+),\s*([\d.]+)%,\s*([\d.]+)%(?:,\s*([\d.]+))?\)/i);
  if (hsl) {
    const h = parseFloat(hsl[1]) % 360, s = parseFloat(hsl[2]) / 100, l = parseFloat(hsl[3]) / 100;
    const a = hsl[4] !== undefined ? Math.round(parseFloat(hsl[4]) * 255) : 255;
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
    let [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255), a];
  }
  const rgba = str.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/i);
  if (rgba) return [+rgba[1], +rgba[2], +rgba[3], rgba[4] !== undefined ? Math.round(+rgba[4] * 255) : 255];
  return [128, 128, 128, 255];
}

export function createMockContext(W, H) {
  const buf = new Uint8ClampedArray(W * H * 4).fill(0);
  for (let i = 3; i < buf.length; i += 4) buf[i] = 255;
  let fillColor = [0, 0, 0, 255], strokeColor = [0, 0, 0, 255], path = [];
  const paintRect = (x, y, w, h, color) => {
    const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(W, Math.ceil(x + w)), y1 = Math.min(H, Math.ceil(y + h));
    for (let py = y0; py < y1; py++) for (let px = x0; px < x1; px++) {
      const i = (py * W + px) * 4;
      buf[i] = color[0]; buf[i + 1] = color[1]; buf[i + 2] = color[2]; buf[i + 3] = color[3];
    }
  };
  return {
    set fillStyle(v) { fillColor = typeof v === 'object' ? (v.stops?.[0]?.color || [128, 128, 128, 255]) : parseColor(v); },
    get fillStyle() { return fillColor; },
    set strokeStyle(v) { strokeColor = typeof v === 'object' ? (v.stops?.[0]?.color || [128, 128, 128, 255]) : parseColor(v); },
    get strokeStyle() { return strokeColor; },
    lineWidth: 1, font: '10px sans-serif', shadowBlur: 0, shadowColor: '#000', globalAlpha: 1,
    fillRect(x, y, w, h) { paintRect(x, y, w, h, fillColor); },
    strokeRect(x, y, w, h) { paintRect(x, y, w, h, strokeColor); },
    clearRect(x, y, w, h) { paintRect(x, y, w, h, [0, 0, 0, 0]); },
    beginPath() { path = []; }, moveTo(x, y) { path.push([x, y]); }, lineTo(x, y) { path.push([x, y]); },
    closePath() { if (path.length) path.push(path[0]); },
    arc(cx, cy, r) { path.push([cx - r, cy - r], [cx + r, cy + r]); },
    ellipse(cx, cy, rx, ry) { path.push([cx - rx, cy - ry], [cx + rx, cy + ry]); },
    bezierCurveTo(c1x, c1y, c2x, c2y, x, y) { path.push([x, y]); },
    quadraticCurveTo(cx, cy, x, y) { path.push([x, y]); },
    fill() { if (path.length) { const xs = path.map(p => p[0]), ys = path.map(p => p[1]); paintRect(Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs) || 1, Math.max(...ys) - Math.min(...ys) || 1, fillColor); } },
    stroke() { if (path.length) { const xs = path.map(p => p[0]), ys = path.map(p => p[1]); paintRect(Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs) || 1, Math.max(...ys) - Math.min(...ys) || 1, strokeColor); } },
    fillText(t, x, y) { paintRect(x, y - 8, 6 * String(t).length, 10, fillColor); },
    createLinearGradient() { const stops = []; return { addColorStop(o, c) { stops.push({ o, color: parseColor(c) }); }, stops }; },
    createRadialGradient() { const stops = []; return { addColorStop(o, c) { stops.push({ o, color: parseColor(c) }); }, stops }; },
    createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h }; },
    getImageData(x, y, w, h) { return { data: buf.slice(0), width: w, height: h }; },
    putImageData(imgData) { buf.set(imgData.data); },
    drawImage(src) {
      try {
        if (src && typeof src.getContext === 'function') {
          const sctx = src.getContext('2d');
          if (sctx && typeof sctx.getImageData === 'function') {
            const sd = sctx.getImageData(0, 0, W, H);
            if (sd && sd.data) buf.set(sd.data.slice(0, Math.min(buf.length, sd.data.length)));
            return;
          }
        }
        if (src && src.data) buf.set(src.data.slice(0, Math.min(buf.length, src.data.length)));
      } catch {}
    },
    save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, clip() {}, setLineDash() {},
  };
}

// Shims global.document.createElement('canvas') using the mock above —
// call this once at the top of a test file that needs to exercise
// document-dependent code (overlay effects, web CSS bookmarklet builder).
export function installDocumentShim() {
  global.document = {
    createElement(tag) {
      if (tag !== 'canvas') throw new Error('mock document only supports canvas: ' + tag);
      let _w = 0, _h = 0, ctx = null;
      return {
        get width() { return _w; }, set width(v) { _w = v; ctx = createMockContext(_w || 1, _h || 1); },
        get height() { return _h; }, set height(v) { _h = v; ctx = createMockContext(_w || 1, _h || 1); },
        getContext() { return ctx; },
      };
    },
  };
}
