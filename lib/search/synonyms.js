const RAW_SYNONYMS = {
  nextjs: ['next.js', 'next js'],
  'next.js': ['nextjs', 'next js'],
  s3: ['aws s3'],
  'aws s3': ['s3']
};

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const SEARCH_SYNONYMS = Object.entries(RAW_SYNONYMS).reduce((acc, [key, values]) => {
  const normalizedKey = normalize(key);
  if (!normalizedKey) return acc;

  const normalizedValues = Array.from(new Set(
    (Array.isArray(values) ? values : [values])
      .map((value) => normalize(value))
      .filter(Boolean)
  ));

  if (normalizedValues.length > 0) {
    acc[normalizedKey] = normalizedValues;
  }

  return acc;
}, {});

