import { useState, useMemo } from 'react';
import { prng } from '../core/rng.js';
import { getEffectsFor, applyEffectChain, randomEffectSelection } from '../effects/registry.js';
import { TEXT_PRESETS } from '../effects/presets.js';
import AlgoPanel from './AlgoPanel.jsx';
import PresetPanel from './PresetPanel.jsx';
import ShuffleButton from './ShuffleButton.jsx';
import ActiveChainList from './ActiveChainList.jsx';
import CopyRecipeButton from './CopyRecipeButton.jsx';
import { useCopyToClipboard } from './useCopyToClipboard.js';

const TEXT_EFFECTS = getEffectsFor('text');
const SAMPLE = 'Paste your own text, or start editing this sample to see how each effect distorts it.';

export default function TextTab({ seed, onReroll, initialRecipe }) {
  const [input, setInput] = useState(SAMPLE);
  const [algos, setAlgos] = useState(initialRecipe?.a ?? ['homoglyph', 'scramble']);
  const [intensity, setIntensity] = useState(initialRecipe?.i ?? 0.4);
  const [preset, setPreset] = useState(null);
  const [showAdv, setShowAdv] = useState(false);

  const output = useMemo(() => {
    const rng = prng(seed);
    return applyEffectChain(input, algos, { mediaType: 'text', intensity }, rng);
  }, [input, algos, intensity, seed]);

  const applyPreset = (k) => { const p = TEXT_PRESETS[k]; setAlgos(p.algos); setIntensity(p.intensity); setPreset(k); };
  const toggleAlgo = (id) => { setPreset(null); setAlgos((p) => (p.includes(id) ? p.filter((a) => a !== id) : [...p, id])); };

  const shuffle = () => {
    const rng = prng(Date.now() % 999999);
    setPreset(null);
    setAlgos(randomEffectSelection('text', rng));
    setIntensity(0.15 + rng() * 0.7);
  };

  const [copyOutput, outputCopied] = useCopyToClipboard();
  const seedStr = String(seed).padStart(6, '0');

  return (
    <>
      <aside className="sidebar">
        <span className="lbl">PRESETS</span>
        <PresetPanel presets={TEXT_PRESETS} active={preset} onSelect={applyPreset} />
        <button className="adv-toggle" onClick={() => setShowAdv((v) => !v)}>{showAdv ? '▼' : '▶'} EFFECTS ({TEXT_EFFECTS.length})</button>
        {showAdv && <div className="algo-scroll"><AlgoPanel effects={TEXT_EFFECTS} active={algos} onToggle={toggleAlgo} /></div>}
        <ActiveChainList algos={algos} mediaType="text" onReorder={setAlgos} onRemove={(id) => setAlgos((p) => p.filter((a) => a !== id))} />
        <div className="div" />
        <div className="sec">
          <span className="lbl">INTENSITY — {(intensity * 100).toFixed(0)}%</span>
          <input type="range" className="slider" min=".02" max="1" step=".01"
            value={intensity} onChange={(e) => { setPreset(null); setIntensity(parseFloat(e.target.value)); }} />
        </div>
        <div className="div" />
        <div className="seed-row"><span className="seed-lbl">SEED</span><span className="seed-val">#{seedStr}</span></div>
        <button className="reroll-btn" onClick={onReroll}>⟳  RE-ROLL SEED</button>
        <ShuffleButton onClick={shuffle} />
        <button className="act-btn" onClick={() => copyOutput(output)} style={{ marginTop: 4 }}>{outputCopied ? '✓ COPIED' : '⎘ COPY OUTPUT'}</button>
        <CopyRecipeButton getRecipe={() => ({ t: 'text', s: seed, a: algos, i: intensity })} />
      </aside>
      <main className="main" style={{ flexDirection: 'column' }}>
        <div className="text-areas">
          <div className="text-area-wrap">
            <span className="text-label">INPUT — paste text, code, writing, anything</span>
            <textarea className="text-input" value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Paste text, code, poetry, prose, source files…" spellCheck={false} />
          </div>
          <div className="text-area-wrap">
            <span className="text-label">OUTPUT — glitched · {output.length} chars</span>
            <div className="text-output">{output || 'gleetch output appears here…'}</div>
          </div>
        </div>
      </main>
    </>
  );
}
