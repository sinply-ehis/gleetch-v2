import { useState, useEffect, useRef } from 'react';

const NOISE = '!@#$%^&*<>{}[]?01lI';
const STEP_MS = 45;
const HOLD_STEPS = 12; // ~540ms holding the fully-revealed text before re-scrambling

// Sweeps left-to-right, resolving scrambled noise characters into the real
// text, holds briefly once fully revealed, then loops while `active` stays
// true. Falls back to plain text when inactive — this is a decode effect,
// not a permanent decoration, so it turns off cleanly when nothing's busy.
export default function ScrambleText({ text, active = true }) {
  const [display, setDisplay] = useState(text);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined; // nothing to animate; render() falls back to `text` directly
    const chars = text.split('');
    let revealed = 0;
    let holdFrames = 0;
    let lastStep = performance.now();

    const tick = (now) => {
      if (now - lastStep >= STEP_MS) {
        lastStep = now;
        if (revealed >= chars.length) {
          holdFrames++;
          if (holdFrames > HOLD_STEPS) { revealed = 0; holdFrames = 0; }
        } else {
          revealed++;
        }
        setDisplay(chars.map((c, i) => {
          if (c === ' ') return ' ';
          return i < revealed ? c : NOISE[Math.floor(Math.random() * NOISE.length)];
        }).join(''));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [text, active]);

  return <>{active ? display : text}</>;
}
