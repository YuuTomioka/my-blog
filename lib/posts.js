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

export function getIndexedPosts() {
  return readJsonSafe(INDEX_POSTS_PATH, []);
}

export function getTagIndex() {
  return readJsonSafe(INDEX_TAGS_PATH, {});
}

export function getCategoryIndex() {
  return readJsonSafe(INDEX_CATEGORIES_PATH, {});
}

export function getPostBySlug(slug) {
  const filePath = path.join(POSTS_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(raw);

  return {
    ...parsed.data,
    slug: parsed.data.slug || slug,
    content: parsed.content
  };
}
