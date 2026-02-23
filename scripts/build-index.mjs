import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const INDEX_DIR = path.join(ROOT, 'content', 'index');

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

  return {
    slug,
    title,
    created_at: createdAt,
    updated_at: updatedAt,
    summary,
    tags,
    categories
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

function buildIndex() {
  const files = listMarkdownFiles(POSTS_DIR);
  const publishedPosts = [];
  const tagsMap = {};
  const categoriesMap = {};
  const seenSlugs = new Set();

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(raw);
    const post = normalizePostFrontmatter(data, filePath);
    if (seenSlugs.has(post.slug)) {
      throw new Error(`Duplicate slug "${post.slug}" in ${filePath}`);
    }
    seenSlugs.add(post.slug);

    publishedPosts.push(post);

    for (const tag of post.tags) {
      if (!tagsMap[tag]) {
        tagsMap[tag] = [];
      }
      tagsMap[tag].push(post.slug);
    }

    for (const categoryPath of post.categories) {
      if (!categoriesMap[categoryPath]) {
        categoriesMap[categoryPath] = [];
      }
      categoriesMap[categoryPath].push(post.slug);
    }
  }

  publishedPosts.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

  fs.mkdirSync(INDEX_DIR, { recursive: true });
  fs.writeFileSync(path.join(INDEX_DIR, 'posts.json'), JSON.stringify(publishedPosts, null, 2) + '\n');
  fs.writeFileSync(path.join(INDEX_DIR, 'tags.json'), JSON.stringify(tagsMap, null, 2) + '\n');
  fs.writeFileSync(path.join(INDEX_DIR, 'categories.json'), JSON.stringify(categoriesMap, null, 2) + '\n');

  console.log(`Indexed ${publishedPosts.length} published posts.`);
}

buildIndex();
