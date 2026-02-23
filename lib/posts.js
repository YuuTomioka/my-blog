import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const INDEX_POSTS_PATH = path.join(ROOT, 'content', 'index', 'posts.json');
const INDEX_TAGS_PATH = path.join(ROOT, 'content', 'index', 'tags.json');
const INDEX_CATEGORIES_PATH = path.join(ROOT, 'content', 'index', 'categories.json');

function readJsonSafe(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function normalizeIndexPost(post) {
  if (!post || typeof post !== 'object') return null;
  const created_at = typeof post.created_at === 'string' ? post.created_at : (typeof post.date === 'string' ? post.date : undefined);
  if (!created_at) return null;

  return {
    slug: String(post.slug ?? ''),
    title: String(post.title ?? ''),
    created_at,
    updated_at: post.updated_at ?? null,
    summary: typeof post.summary === 'string' ? post.summary : '',
    tags: Array.isArray(post.tags) ? post.tags : [],
    categories: Array.isArray(post.categories) ? post.categories : []
  };
}

function readPostsIndex() {
  const raw = readJsonSafe(INDEX_POSTS_PATH, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeIndexPost)
    .filter((post) => post && post.slug && post.title)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

function readTagIndex() {
  const raw = readJsonSafe(INDEX_TAGS_PATH, {});
  return raw && typeof raw === 'object' ? raw : {};
}

function readCategoryIndex() {
  const raw = readJsonSafe(INDEX_CATEGORIES_PATH, {});
  return raw && typeof raw === 'object' ? raw : {};
}

function normalizeMarkdownPost(slug, parsed) {
  const data = parsed?.data ?? {};
  const created_at =
    typeof data.created_at === 'string'
      ? data.created_at
      : (typeof data.date === 'string' ? data.date : undefined);

  return {
    ...data,
    slug: data.slug || slug,
    created_at,
    updated_at: data.updated_at ?? null,
    content: parsed.content
  };
}

export function getAllPosts() {
  return readPostsIndex();
}

export function getAllTags() {
  return Object.keys(readTagIndex()).sort((a, b) => a.localeCompare(b));
}

export function getAllCategories() {
  return Object.keys(readCategoryIndex()).sort((a, b) => a.localeCompare(b));
}

export function getPostsByTag(tag) {
  if (!tag) return [];
  const slugs = readTagIndex()[tag] || [];
  const slugSet = new Set(slugs);
  return getAllPosts().filter((post) => slugSet.has(post.slug));
}

export function getPostsByCategoryPath(categoryPath) {
  if (!categoryPath) return [];
  const slugs = readCategoryIndex()[categoryPath] || [];
  const slugSet = new Set(slugs);
  return getAllPosts().filter((post) => slugSet.has(post.slug));
}

export function getPostBySlug(slug) {
  const filePath = path.join(POSTS_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(raw);

  return normalizeMarkdownPost(slug, parsed);
}

// Backward-compatible exports for existing pages during migration.
export const getIndexedPosts = getAllPosts;
export const getTagIndex = readTagIndex;
export const getCategoryIndex = readCategoryIndex;
