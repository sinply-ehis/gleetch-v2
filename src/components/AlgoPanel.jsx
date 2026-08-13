import { prng, seedFromString } from '../core/rng.js';
import { fontShuffle } from '../effects/text/typography.js';

// TYPOGRAPHY category buttons preview themselves: the button's own label is
// run through the real FONT SHUFFLE effect, seeded from the label text so
// it's stable across renders rather than reflowing randomly every paint.
function displayLabel(effect) {
  if (effect.category !== 'typography') return effect.label;
  return fontShuffle(effect.label, 0.8, prng(seedFromString(effect.label)));
}

// Renders one toggle button per effect, grouped under a category label.
// Each category gets its own CSS hover treatment (see index.css: .cat-*
// rules) so the button chrome hints at what kind of effect it is —
// corruption flickers, clean-tone stays crisp, distortion skews, etc.
export default function AlgoPanel({ effects, active, onToggle, showHints = true }) {
  const categories = [];
  const byCategory = {};
  for (const e of effects) {
    if (!byCategory[e.category]) { byCategory[e.category] = []; categories.push(e.category); }
    byCategory[e.category].push(e);
  }

  return (
    <>
      {categories.map((cat) => (
        <div key={cat}>
          <div className="algo-cat-lbl">{cat.replace('-', ' ')}</div>
          {byCategory[cat].map((a) => (
            <button
              key={a.id}
              className={`algo-btn cat-${a.category} ${active.includes(a.id) ? 'on' : ''}`}
              onClick={() => onToggle(a.id)}
            >
              <span className="adot" />{displayLabel(a)}
              {showHints && <span className="ahint">{a.hint}</span>}
            </button>
          ))}
        </div>
      ))}
    </>
  );
}
