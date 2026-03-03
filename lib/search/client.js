import { SEARCH_SYNONYMS } from './synonyms.js';

export function normalizeSearchText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTokenList(tokens) {
  return Array.from(new Set(
    tokens.map((token) => normalizeSearchText(token)).filter(Boolean)
  ));
}

function expandTokenWithSynonyms(token) {
  const synonyms = SEARCH_SYNONYMS[token] || [];
  return normalizeTokenList([token, ...synonyms]);
}

export function buildSearchTokens(query) {
  const rawTerms = String(query || '').trim().split(/\s+/).filter(Boolean);
  const normalizedWhole = normalizeSearchText(query);
  if (!normalizedWhole) return [];

  const baseTokens = [...rawTerms];
  if (normalizedWhole.includes(' ')) {
    baseTokens.push(normalizedWhole);
  }

  const expanded = baseTokens.flatMap((token) => expandTokenWithSynonyms(token));
  return normalizeTokenList(expanded);
}

export function includesToken(value, token) {
  if (value.includes(token)) return true;
  const compactValue = value.replace(/\s+/g, '');
  const compactToken = token.replace(/\s+/g, '');
  return compactToken.length > 0 && compactValue.includes(compactToken);
}

export function scoreSearchItem(item, tokens) {
  if (!item || tokens.length === 0) return 0;

  const title = normalizeSearchText(item.title);
  const summary = normalizeSearchText(item.summary);
  const tags = normalizeSearchText(Array.isArray(item.tags) ? item.tags.join(' ') : '');
  const categories = normalizeSearchText(Array.isArray(item.categories) ? item.categories.join(' ') : '');

  let score = 0;
  for (const token of normalizeTokenList(tokens)) {
    if (includesToken(title, token)) score += 3;
    if (includesToken(summary, token)) score += 2;
    if (includesToken(tags, token)) score += 2;
    if (includesToken(categories, token)) score += 2;
  }

  return score;
}

export function searchPosts(items, query) {
  const tokens = buildSearchTokens(query);
  if (tokens.length === 0) return [];

  return items
    .map((item) => ({ ...item, score: scoreSearchItem(item, tokens) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });
}
