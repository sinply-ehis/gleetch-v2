import { prng } from '../../core/rng.js';
import { applyEffectChain } from '../registry.js';

// Runs every channel of an AudioBuffer through the given effect chain,
// returning a new AudioBuffer of the same shape. Each channel gets its own
// rng stream (offset by channel index) so stereo channels don't glitch in
// lockstep — that would sound mono/collapsed on anything with real width.
export function processAudioBuffer(audioCtx, audioBuffer, algos, intensity, seed, effectParams = {}) {
  const nc = audioBuffer.numberOfChannels, sr = audioBuffer.sampleRate, len = audioBuffer.length;
  const out = audioCtx.createBuffer(nc, len, sr);
  for (let c = 0; c < nc; c++) {
    const raw = audioBuffer.getChannelData(c);
    const rng = prng(seed + c * 100);
    const processed = applyEffectChain(raw, algos, { mediaType: 'audio', sampleRate: sr, intensity }, rng, effectParams);
    out.copyToChannel(processed, c);
  }
  return out;
}
