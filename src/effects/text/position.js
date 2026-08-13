// Upside-down character table verified against xahlee.info/comp/unicode_invert_text.html
// (actively maintained reference for this specific Unicode text trick).
// Built as a key->value lookup object rather than an indexed string, so
// unlike a positional-index approach this is safe regardless of whether any
// mapped glyph happens to be outside the BMP — object property lookup
// doesn't slice surrogate pairs the way string indexing does.
const UPSIDE_DOWN_LOWER = { a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ᵷ', h: 'ɥ', i: 'ᴉ', j: 'f', k: 'ʞ', l: 'ꞁ', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ', s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z' };
const UPSIDE_DOWN_UPPER = { A: 'Ɐ', B: 'B', C: 'Ɔ', D: 'D', E: 'Ǝ', F: 'Ⅎ', G: '⅁', H: 'H', I: 'I', J: 'ſ', K: 'Ʞ', L: 'Ꞁ', M: 'Ɯ', N: 'N', O: 'O', P: 'Ԁ', Q: 'Ò', R: 'ᴚ', S: 'S', T: 'Ʇ', U: '∩', V: 'Ʌ', W: 'ʍ', X: 'X', Y: '⅄', Z: 'Z' };
const UPSIDE_DOWN_DIGITS = { 0: '0', 1: '1', 6: '9', 8: '8', 9: '6' };

// Reuses the same verified Mathematical Italic glyphs as FONT SHUFFLE.
const ITALIC_UPPER = Array.from('𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍');
const ITALIC_LOWER = Array.from('𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧');

// Combining marks that sit below the baseline — the same characters already
// proven safe by the existing ZALGO effect, applied sparingly here for a
// "drooping / hanging / sleeping" sag rather than zalgo's dense chaos.
const DROOP_MARKS = ['\u0330', '\u0332', '\u0333', '\u0331'];

function flipChar(c) {
  return UPSIDE_DOWN_LOWER[c] || UPSIDE_DOWN_UPPER[c] || UPSIDE_DOWN_DIGITS[c] || c;
}

function upsideDownWord(word) {
  return word.split('').reverse().map(flipChar).join('');
}

function mirrorWord(word) {
  return word.split('').reverse().join('');
}

function slantWord(word) {
  return word.split('').map((c) => {
    const code = c.charCodeAt(0);
    if (code >= 65 && code <= 90) return ITALIC_UPPER[code - 65];
    if (code >= 97 && code <= 122) return ITALIC_LOWER[code - 97];
    return c;
  }).join('');
}

function droopWord(word, rng) {
  return word.split('').map((c) => (rng() < 0.6 ? c + DROOP_MARKS[Math.floor(rng() * DROOP_MARKS.length)] : c)).join('');
}

// POSITION DISTORTION — per word, randomly picks one of four position/form
// transforms: flipped upside-down (and reversed, so it reads correctly if
// physically rotated), mirrored (reversed reading order), slanted (italic),
// or drooping (sagging below the baseline). intensity controls what
// fraction of words get any distortion at all.
export function positionDistortion(text, intensity, rng) {
  const modes = [upsideDownWord, mirrorWord, slantWord, (w) => droopWord(w, rng)];
  return text.split(/(\s+)/).map((token) => {
    if (!token || /^\s+$/.test(token)) return token;
    if (rng() >= intensity) return token;
    const mode = modes[Math.floor(rng() * modes.length)];
    return mode(token);
  }).join('');
}

export const POSITION_TEXT_EFFECTS = [
  { id: 'positionDistortion', label: 'POSITION DISTORTION', hint: 'flip, mirror, slant, or droop per word', category: 'typography', mediaTypes: ['text'], fn: positionDistortion },
];
