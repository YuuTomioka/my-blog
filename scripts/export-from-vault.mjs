import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const VAULT_PUBLISHED_DIR = path.resolve(ROOT, '..', 'my-vault', '40_blog', 'published');
const VAULT_ASSETS_DIR = path.resolve(ROOT, '..', 'my-vault', '50_assets', 'blog');

const DEST_POSTS_DIR = path.join(ROOT, 'content', 'posts');
const DEST_ASSETS_DIR = path.join(ROOT, 'public', 'assets');

function listFilesRecursively(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const output = [];
  for (const name of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, name);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      output.push(...listFilesRecursively(fullPath));
    } else {
      output.push(fullPath);
    }
  }
  return output;
}

function copyPublishedPosts() {
  fs.mkdirSync(DEST_POSTS_DIR, { recursive: true });

  if (!fs.existsSync(VAULT_PUBLISHED_DIR)) {
    console.warn(`Skip posts export: source not found (${VAULT_PUBLISHED_DIR})`);
    return;
  }

  const mdFiles = listFilesRecursively(VAULT_PUBLISHED_DIR).filter((file) => file.endsWith('.md'));

  for (const sourceFile of mdFiles) {
    const raw = fs.readFileSync(sourceFile, 'utf8');
    const { data } = matter(raw);

    if (data.status !== 'published') {
      continue;
    }

    const slug = data.slug || path.basename(sourceFile, '.md');
    const destFile = path.join(DEST_POSTS_DIR, `${slug}.md`);
    fs.writeFileSync(destFile, raw);
  }

  console.log(`Exported published posts from ${VAULT_PUBLISHED_DIR}`);
}

function copyAssets() {
  fs.mkdirSync(DEST_ASSETS_DIR, { recursive: true });

  if (!fs.existsSync(VAULT_ASSETS_DIR)) {
    console.warn(`Skip assets export: source not found (${VAULT_ASSETS_DIR})`);
    return;
  }

  const files = listFilesRecursively(VAULT_ASSETS_DIR);

  for (const sourceFile of files) {
    const relativePath = path.relative(VAULT_ASSETS_DIR, sourceFile);
    const destFile = path.join(DEST_ASSETS_DIR, relativePath);
    fs.mkdirSync(path.dirname(destFile), { recursive: true });
    fs.copyFileSync(sourceFile, destFile);
  }

  console.log(`Exported assets from ${VAULT_ASSETS_DIR}`);
}

copyPublishedPosts();
copyAssets();
