import { useState, useEffect } from 'react';

// Kept as plain data separate from the component below so the actual
// wording can be edited without touching any logic — same split the rest
// of this file follows (WEB_PRESETS, etc. live in effects/presets.js, not
// inline in their component).
const HELP_CONTENT = {
  visual: {
    label: '⬛ VISUAL',
    items: [
      'GENERATE mode needs no upload — every re-roll draws from 120 hidden patterns.',
      'UPLOAD mode uses your own image. Paste (Ctrl/Cmd+V) works from anywhere in the app, not just this tab.',
      'Pick one or more effects under EFFECTS — picking more than one chains them, applied in order. Drag entries in ACTIVE to reorder the chain.',
      'A few effects show their own extra controls (a color swatch, a slider) right under their entry in ACTIVE once you turn them on — everything else just uses INTENSITY.',
      'INTENSITY (0–100%) controls how strongly the whole chain applies.',
      'Presets are just a saved effects + intensity starting point — pick one, then keep tweaking.',
      'Export downloads the processed image, or copy the recipe (seed + effects + intensity) to share the exact same result with someone else.',
    ],
  },
  text: {
    label: '✦ TEXT',
    items: [
      'Paste in code, prose, or any text.',
      'Some effects visually corrupt the text, others are typographic (spacing, case, unicode tricks) — same EFFECTS/chain/INTENSITY pattern as VISUAL.',
      'Export copies the transformed text, or copy the recipe to reproduce it later.',
    ],
  },
  audio: {
    label: '◎ AUDIO',
    items: [
      'Upload mp3, wav, ogg, flac, or m4a.',
      'Effects process the actual audio signal, not just a visual on the waveform.',
      'GRANULAR SCATTER shows its own extra controls (grain size, scatter amount, reverse chance) under its entry in ACTIVE once turned on.',
      'Export always produces a WAV file, regardless of what you uploaded.',
    ],
  },
  video: {
    label: '▶ VIDEO',
    items: [
      'Upload mp4, webm, or mov.',
      'Live preview applies effects in real time as the video plays.',
      'A few effects (OIL PAINT, OVERLAY, VORONOI, CRYSTALLIZE, PARTICLE DISSOLVE) are too slow to run continuously — they only apply via FULL QUALITY FRAME, a single still capture, not the live preview or the exported video.',
      'The audio track is processed independently from the video effects.',
      'Export produces a real video file, not a recording of the live preview.',
    ],
  },
  web: {
    label: '◈ WEB',
    items: [
      'This generates real CSS — the effect you see in the preview is the literal CSS you export, not a canvas trick.',
      'A few effects show their own extra controls (a color swatch, a slider) right under their entry in ACTIVE once turned on — everything else just uses INTENSITY.',
      'IMPORT YOUR CSS restyles the demo card itself, so you can preview your own look with the glitch layered on top. Target .gleetch-demo (the card), .gleetch-demo-heading (the h2), or .gleetch-demo-btn (the button).',
      'Four ways to use the output — pick based on what you\u2019re doing:',
      '  \u2022 CSS FILE / <style> SNIPPET — for a site you own: include normally, add class="gleetch-fx" to whatever should be affected.',
      '  \u2022 DEV CONSOLE — for a site you don\u2019t own: open DevTools on any page (F12, or right-click \u2192 Inspect \u2192 Console), paste, hit enter. It prints the exact command to undo it.',
      '  \u2022 BOOKMARKLET — same idea as DEV CONSOLE, older method, works if your browser still supports adding one.',
      'Export only ever contains the effect CSS — it never touches your site\u2019s own colors, text, or layout beyond what the effect itself changes.',
    ],
  },
};

const SECTION_ORDER = ['visual', 'text', 'audio', 'video', 'web'];

export default function HelpPanel({ initialSection, onClose }) {
  const [section, setSection] = useState(SECTION_ORDER.includes(initialSection) ? initialSection : 'visual');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const active = HELP_CONTENT[section];

  return (
    <div className="help-backdrop" onClick={onClose}>
      <div className="help-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Gleetch help">
        <div className="help-header">
          <span className="help-title">HELP</span>
          <button className="help-close" onClick={onClose} aria-label="Close help">{'\u2715'}</button>
        </div>
        <div className="help-nav">
          {SECTION_ORDER.map((key) => (
            <button key={key} className={`tab-btn ${section === key ? 'on' : ''}`} onClick={() => setSection(key)}>{HELP_CONTENT[key].label}</button>
          ))}
        </div>
        <div className="help-body">
          <ul className="help-list">
            {active.items.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
