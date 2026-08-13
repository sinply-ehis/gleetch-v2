import { buildRecipeURL } from '../core/recipe.js';
import { useCopyToClipboard } from './useCopyToClipboard.js';

// Any tab can drop this in with a `getRecipe` function that returns its
// current {t, s, a, i, c?} shape — kept generic rather than tab-specific
// since every tab's state already has this exact shape.
export default function CopyRecipeButton({ getRecipe }) {
  const [copy, copied] = useCopyToClipboard();
  return (
    <button className="act-btn" onClick={() => copy(buildRecipeURL(getRecipe()))}>
      {copied ? '✓ COPIED' : '⎘ COPY RECIPE LINK'}
    </button>
  );
}
