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
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function isValidDateString(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [y, m, d] = value.split("-").map(Number);
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
    if (typeof item !== "string") continue;
    const normalized = item.trim().toLowerCase();
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }

  if (sort) out.sort((a, b) => a.localeCompare(b));
  return out;
}

function normalizeFrontmatter(data, sourceFile) {
  if (!data || typeof data !== "object") {
    throw new Error(`Invalid frontmatter in ${sourceFile}`);
  }

  const title = typeof data.title === "string" ? data.title.trim() : "";
  const slug = typeof data.slug === "string" ? data.slug.trim() : "";
  const status = data.status;

  if (!title) {
    throw new Error(`Missing frontmatter field "title" in ${sourceFile}`);
  }
  if (!slug) {
    throw new Error(`Missing frontmatter field "slug" in ${sourceFile}`);
  }
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(`Invalid slug format "${slug}" in ${sourceFile}`);
  }
  if (status !== "published") {
    throw new Error(`export-from-vault called on a non-published post (status=${status}) in ${sourceFile}`);
  }

  let createdAt = undefined;
  if (typeof data.created_at === "string" && data.created_at.trim() !== "") {
    createdAt = data.created_at.trim();
  } else if (typeof data.date === "string" && data.date.trim() !== "") {
    createdAt = data.date.trim();
    console.warn(`[export-from-vault] warning: legacy "date" detected and converted in ${sourceFile}`);
  }

  if (!createdAt) {
    throw new Error(`Missing frontmatter field "created_at" (or legacy "date") in ${sourceFile}`);
  }
  if (!isValidDateString(createdAt)) {
    throw new Error(`Invalid created_at format "${createdAt}" in ${sourceFile}`);
  }

  let updatedAt;
  if (data.updated_at !== undefined && data.updated_at !== null && data.updated_at !== "") {
    if (typeof data.updated_at !== "string") {
      throw new Error(`Invalid updated_at type in ${sourceFile}`);
    }
    updatedAt = data.updated_at.trim();
    if (!isValidDateString(updatedAt)) {
      throw new Error(`Invalid updated_at format "${updatedAt}" in ${sourceFile}`);
    }
  }

  const tags = normalizeStringArray(data.tags, { sort: true });
  if (tags.length === 0) {
    throw new Error(`"tags" must be a non-empty array (or string[]) in ${sourceFile}`);
  }

  const categories = normalizeStringArray(data.categories, { sort: false });
  if (categories.length === 0) {
    throw new Error(`"categories" must be a non-empty array or string in ${sourceFile}`);
  }

  const summary = typeof data.summary === "string" ? data.summary.trim() : "";
  if (!summary) {
    console.warn(`[export-from-vault] warning: summary is empty in ${sourceFile}`);
  }

  const normalized = {
    title,
    slug,
    status: "published",
    created_at: createdAt,
    tags,
    categories
  };

  if (updatedAt) normalized.updated_at = updatedAt;
  if (summary) normalized.summary = summary;

  return normalized;
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
    const parsed = matter(raw);
    const { data } = parsed;

    // Export only "published"
    if (data.status !== "published") continue;

    const normalizedData = normalizeFrontmatter(data, sourceFile);

    const slug = normalizedData.slug;
    if (seenSlugs.has(slug)) {
      throw new Error(`Duplicate slug "${slug}" in:\n- ${seenSlugs.get(slug)}\n- ${sourceFile}`);
    }
    seenSlugs.set(slug, sourceFile);

    const destFile = path.join(DEST_POSTS_DIR, `${slug}.md`);
    const nextRaw = matter.stringify(parsed.content, normalizedData);
    fs.writeFileSync(destFile, nextRaw, "utf8");
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
