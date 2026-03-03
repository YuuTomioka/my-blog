import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { renderMarkdown } from '../lib/markdown/render.js';

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const INDEX_DIR = path.join(ROOT, 'content', 'index');
const PUBLIC_INDEX_DIR = path.join(ROOT, 'public', 'index');
const REPORTS_DIR = path.join(ROOT, 'content', 'reports');
const EXPORT_STATE_PATH = path.join(ROOT, 'content', '.export-state.json');

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STRICT_FAIL_CODES = new Set(['SUMMARY_MISSING', 'IMAGE_PATH_NON_STANDARD']);
const SEARCH_INDEX_WARN_THRESHOLD_BYTES = 262144;

function parseArgs(argv) {
  return {
    strict: argv.includes('--strict')
  };
}

function isValidDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function normalizeStringArray(input, { sort = false } = {}) {
  const arr = Array.isArray(input) ? input : [input];
  const seen = new Set();
  const out = [];

  for (const item of arr) {
    if (typeof item !== 'string') continue;
    const normalized = item.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }

  if (sort) out.sort((a, b) => a.localeCompare(b));
  return out;
}

function normalizeSearchText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[!"#$%&'()*+,.:;<=>?@[\\\]^`{|}~]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePostFrontmatter(frontmatter, filePath) {
  if (!frontmatter || typeof frontmatter !== 'object') {
    throw new Error(`Invalid frontmatter in ${filePath}`);
  }

  const title = typeof frontmatter.title === 'string' ? frontmatter.title.trim() : '';
  const slug = typeof frontmatter.slug === 'string' ? frontmatter.slug.trim() : '';
  const status = frontmatter.status;

  if (!title) throw new Error(`Missing required frontmatter field "title" in ${filePath}`);
  if (!slug) throw new Error(`Missing required frontmatter field "slug" in ${filePath}`);
  if (!SLUG_PATTERN.test(slug)) throw new Error(`Invalid slug format "${slug}" in ${filePath}`);
  if (status !== 'published') throw new Error(`Invalid status "${status}" in ${filePath}`);

  let createdAt;
  if (typeof frontmatter.created_at === 'string' && frontmatter.created_at.trim()) {
    createdAt = frontmatter.created_at.trim();
  } else if (typeof frontmatter.date === 'string' && frontmatter.date.trim()) {
    createdAt = frontmatter.date.trim();
    console.warn(`[build-index] warning: legacy "date" detected and converted in ${filePath}`);
  } else {
    throw new Error(`Missing required frontmatter field "created_at" (or legacy "date") in ${filePath}`);
  }

  if (!isValidDateString(createdAt)) {
    throw new Error(`Invalid created_at in ${filePath}: ${createdAt}`);
  }

  let updatedAt = null;
  if (frontmatter.updated_at !== undefined && frontmatter.updated_at !== null && frontmatter.updated_at !== '') {
    if (typeof frontmatter.updated_at !== 'string') {
      throw new Error(`Invalid updated_at type in ${filePath}`);
    }
    updatedAt = frontmatter.updated_at.trim();
    if (!isValidDateString(updatedAt)) {
      throw new Error(`Invalid updated_at in ${filePath}: ${updatedAt}`);
    }
  }

  const tags = normalizeStringArray(frontmatter.tags, { sort: true });
  const categories = normalizeStringArray(frontmatter.categories);
  if (tags.length === 0) throw new Error(`"tags" must be a non-empty array in ${filePath}`);
  if (categories.length === 0) throw new Error(`"categories" must be a non-empty array or string in ${filePath}`);

  const summary = typeof frontmatter.summary === 'string' ? frontmatter.summary.trim() : '';
  if (!summary) {
    console.warn(`[build-index] warning: summary is empty in ${filePath}`);
  }

  const cover = typeof frontmatter.cover === 'string' && frontmatter.cover.trim()
    ? frontmatter.cover.trim()
    : '';

  return {
    slug,
    title,
    created_at: createdAt,
    updated_at: updatedAt,
    summary,
    tags,
    categories,
    cover,
    raw_tags: frontmatter.tags,
    raw_categories: frontmatter.categories
  };
}

function listMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => path.join(dir, name));
}

function pushWarning(warnings, warning) {
  warnings.push({
    level: 'warn',
    ...warning
  });
}

function collectNormalizationWarnings(warnings, post) {
  const inspect = (rawValue, type) => {
    const arr = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const raw of arr) {
      if (typeof raw !== 'string') continue;
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const normalized = trimmed.toLowerCase();
      if (trimmed !== normalized) {
        pushWarning(warnings, {
          code: type === 'tag' ? 'TAG_STYLE_INCONSISTENT' : 'CATEGORY_STYLE_INCONSISTENT',
          slug: post.slug,
          message: `${type} value "${trimmed}" should be normalized to "${normalized}"`
        });
      }
    }
  };

  inspect(post.raw_tags, 'tag');
  inspect(post.raw_categories, 'category');
}

function buildSearchIndex(posts) {
  return posts.map((post) => {
    const searchText = normalizeSearchText([
      post.title,
      post.summary,
      post.tags.join(' '),
      post.categories.join(' ')
    ].join(' '));

    return {
      slug: post.slug,
      title: post.title,
      created_at: post.created_at,
      updated_at: post.updated_at,
      summary: post.summary,
      tags: post.tags,
      categories: post.categories,
      search_text: searchText
    };
  });
}

function loadExportStatePendingDeletes() {
  if (!fs.existsSync(EXPORT_STATE_PATH)) {
    return { posts: [], assets: [] };
  }

  try {
    const state = JSON.parse(fs.readFileSync(EXPORT_STATE_PATH, 'utf8'));
    return {
      posts: Array.isArray(state?.pending_deletes?.posts) ? state.pending_deletes.posts : [],
      assets: Array.isArray(state?.pending_deletes?.assets) ? state.pending_deletes.assets : []
    };
  } catch {
    return { posts: [], assets: [] };
  }
}

function writeQualityReports(warnings, totals, options = {}) {
  const strictEnabled = Boolean(options.strict);
  const searchIndexStats = options.searchIndexStats || {
    bytes: 0,
    records: 0,
    warn_threshold_bytes: SEARCH_INDEX_WARN_THRESHOLD_BYTES
  };
  const strictFailCodes = warnings
    .map((warning) => warning.code)
    .filter((code) => STRICT_FAIL_CODES.has(code));
  const strictFailed = strictEnabled && strictFailCodes.length > 0;

  fs.mkdirSync(REPORTS_DIR, { recursive: true });

  const byCode = {};
  for (const warning of warnings) {
    byCode[warning.code] = (byCode[warning.code] || 0) + 1;
  }

  const qualityJson = {
    generated_at: new Date().toISOString(),
    totals,
    summary: {
      warning_count: warnings.length,
      by_code: byCode
    },
    strict: {
      enabled: strictEnabled,
      failed: strictFailed,
      fail_codes: Array.from(new Set(strictFailCodes))
    },
    search_index: searchIndexStats,
    warnings
  };

  fs.writeFileSync(path.join(REPORTS_DIR, 'quality.json'), `${JSON.stringify(qualityJson, null, 2)}\n`);

  const lines = [];
  lines.push('# Quality Report');
  lines.push('');
  lines.push(`- Generated at: ${qualityJson.generated_at}`);
  lines.push(`- Posts scanned: ${totals.posts}`);
  lines.push(`- Warnings: ${warnings.length}`);
  lines.push(`- Strict: ${strictEnabled ? (strictFailed ? 'FAILED' : 'PASSED') : 'disabled'}`);
  lines.push(`- Search index bytes: ${searchIndexStats.bytes}`);
  lines.push(`- Search index records: ${searchIndexStats.records}`);
  lines.push(`- Search index warn threshold bytes: ${searchIndexStats.warn_threshold_bytes}`);
  lines.push('');
  lines.push('## Warning counts');
  lines.push('');

  if (Object.keys(byCode).length === 0) {
    lines.push('- (none)');
  } else {
    for (const [code, count] of Object.entries(byCode).sort((a, b) => b[1] - a[1])) {
      lines.push(`- ${code}: ${count}`);
    }
  }

  lines.push('');
  lines.push('## Warning details');
  lines.push('');

  if (warnings.length === 0) {
    lines.push('- (none)');
  } else {
    warnings.forEach((warning, idx) => {
      lines.push(`${idx + 1}. [${warning.code}] ${warning.message}`);
      if (warning.slug) lines.push(`   - slug: ${warning.slug}`);
      if (warning.source_path) lines.push(`   - source_path: ${warning.source_path}`);
      if (warning.asset_path) lines.push(`   - asset_path: ${warning.asset_path}`);
    });
  }

  fs.writeFileSync(path.join(REPORTS_DIR, 'quality.md'), `${lines.join('\n')}\n`);

  return {
    strictEnabled,
    strictFailed,
    strictFailCodes: Array.from(new Set(strictFailCodes))
  };
}

async function buildIndex(options = {}) {
  const files = listMarkdownFiles(POSTS_DIR);
  const posts = [];
  const tagsMap = {};
  const categoriesMap = {};
  const warnings = [];
  const seenSlugs = new Set();

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = matter(raw);
    const post = normalizePostFrontmatter(parsed.data, filePath);

    if (seenSlugs.has(post.slug)) {
      throw new Error(`Duplicate slug "${post.slug}" in ${filePath}`);
    }
    seenSlugs.add(post.slug);

    posts.push({ ...post, content: parsed.content });

    for (const tag of post.tags) {
      if (!tagsMap[tag]) tagsMap[tag] = [];
      tagsMap[tag].push(post.slug);
    }

    for (const categoryPath of post.categories) {
      if (!categoriesMap[categoryPath]) categoriesMap[categoryPath] = [];
      categoriesMap[categoryPath].push(post.slug);
    }

    if (!post.summary) {
      pushWarning(warnings, {
        code: 'SUMMARY_MISSING',
        slug: post.slug,
        message: 'summary is empty'
      });
    } else if (post.summary.length < 20) {
      pushWarning(warnings, {
        code: 'SUMMARY_TOO_SHORT',
        slug: post.slug,
        message: `summary is too short (${post.summary.length} chars)`
      });
    }

    if (!post.cover) {
      pushWarning(warnings, {
        code: 'COVER_MISSING',
        slug: post.slug,
        message: 'cover is not set'
      });
    }

    collectNormalizationWarnings(warnings, post);

    const rendered = await renderMarkdown(parsed.content, { postSlug: post.slug });
    for (const warning of rendered.warnings) {
      if (warning?.code === 'IMAGE_PATH_NON_STANDARD') {
        pushWarning(warnings, {
          code: 'IMAGE_PATH_NON_STANDARD',
          slug: post.slug,
          message: warning.message
        });
      }
    }
  }

  posts.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

  const postsIndex = posts.map((post) => ({
    slug: post.slug,
    title: post.title,
    created_at: post.created_at,
    updated_at: post.updated_at,
    summary: post.summary,
    tags: post.tags,
    categories: post.categories
  }));

  const searchIndex = buildSearchIndex(posts);

  fs.mkdirSync(INDEX_DIR, { recursive: true });
  fs.writeFileSync(path.join(INDEX_DIR, 'posts.json'), JSON.stringify(postsIndex, null, 2) + '\n');
  fs.writeFileSync(path.join(INDEX_DIR, 'tags.json'), JSON.stringify(tagsMap, null, 2) + '\n');
  fs.writeFileSync(path.join(INDEX_DIR, 'categories.json'), JSON.stringify(categoriesMap, null, 2) + '\n');
  const searchIndexPath = path.join(INDEX_DIR, 'search.json');
  fs.writeFileSync(searchIndexPath, JSON.stringify(searchIndex, null, 2) + '\n');

  fs.mkdirSync(PUBLIC_INDEX_DIR, { recursive: true });
  fs.copyFileSync(searchIndexPath, path.join(PUBLIC_INDEX_DIR, 'search.json'));

  const searchIndexStats = {
    bytes: fs.statSync(searchIndexPath).size,
    records: searchIndex.length,
    warn_threshold_bytes: SEARCH_INDEX_WARN_THRESHOLD_BYTES
  };
  if (searchIndexStats.bytes > searchIndexStats.warn_threshold_bytes) {
    pushWarning(warnings, {
      code: 'SEARCH_INDEX_TOO_LARGE',
      message: `search index size is ${searchIndexStats.bytes} bytes (threshold: ${searchIndexStats.warn_threshold_bytes})`
    });
  }

  const pendingDeletes = loadExportStatePendingDeletes();
  for (const item of pendingDeletes.posts) {
    pushWarning(warnings, {
      code: 'DELETE_CANDIDATE_POST',
      slug: item.slug,
      source_path: item.source_path,
      message: item.reason || 'delete candidate (post)'
    });
  }
  for (const item of pendingDeletes.assets) {
    pushWarning(warnings, {
      code: 'DELETE_CANDIDATE_ASSET',
      asset_path: item.source_path,
      message: item.reason || 'delete candidate (asset)'
    });
  }

  const qualityResult = writeQualityReports(
    warnings,
    { posts: posts.length },
    { ...options, searchIndexStats }
  );

  console.log(`Indexed ${posts.length} published posts.`);
  console.log(`Generated ${searchIndex.length} search records.`);
  console.log(`Generated quality reports with ${warnings.length} warnings.`);

  if (qualityResult.strictEnabled && qualityResult.strictFailed) {
    throw new Error(`Strict quality check failed: ${qualityResult.strictFailCodes.join(', ')}`);
  }
}

buildIndex(parseArgs(process.argv.slice(2))).catch((err) => {
  console.error('[build-index] ERROR:', err?.message ?? err);
  process.exit(1);
});
