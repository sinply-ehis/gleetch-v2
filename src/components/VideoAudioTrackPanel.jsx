import AlgoPanel from './AlgoPanel.jsx';

// Collapsible audio-track section shown in VideoTab's sidebar once a video
// with a decodable audio track is loaded. Extracted into its own file
// purely to keep VideoTab.jsx under the file-size cap — this is pure
// presentation, all state/logic lives in useVideoAudioTrack.
export default function VideoAudioTrackPanel({ audioTrack, effects, show, onToggleShow, onToggleAlgo }) {
  return (
    <>
      <button className="adv-toggle" onClick={onToggleShow}>
        {show ? '▼' : '▶'} AUDIO TRACK {audioTrack.decoding ? '(decoding…)' : audioTrack.hasAudio ? `(${effects.length})` : '(none found)'}
      </button>
      {show && audioTrack.hasAudio && (
        <>
          <div className="algo-scroll"><AlgoPanel effects={effects} active={audioTrack.audioAlgos} onToggle={onToggleAlgo} /></div>
          <div className="sec">
            <span className="lbl">AUDIO INTENSITY — {(audioTrack.audioIntensity * 100).toFixed(0)}%</span>
            <input type="range" className="slider" min=".05" max="1" step=".01" value={audioTrack.audioIntensity}
              onChange={(e) => audioTrack.setAudioIntensity(parseFloat(e.target.value))} />
          </div>
        </>
      )}
      {show && !audioTrack.hasAudio && !audioTrack.decoding && (
        <div className="audio-info">no decodable audio track — video-only export still works</div>
      )}
      <div className="div" />
    </>
  );
}
