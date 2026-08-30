export const IMAGE_PRESETS = {
  SUBTLE: { algos: ['chanShift', 'pixelEcho'], intensity: 0.22 },
  DIGITAL: { algos: ['pixelSort', 'chanShift', 'scanline'], intensity: 0.58 },
  CHAOS: { algos: ['pixelSort', 'chanShift', 'dataMosh', 'scanline', 'bitFlip', 'stripeBurn'], intensity: 0.82 },
  MELT: { algos: ['waveWarp', 'dataMosh', 'pixelEcho', 'chanShift'], intensity: 0.68 },
  DREAMY: { algos: ['gaussianBlur', 'duotone', 'lensAberration'], intensity: 0.5 },
  PRINT: { algos: ['halftoneFilter', 'levels'], intensity: 0.6 },
  HAUNTED: { algos: ['anomalousSpasm', 'scanline', 'invertZones'], intensity: 0.55 },
  WATERCOLOR: { algos: ['watercolorBleed', 'inkWash'], intensity: 0.62 },
  RISO: { algos: ['risograph', 'mangaScreentone'], intensity: 0.65 },
  POLY: { algos: ['lowPoly', 'mandala'], intensity: 0.58 },
  TAPESTRY: { algos: ['crossStitch', 'wovenTapestry'], intensity: 0.55 },
  GLITCH2: { algos: ['databend', 'channelTear', 'staticBloom'], intensity: 0.7 },
  CRAFT: { algos: ['trueAscii', 'blueprint'], intensity: 0.6 },
  CYANO: { algos: ['cyanotype', 'duotoneGrade'], intensity: 0.55 },
};

export const TEXT_PRESETS = {
  MILD: { algos: ['homoglyph', 'scramble'], intensity: 0.25 },
  CORRUPT: { algos: ['charCorrupt', 'noiseInject', 'caseChaos'], intensity: 0.55 },
  CHAOS: { algos: ['zalgo', 'scramble', 'lineChaos', 'repeatBlocks', 'stutter'], intensity: 0.8 },
  CODE: { algos: ['charCorrupt', 'noiseInject', 'repeatBlocks', 'segReverse'], intensity: 0.45 },
  TYPESET: { algos: ['fontShuffle'], intensity: 0.5 },
};

export const AUDIO_PRESETS = {
  LOFI: { algos: ['bitCrush', 'sampleCrush'], intensity: 0.4 },
  GLITCH: { algos: ['stutter', 'dropout', 'chunkRepeat'], intensity: 0.6 },
  DESTROY: { algos: ['bitCrush', 'stutter', 'overdrive', 'feedback', 'noiseInject'], intensity: 0.85 },
  VIBE: { algos: ['tapeWobble', 'overdrive', 'feedback'], intensity: 0.45 },
  POLISH: { algos: ['warmLowpass', 'softCompress', 'gentleFade'], intensity: 0.5 },
};

export const V_CHANNELS = [
  { id: 'brightness', label: 'LUMA' },
  { id: 'r', label: 'RED' },
  { id: 'g', label: 'GREEN' },
  { id: 'b', label: 'BLUE' },
];

export const WEB_PRESETS = {
  'RETRO CRT': { algos: ['cssScanlines', 'cssRgbSplit'], intensity: 0.5 },
  'SIGNAL LOSS': { algos: ['cssGlitchSlice', 'cssDatamoshJump', 'cssNoiseStatic'], intensity: 0.6 },
  TRIPPY: { algos: ['cssHueCycle', 'cssRgbSplit'], intensity: 0.55 },
  HAUNTED: { algos: ['cssInvertPulse', 'cssVhsWobble', 'cssNoiseStatic'], intensity: 0.4 },
};
