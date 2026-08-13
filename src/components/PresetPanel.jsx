export default function PresetPanel({ presets, active, onSelect }) {
  return (
    <div className="preset-row">
      {Object.keys(presets).map((k) => (
        <button key={k} className={`preset-btn ${active === k ? 'on' : ''}`} onClick={() => onSelect(k)}>
          {k}
        </button>
      ))}
    </div>
  );
}
