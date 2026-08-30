// Real video file export using the browser-native MediaRecorder API — no new
// dependencies, keeps the "drag dist/ into Netlify" deploy story intact.
// Captures whatever is already drawn to the output canvas frame-by-frame
// (the same canvas the live glitch preview renders to), so effect quality
// during export matches what's on screen. Optionally muxes in a processed
// audio track so a single exported file carries both glitched video and
// glitched audio, recorded together via one combined MediaStream.

const CANDIDATE_MIME_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4', // Safari, when available
];

export function pickSupportedMimeType() {
  for (const type of CANDIDATE_MIME_TYPES) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

// Prepares a processed AudioBuffer to play through a MediaStreamDestination
// node — returns the resulting stream (to merge into the recorder) plus a
// start() to kick off playback in sync with the video.
export function prepareAudioTrack(audioCtx, processedBuffer) {
  const dest = audioCtx.createMediaStreamDestination();
  const source = audioCtx.createBufferSource();
  source.buffer = processedBuffer;
  source.connect(dest);
  return { stream: dest.stream, start: () => source.start(0) };
}

// Combines the canvas's video track with an optional audio stream's track
// into one recordable MediaStream. Pass audioStream=null for video-only.
export function createCombinedRecorder(canvas, audioStream, fps = 30) {
  const mimeType = pickSupportedMimeType();
  const videoTracks = canvas.captureStream(fps).getVideoTracks();
  const audioTracks = audioStream ? audioStream.getAudioTracks() : [];
  const combined = new MediaStream([...videoTracks, ...audioTracks]);
  const recorder = new MediaRecorder(combined, mimeType ? { mimeType } : undefined);
  const chunks = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  return {
    mimeType: mimeType || recorder.mimeType,
    start() { chunks.length = 0; recorder.start(100); },
    stopAndGetBlob() {
      return new Promise((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType || 'video/webm' }));
        recorder.stop();
      });
    },
  };
}

// Procedural export: records the output canvas itself for a fixed duration
// (no source video element). Uses the provided render loop to advance frames
// while MediaRecorder captures the canvas stream.
export function exportProceduralVideo(outputCanvas, renderFrameFn, durationMs = 5000, fps = 30, audioSetup) {
  return new Promise((resolve, reject) => {
    try {
      const recorder = createCombinedRecorder(outputCanvas, audioSetup?.stream ?? null, fps);
      const start = performance.now();
      const tick = () => {
        const elapsed = performance.now() - start;
        renderFrameFn(elapsed);
        if (elapsed < durationMs) requestAnimationFrame(tick);
        else {
          recorder.stopAndGetBlob().then(resolve).catch(reject);
        }
      };
      recorder.start();
      audioSetup?.start();
      requestAnimationFrame(tick);
    } catch (e) { reject(e); }
  });
}

// Orchestrates a full export pass: rewinds the source video, records the
// output canvas (and, if audioSetup is provided, the processed audio track
// alongside it in the same file) while it plays through the effect render
// loop, resolves with a downloadable Blob once playback ends.
// audioSetup: { stream, start } from prepareAudioTrack(), or omit for
// video-only export.
export function exportVideo(sourceVideoEl, outputCanvas, renderFrameFn, audioSetup) {
  return new Promise((resolve, reject) => {
    const recorder = createCombinedRecorder(outputCanvas, audioSetup?.stream ?? null);
    const onEnded = async () => {
      cleanup();
      resolve(await recorder.stopAndGetBlob());
    };
    const onFrame = () => {
      renderFrameFn();
      if (!sourceVideoEl.paused && !sourceVideoEl.ended) sourceVideoEl.requestVideoFrameCallback?.(onFrame) ?? requestAnimationFrame(onFrame);
    };
    const cleanup = () => {
      sourceVideoEl.removeEventListener('ended', onEnded);
      sourceVideoEl.removeEventListener('error', onError);
    };
    const onError = (e) => { cleanup(); reject(e); };

    sourceVideoEl.addEventListener('ended', onEnded);
    sourceVideoEl.addEventListener('error', onError);
    sourceVideoEl.currentTime = 0;
    recorder.start();
    audioSetup?.start();
    sourceVideoEl.play().then(onFrame).catch(onError);
  });
}
