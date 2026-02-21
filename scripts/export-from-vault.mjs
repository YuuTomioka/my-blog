// my-blog/scripts/export-from-vault.mjs
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = process.cwd();

const VAULT_PUBLISHED_DIR = path.resolve(ROOT, "..", "my-vault", "40_blog", "published");
const VAULT_ASSETS_DIR = path.resolve(ROOT, "..", "my-vault", "50_assets", "blog");

const DEST_POSTS_DIR = path.join(ROOT, "content", "posts");
const DEST_ASSETS_DIR = path.join(ROOT, "public", "assets");

// Safety marker file to avoid deleting wrong directories by mistake.
const GENERATED_MARKER = ".generated-by-export-from-vault";

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function listFilesRecursively(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...listFilesRecursively(full));
    else out.push(full);
  }
  return out;
}

/**
 * Sync strategy:
 * - We treat DEST dirs as generated artifacts.
 * - We fully clear them on each run (but only if marker exists or dir is empty/new).
 */
function resetGeneratedDir(dir) {
  ensureDir(dir);

  const markerPath = path.join(dir, GENERATED_MARKER);
  const exists = fs.existsSync(markerPath);

  // If directory exists but marker is missing and it contains files, refuse to delete (safety).
  if (!exists) {
    const entries = fs.readdirSync(dir).filter((n) => n !== GENERATED_MARKER);
    if (entries.length > 0) {
      throw new Error(
        `Refusing to reset "${dir}" because marker "${GENERATED_MARKER}" is missing and directory is not empty. ` +
          `If you are sure this directory is generated, delete its contents once or create the marker file manually.`
      );
    }
  }

  // Remove everything then recreate dir + marker
  fs.rmSync(dir, { recursive: true, force: true });
  ensureDir(dir);
  fs.writeFileSync(markerPath, `generated at ${new Date().toISOString()}\n`, "utf8");
}

function validateFrontmatter(data, sourceFile) {
  const required = ["title", "slug", "date", "status", "tags", "categories"];
  const missing = required.filter((k) => data[k] === undefined || data[k] === null);
  if (missing.length > 0) {
    throw new Error(`Missing frontmatter fields [${missing.join(", ")}] in ${sourceFile}`);
  }
  if (data.status !== "published") {
    throw new Error(`export-from-vault called on a non-published post (status=${data.status}) in ${sourceFile}`);
  }
  if (typeof data.slug !== "string" || data.slug.trim() === "") {
    throw new Error(`Invalid slug in ${sourceFile}`);
  }
  if (!Array.isArray(data.tags) || !Array.isArray(data.categories)) {
    throw new Error(`tags/categories must be arrays in ${sourceFile}`);
  }
}

function copyPublishedPosts() {
  resetGeneratedDir(DEST_POSTS_DIR);

  if (!fs.existsSync(VAULT_PUBLISHED_DIR)) {
    console.warn(`Skip posts export: source not found (${VAULT_PUBLISHED_DIR})`);
    return;
  }

  const mdFiles = listFilesRecursively(VAULT_PUBLISHED_DIR).filter((f) => f.endsWith(".md"));
  const seenSlugs = new Map(); // slug -> sourceFile

  let count = 0;
  for (const sourceFile of mdFiles) {
    const raw = fs.readFileSync(sourceFile, "utf8");
    const { data } = matter(raw);

    // Export only "published"
    if (data.status !== "published") continue;

    validateFrontmatter(data, sourceFile);

    const slug = String(data.slug).trim();
    if (seenSlugs.has(slug)) {
      throw new Error(`Duplicate slug "${slug}" in:\n- ${seenSlugs.get(slug)}\n- ${sourceFile}`);
    }
    seenSlugs.set(slug, sourceFile);

    const destFile = path.join(DEST_POSTS_DIR, `${slug}.md`);
    fs.writeFileSync(destFile, raw, "utf8");
    count++;
  }

  console.log(`Exported ${count} published posts -> ${DEST_POSTS_DIR}`);
}

function copyAssets() {
  resetGeneratedDir(DEST_ASSETS_DIR);

  if (!fs.existsSync(VAULT_ASSETS_DIR)) {
    console.warn(`Skip assets export: source not found (${VAULT_ASSETS_DIR})`);
    return;
  }

  const files = listFilesRecursively(VAULT_ASSETS_DIR);
  let count = 0;

  for (const sourceFile of files) {
    const st = fs.statSync(sourceFile);
    if (!st.isFile()) continue;

    const relativePath = path.relative(VAULT_ASSETS_DIR, sourceFile);
    const destFile = path.join(DEST_ASSETS_DIR, relativePath);

    ensureDir(path.dirname(destFile));
    fs.copyFileSync(sourceFile, destFile);
    count++;
  }

  console.log(`Exported ${count} assets -> ${DEST_ASSETS_DIR}`);
}

try {
  copyPublishedPosts();
  copyAssets();
  console.log("Vault export completed.");
} catch (err) {
  console.error("[export-from-vault] ERROR:", err?.message ?? err);
  process.exit(1);
}