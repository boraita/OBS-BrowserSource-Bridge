/**
 * Accent- and case-insensitive text helpers shared by the Bible search:
 * "genesis" has to find "Génesis", and "senor" has to find "Señor".
 */

export function removeAccents(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function normalizeForSearch(str) {
  return str == null ? '' : removeAccents(String(str)).toLowerCase();
}

const ACCENT_VARIANTS = {
  a: 'aáàäâã',
  e: 'eéèëê',
  i: 'iíìïî',
  o: 'oóòöôõ',
  u: 'uúùüû',
  n: 'nñ',
  c: 'cç',
};

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Regex source matching `term` regardless of accents, e.g. "senor" →
 * "s[eéèëê][nñ][oóòöôõ]r". Use with the "i" flag for case-insensitivity.
 */
export function accentInsensitivePattern(term) {
  return Array.from(normalizeForSearch(term))
    .map((char) => (ACCENT_VARIANTS[char] ? `[${ACCENT_VARIANTS[char]}]` : escapeRegExp(char)))
    .join('');
}
