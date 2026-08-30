export const FORMATS = [
  { id: 'original', label: 'ORIGINAL', ratio: null },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '4:3', label: '4:3', ratio: 4 / 3 },
  { id: '3:4', label: '3:4', ratio: 3 / 4 },
  { id: '3:2', label: '3:2', ratio: 3 / 2 },
  { id: '2:3', label: '2:3', ratio: 2 / 3 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
  { id: '21:9', label: '21:9', ratio: 21 / 9 },
  { id: '9:21', label: '9:21', ratio: 9 / 21 },
  { id: 'custom', label: 'CUSTOM', ratio: null },
];

export const FORMAT_IDS = new Set(FORMATS.map((f) => f.id));

export function clampDim(v) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 512;
  return Math.max(64, Math.min(2048, n));
}

export function resolveDims(format, customW, customH, img, maxDim) {
  const cap = Math.max(64, Math.min(2048, maxDim || 2048));
  if (format === 'custom') {
    let W = clampDim(customW);
    let H = clampDim(customH);
    const scale = Math.min(1, cap / Math.max(W, H));
    if (scale < 1) { W = Math.max(1, Math.round(W * scale)); H = Math.max(1, Math.round(H * scale)); }
    return { W, H, capped: scale < 1 };
  }
  if (format === 'original') {
    if (img) {
      const w = img.naturalWidth || img.videoWidth || 512;
      const h = img.naturalHeight || img.videoHeight || 512;
      const scale = Math.min(1, cap / Math.max(w, h));
      return { W: Math.max(1, Math.round(w * scale)), H: Math.max(1, Math.round(h * scale)), capped: scale < 1 };
    }
    const s = Math.min(512, cap);
    return { W: s, H: s, capped: false };
  }
  const entry = FORMATS.find((f) => f.id === format);
  const ratio = entry?.ratio ?? 1;
  // long edge = cap (but never >2048), short edge derived from ratio
  const longEdge = cap;
  let W, H;
  if (ratio >= 1) { W = longEdge; H = Math.max(1, Math.round(longEdge / ratio)); }
  else { H = longEdge; W = Math.max(1, Math.round(longEdge * ratio)); }
  // both already within cap by construction, but clamp custom safety
  W = Math.max(64, Math.min(2048, W)); H = Math.max(64, Math.min(2048, H));
  return { W, H, capped: false };
}

export function formatLabel(id) {
  return FORMATS.find((f) => f.id === id)?.label ?? id;
}
