const GENERIC_SUFFIX_WORDS = new Set([
  'and',
  'co',
  'company',
  'corp',
  'corporation',
  'developer',
  'developers',
  'development',
  'estate',
  'estates',
  'group',
  'homes',
  'housing',
  'india',
  'infra',
  'infrastructure',
  'limited',
  'llp',
  'ltd',
  'pvt',
  'private',
  'properties',
  'property',
  'real',
  'realtors',
  'realty',
]);

export function normaliseName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(m\/s|mrs?|ms|shri|smt|thiru|thirumathi)\.?\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildNameVariants(value) {
  const normalised = normaliseName(value);
  if (!normalised) return [];

  const variants = [normalised];
  let tokens = normalised.split(' ').filter(Boolean);

  while (tokens.length > 1 && GENERIC_SUFFIX_WORDS.has(tokens.at(-1))) {
    tokens = tokens.slice(0, -1);
    variants.push(tokens.join(' '));
  }

  if (tokens.length > 1) {
    variants.push(tokens.slice(0, 2).join(' '));
  }

  if (tokens[0] && tokens[0].length >= 3 && !GENERIC_SUFFIX_WORDS.has(tokens[0])) {
    variants.push(tokens[0]);
  }

  return [...new Set(variants.filter(v => v && v.length >= 3))];
}

export function textMatchesName(text, query) {
  const haystack = normaliseName(text);
  if (!haystack) return false;
  return buildNameVariants(query).some(variant => haystack.includes(variant));
}
