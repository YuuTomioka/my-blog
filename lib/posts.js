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

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim());
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
    cover: typeof data.cover === 'string' ? data.cover : undefined,
    related: normalizeStringArray(data.related),
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

export function getAdjacentPosts(slug) {
  const posts = getAllPosts();
  const idx = posts.findIndex((post) => post.slug === slug);
  if (idx === -1) {
    return { next: null, previous: null };
  }

  return {
    // list is created_at desc (newest first)
    next: idx > 0 ? posts[idx - 1] : null,
    previous: idx < posts.length - 1 ? posts[idx + 1] : null
  };
}

export function getRelatedPosts(postOrSlug, limit = 3) {
  const post = typeof postOrSlug === 'string' ? getPostBySlug(postOrSlug) : postOrSlug;
  if (!post || !post.slug) {
    return { posts: [], warnings: [] };
  }

  const warnings = [];
  const allPosts = getAllPosts();
  const allBySlug = new Map(allPosts.map((p) => [p.slug, p]));
  const picked = [];
  const pickedSlugs = new Set([post.slug]);

  const relatedSlugs = Array.isArray(post.related) ? post.related : [];
  for (const slug of relatedSlugs) {
    if (picked.length >= limit) break;
    if (!slug || pickedSlugs.has(slug)) continue;
    const target = allBySlug.get(slug);
    if (!target) {
      warnings.push(`related slug not found: ${slug}`);
      continue;
    }
    picked.push(target);
    pickedSlugs.add(slug);
  }

  if (picked.length < limit) {
    const postTags = new Set(Array.isArray(post.tags) ? post.tags : []);
    const fallback = allPosts
      .filter((candidate) => !pickedSlugs.has(candidate.slug))
      .map((candidate) => {
        const tags = Array.isArray(candidate.tags) ? candidate.tags : [];
        let overlap = 0;
        for (const tag of tags) {
          if (postTags.has(tag)) overlap += 1;
        }
        return { candidate, overlap };
      })
      .filter((item) => item.overlap > 0)
      .sort((a, b) => {
        if (b.overlap !== a.overlap) return b.overlap - a.overlap;
        return String(b.candidate.created_at).localeCompare(String(a.candidate.created_at));
      });

    for (const item of fallback) {
      if (picked.length >= limit) break;
      picked.push(item.candidate);
      pickedSlugs.add(item.candidate.slug);
    }
  }

  return { posts: picked.slice(0, limit), warnings };
}

// Backward-compatible exports for existing pages during migration.
export const getIndexedPosts = getAllPosts;
export const getTagIndex = readTagIndex;
export const getCategoryIndex = readCategoryIndex;
