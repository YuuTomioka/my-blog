import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const INDEX_DIR = path.join(ROOT, 'content', 'index');

const REQUIRED_FIELDS = ['title', 'slug', 'date', 'status', 'tags', 'categories'];

function assertRequiredFields(frontmatter, filePath) {
  for (const field of REQUIRED_FIELDS) {
    if (frontmatter[field] === undefined || frontmatter[field] === null) {
      throw new Error(`Missing required frontmatter field "${field}" in ${filePath}`);
    }
  }

  if (!Array.isArray(frontmatter.tags)) {
    throw new Error(`"tags" must be an array in ${filePath}`);
  }

  if (!Array.isArray(frontmatter.categories)) {
    throw new Error(`"categories" must be an array in ${filePath}`);
  }
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

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(raw);

    assertRequiredFields(data, filePath);

    if (data.status !== 'published') {
      continue;
    }

    const post = {
      title: data.title,
      slug: data.slug,
      date: data.date,
      status: data.status,
      tags: data.tags,
      categories: data.categories,
      summary: data.summary || ''
    };

    publishedPosts.push(post);

    for (const tag of data.tags) {
      if (!tagsMap[tag]) {
        tagsMap[tag] = [];
      }
      tagsMap[tag].push(data.slug);
    }

    for (const categoryPath of data.categories) {
      if (!categoriesMap[categoryPath]) {
        categoriesMap[categoryPath] = [];
      }
      categoriesMap[categoryPath].push(data.slug);
    }
  }

  publishedPosts.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  fs.mkdirSync(INDEX_DIR, { recursive: true });
  fs.writeFileSync(path.join(INDEX_DIR, 'posts.json'), JSON.stringify(publishedPosts, null, 2) + '\n');
  fs.writeFileSync(path.join(INDEX_DIR, 'tags.json'), JSON.stringify(tagsMap, null, 2) + '\n');
  fs.writeFileSync(path.join(INDEX_DIR, 'categories.json'), JSON.stringify(categoriesMap, null, 2) + '\n');

  console.log(`Indexed ${publishedPosts.length} published posts.`);
}

buildIndex();
