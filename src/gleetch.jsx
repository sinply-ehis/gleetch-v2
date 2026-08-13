import { useState, useEffect, useCallback, useRef } from 'react';
import { randomSeed } from './core/constants.js';
import { loadImageFile } from './core/canvas-utils.js';
import { getRecipeFromURL, clearRecipeFromURL } from './core/recipe.js';
import VisualTab from './components/VisualTab.jsx';
import TextTab from './components/TextTab.jsx';
import AudioTab from './components/AudioTab.jsx';
import VideoTab from './components/VideoTab.jsx';
import WebTab from './components/WebTab.jsx';
import SidebarResizer from './components/SidebarResizer.jsx';
import HelpPanel from './components/HelpPanel.jsx';

const TABS = [
  ['visual', '⬛ VISUAL'],
  ['text', '✦ TEXT'],
  ['audio', '◎ AUDIO'],
  ['video', '▶ VIDEO'],
  ['web', '◈ WEB'],
];

export default function App() {
  const [incomingRecipe] = useState(() => getRecipeFromURL());
  const [tab, setTab] = useState(incomingRecipe?.t ?? 'visual');
  const [seed, setSeed] = useState(incomingRecipe?.s ?? randomSeed());
  const [iter, setIter] = useState(0);
  const [burst, setBurst] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Visual-tab upload state lives here (not inside VisualTab) so the global
  // clipboard-paste handler below can drop an image in regardless of which
  // tab is currently focused, then jump to the visual tab.
  const [vMode, setVMode] = useState('generate');
  const [uploadedImg, setUploadedImg] = useState(null);

  const reroll = useCallback(() => {
    setBurst(true);
    setTimeout(() => setBurst(false), 500);
    setSeed(randomSeed());
    setIter((i) => i + 1);
  }, []);

  const rerollRef = useRef(reroll);
  useEffect(() => { rerollRef.current = reroll; }, [reroll]);

  useEffect(() => {
    const onPaste = async (e) => {
      for (const item of e.clipboardData.items) {
        if (item.type.startsWith('image/')) {
          const img = await loadImageFile(item.getAsFile());
          setUploadedImg(img);
          setVMode('upload');
          setTab('visual');
        }
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  useEffect(() => {
    if (incomingRecipe) clearRecipeFromURL();
  }, [incomingRecipe]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); rerollRef.current?.(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="root">
      <header className="header">
        <div>
          <div className={`logo ${burst ? 'burst' : ''}`}>GLEETCH</div>
          <div className="tagline">a general special-effects library · images · text · audio · video · css · 120 patterns · 65+ effects</div>
        </div>
        <div className="tabs">
          {TABS.map(([id, label]) => (
            <button key={id} className={`tab-btn ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        <button className="help-btn" onClick={() => setShowHelp(true)} aria-label="Help">?</button>
      </header>

      {showHelp && <HelpPanel initialSection={tab} onClose={() => setShowHelp(false)} />}

      <div className="body">
        <SidebarResizer />
        {tab === 'visual' && (
          <VisualTab seed={seed} iter={iter} onReroll={reroll} mode={vMode} setMode={setVMode} uploadedImg={uploadedImg} setUploadedImg={setUploadedImg} initialRecipe={incomingRecipe?.t === 'visual' ? incomingRecipe : null} />
        )}
        {tab === 'text' && <TextTab seed={seed} onReroll={reroll} initialRecipe={incomingRecipe?.t === 'text' ? incomingRecipe : null} />}
        {tab === 'audio' && <AudioTab seed={seed} onReroll={reroll} initialRecipe={incomingRecipe?.t === 'audio' ? incomingRecipe : null} />}
        {tab === 'video' && <VideoTab seed={seed} onReroll={reroll} initialRecipe={incomingRecipe?.t === 'video' ? incomingRecipe : null} />}
        {tab === 'web' && <WebTab seed={seed} onReroll={reroll} initialRecipe={incomingRecipe?.t === 'web' ? incomingRecipe : null} />}
      </div>
    </div>
  );
}
