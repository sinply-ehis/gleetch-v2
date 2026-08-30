// Every tab's output is already fully determined by {seed, algos,
// intensity, channel?, format?} — this just makes that state shareable as a
// compact string instead of trapped in the UI. Uses URL-safe base64 of a
// terse JSON shape (short keys: t=tab, s=seed, a=algos, i=intensity,
// c=channel, f=format {id,w,h,fit}) rather than a custom binary format — simpler to reason about
// and debug, and the size difference doesn't matter at this scale (a
// handful of effect ids and two numbers).

export function encodeRecipe(recipe) {
  const json = JSON.stringify(recipe);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeRecipe(str) {
  try {
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = decodeURIComponent(escape(atob(padded)));
    const recipe = JSON.parse(json);
    if (!recipe || typeof recipe !== 'object' || !recipe.t || typeof recipe.s !== 'number' || !Array.isArray(recipe.a)) return null;
    return recipe;
  } catch {
    return null;
  }
}

export function getRecipeFromURL() {
  if (typeof window === 'undefined') return null;
  const param = new URLSearchParams(window.location.search).get('recipe');
  return param ? decodeRecipe(param) : null;
}

export function buildRecipeURL(recipe) {
  const encoded = encodeRecipe(recipe);
  const url = new URL(window.location.href);
  url.search = `?recipe=${encoded}`;
  return url.toString();
}

// Strips the ?recipe= param from the visible URL after it's been applied,
// so reloading or sharing the page again doesn't re-apply a stale recipe.
export function clearRecipeFromURL() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.search = '';
  window.history.replaceState(null, '', url.toString());
}
