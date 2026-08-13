// Distinct from the RE-ROLL button (which only changes the seed): SHUFFLE
// randomizes which effects are active and their intensity, giving a fresh
// combination rather than the same chain with new noise.
export default function ShuffleButton({ onClick, disabled = false, label = 'SHUFFLE EFFECTS' }) {
  return (
    <button className="shuffle-btn" onClick={onClick} disabled={disabled}>
      🎲 {label}
    </button>
  );
}
