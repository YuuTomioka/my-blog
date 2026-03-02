import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();

const VAULT_PUBLISHED_DIR = path.resolve(ROOT, '..', 'my-vault', '40_blog', 'published');
const VAULT_ASSETS_DIR = path.resolve(ROOT, '..', 'my-vault', '50_assets', 'blog');

const DEST_POSTS_DIR = path.join(ROOT, 'content', 'posts');
const DEST_ASSETS_DIR = path.join(ROOT, 'public', 'assets');
const STATE_PATH = path.join(ROOT, 'content', '.export-state.json');

const STATE_VERSION = 1;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function toPosixPath(input) {
  return input.split(path.sep).join('/');
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

function normalizeFrontmatter(data, sourceFile) {
  if (!data || typeof data !== 'object') {
    throw new Error(`Invalid frontmatter in ${sourceFile}`);
  }

  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const slug = typeof data.slug === 'string' ? data.slug.trim() : '';
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
  if (status !== 'published') {
    throw new Error(`export-from-vault called on a non-published post (status=${status}) in ${sourceFile}`);
  }

  let createdAt;
  if (typeof data.created_at === 'string' && data.created_at.trim() !== '') {
    createdAt = data.created_at.trim();
  } else if (typeof data.date === 'string' && data.date.trim() !== '') {
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
  if (data.updated_at !== undefined && data.updated_at !== null && data.updated_at !== '') {
    if (typeof data.updated_at !== 'string') {
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

  const summary = typeof data.summary === 'string' ? data.summary.trim() : '';
  if (!summary) {
    console.warn(`[export-from-vault] warning: summary is empty in ${sourceFile}`);
  }

  const normalized = {
    title,
    slug,
    status: 'published',
    created_at: createdAt,
    tags,
    categories
  };

  if (updatedAt) normalized.updated_at = updatedAt;
  if (summary) normalized.summary = summary;

  if (data.cover !== undefined && data.cover !== null && data.cover !== '') {
    if (typeof data.cover !== 'string') {
      throw new Error(`Invalid cover type in ${sourceFile}`);
    }
    normalized.cover = data.cover.trim();
  }

  if (data.related !== undefined && data.related !== null) {
    if (!Array.isArray(data.related)) {
      throw new Error(`"related" must be an array of slugs in ${sourceFile}`);
    }
    const related = data.related
      .filter((v) => typeof v === 'string')
      .map((v) => v.trim())
      .filter(Boolean);
    if (related.length > 0) {
      normalized.related = related;
    }
  }

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

function hashValue(input) {
  return `sha1:${crypto.createHash('sha1').update(input).digest('hex')}`;
}

function hashPost(normalizedFrontmatter, markdownContent) {
  return hashValue(JSON.stringify({
    frontmatter: normalizedFrontmatter,
    content: String(markdownContent || '')
  }));
}

function hashFile(filePath) {
  return hashValue(fs.readFileSync(filePath));
}

function parseArgs(argv) {
  return {
    forceDelete: argv.includes('--force-delete')
  };
}

function loadState() {
  if (!fs.existsSync(STATE_PATH)) {
    return {
      version: STATE_VERSION,
      generated_at: null,
      items: [],
      asset_items: [],
      pending_deletes: { posts: [], assets: [] }
    };
  }

  try {
    const raw = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    return {
      version: Number(raw?.version) || STATE_VERSION,
      generated_at: typeof raw?.generated_at === 'string' ? raw.generated_at : null,
      items: Array.isArray(raw?.items) ? raw.items : [],
      asset_items: Array.isArray(raw?.asset_items) ? raw.asset_items : [],
      pending_deletes: raw?.pending_deletes && typeof raw.pending_deletes === 'object'
        ? {
            posts: Array.isArray(raw.pending_deletes.posts) ? raw.pending_deletes.posts : [],
            assets: Array.isArray(raw.pending_deletes.assets) ? raw.pending_deletes.assets : []
          }
        : { posts: [], assets: [] }
    };
  } catch (err) {
    throw new Error(`Failed to parse state file: ${STATE_PATH} (${err?.message ?? err})`);
  }
}

function saveState(state) {
  ensureDir(path.dirname(STATE_PATH));
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function removePathIfExists(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  fs.rmSync(targetPath, { recursive: true, force: true });
  return true;
}

function ensureGeneratedRoots() {
  ensureDir(DEST_POSTS_DIR);
  ensureDir(DEST_ASSETS_DIR);
}

function runPostDiff(previousState, nowIso, forceDelete) {
  const prevBySource = new Map(previousState.items.map((item) => [item.source_path, item]));
  const previousPending = Array.isArray(previousState?.pending_deletes?.posts)
    ? previousState.pending_deletes.posts
    : [];
  const seenSlugs = new Map();
  const nextItems = [];
  const seenSources = new Set();

  const metrics = {
    created: 0,
    updated: 0,
    skipped: 0,
    deleted: 0
  };

  const deleteCandidates = [];

  if (!fs.existsSync(VAULT_PUBLISHED_DIR)) {
    console.warn(`Skip posts export: source not found (${VAULT_PUBLISHED_DIR})`);
  } else {
    const mdFiles = listFilesRecursively(VAULT_PUBLISHED_DIR).filter((f) => f.endsWith('.md'));

    for (const sourceFile of mdFiles) {
      const sourcePath = toPosixPath(path.relative(VAULT_PUBLISHED_DIR, sourceFile));
      const raw = fs.readFileSync(sourceFile, 'utf8');
      const parsed = matter(raw);
      const { data } = parsed;

      if (data.status !== 'published') continue;

      const normalizedData = normalizeFrontmatter(data, sourceFile);
      const slug = normalizedData.slug;
      if (seenSlugs.has(slug)) {
        throw new Error(`Duplicate slug "${slug}" in:\n- ${seenSlugs.get(slug)}\n- ${sourceFile}`);
      }
      seenSlugs.set(slug, sourceFile);

      const nextHash = hashPost(normalizedData, parsed.content);
      const previous = prevBySource.get(sourcePath);
      const unchanged = previous && previous.hash === nextHash && previous.slug === slug;

      const destFile = path.join(DEST_POSTS_DIR, `${slug}.md`);
      if (!unchanged) {
        const nextRaw = matter.stringify(parsed.content, normalizedData);
        fs.writeFileSync(destFile, nextRaw, 'utf8');
        if (!previous) metrics.created += 1;
        else metrics.updated += 1;
      } else {
        metrics.skipped += 1;
      }

      if (previous && previous.slug && previous.slug !== slug) {
        deleteCandidates.push({
          type: 'slug_rename',
          source_path: sourcePath,
          slug: previous.slug,
          current_slug: slug,
          reason: `slug changed: ${previous.slug} -> ${slug}`
        });
      }

      seenSources.add(sourcePath);
      nextItems.push({
        source_path: sourcePath,
        slug,
        hash: nextHash,
        exported_at: unchanged ? (previous?.exported_at || nowIso) : nowIso
      });
    }
  }

  for (const previous of previousState.items) {
    if (!seenSources.has(previous.source_path)) {
      deleteCandidates.push({
        type: 'source_removed',
        source_path: previous.source_path,
        slug: previous.slug,
        reason: 'source file removed from vault'
      });
    }
  }

  const uniquePostCandidates = [];
  const seenSlugDeletes = new Set();
  for (const candidate of deleteCandidates) {
    const slug = candidate.slug;
    if (!slug || seenSlugDeletes.has(slug)) continue;
    seenSlugDeletes.add(slug);
    uniquePostCandidates.push(candidate);
  }

  const total = previousState.items.length;
  const threshold = Math.max(10, Math.floor(total * 0.2));
  if (uniquePostCandidates.length > threshold) {
    throw new Error(
      `Refusing to continue: delete candidates (${uniquePostCandidates.length}) exceed threshold (${threshold}). ` +
      'Check vault source path and rerun after fixing input.'
    );
  }

  const pendingMap = new Map();
  for (const candidate of previousPending) {
    if (candidate?.slug) pendingMap.set(candidate.slug, candidate);
  }
  for (const candidate of uniquePostCandidates) {
    if (candidate?.slug) pendingMap.set(candidate.slug, candidate);
  }

  for (const slug of Array.from(pendingMap.keys())) {
    if (nextItems.some((item) => item.slug === slug)) {
      pendingMap.delete(slug);
    }
  }

  const mergedPending = Array.from(pendingMap.values());

  if (forceDelete) {
    for (const candidate of mergedPending) {
      const deletedPost = removePathIfExists(path.join(DEST_POSTS_DIR, `${candidate.slug}.md`));
      const deletedAssets = removePathIfExists(path.join(DEST_ASSETS_DIR, candidate.slug));
      if (deletedPost || deletedAssets) metrics.deleted += 1;
    }
  }

  return {
    items: nextItems.sort((a, b) => a.source_path.localeCompare(b.source_path)),
    pendingDeletes: forceDelete ? [] : mergedPending,
    metrics
  };
}

function runAssetDiff(previousState, nowIso, forceDelete) {
  const prevBySource = new Map(previousState.asset_items.map((item) => [item.source_path, item]));
  const previousPending = Array.isArray(previousState?.pending_deletes?.assets)
    ? previousState.pending_deletes.assets
    : [];
  const seenSources = new Set();
  const nextItems = [];
  const deleteCandidates = [];

  const metrics = {
    created: 0,
    updated: 0,
    skipped: 0,
    deleted: 0
  };

  if (!fs.existsSync(VAULT_ASSETS_DIR)) {
    console.warn(`Skip assets export: source not found (${VAULT_ASSETS_DIR})`);
  } else {
    const files = listFilesRecursively(VAULT_ASSETS_DIR).filter((filePath) => fs.statSync(filePath).isFile());

    for (const sourceFile of files) {
      const sourcePath = toPosixPath(path.relative(VAULT_ASSETS_DIR, sourceFile));
      const nextHash = hashFile(sourceFile);
      const previous = prevBySource.get(sourcePath);
      const unchanged = previous && previous.hash === nextHash;

      const destFile = path.join(DEST_ASSETS_DIR, sourcePath);
      if (!unchanged) {
        ensureDir(path.dirname(destFile));
        fs.copyFileSync(sourceFile, destFile);
        if (!previous) metrics.created += 1;
        else metrics.updated += 1;
      } else {
        metrics.skipped += 1;
      }

      seenSources.add(sourcePath);
      nextItems.push({
        source_path: sourcePath,
        hash: nextHash,
        exported_at: unchanged ? (previous?.exported_at || nowIso) : nowIso
      });
    }
  }

  for (const previous of previousState.asset_items) {
    if (!seenSources.has(previous.source_path)) {
      deleteCandidates.push({
        source_path: previous.source_path,
        reason: 'asset removed from vault'
      });
    }
  }

  const pendingMap = new Map();
  for (const candidate of previousPending) {
    if (candidate?.source_path) pendingMap.set(candidate.source_path, candidate);
  }
  for (const candidate of deleteCandidates) {
    if (candidate?.source_path) pendingMap.set(candidate.source_path, candidate);
  }
  for (const sourcePath of Array.from(pendingMap.keys())) {
    if (nextItems.some((item) => item.source_path === sourcePath)) {
      pendingMap.delete(sourcePath);
    }
  }

  const mergedPending = Array.from(pendingMap.values());

  if (forceDelete) {
    for (const candidate of mergedPending) {
      const deleted = removePathIfExists(path.join(DEST_ASSETS_DIR, candidate.source_path));
      if (deleted) metrics.deleted += 1;
    }
  }

  return {
    items: nextItems.sort((a, b) => a.source_path.localeCompare(b.source_path)),
    pendingDeletes: forceDelete ? [] : mergedPending,
    metrics
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const nowIso = new Date().toISOString();
  const previousState = loadState();

  ensureGeneratedRoots();

  const postResult = runPostDiff(previousState, nowIso, args.forceDelete);
  const assetResult = runAssetDiff(previousState, nowIso, args.forceDelete);

  const nextState = {
    version: STATE_VERSION,
    generated_at: nowIso,
    items: postResult.items,
    asset_items: assetResult.items,
    pending_deletes: {
      posts: postResult.pendingDeletes,
      assets: assetResult.pendingDeletes
    }
  };

  saveState(nextState);

  console.log(
    `Posts: created=${postResult.metrics.created}, updated=${postResult.metrics.updated}, ` +
    `skipped=${postResult.metrics.skipped}, deleted=${postResult.metrics.deleted}`
  );
  console.log(
    `Assets: created=${assetResult.metrics.created}, updated=${assetResult.metrics.updated}, ` +
    `skipped=${assetResult.metrics.skipped}, deleted=${assetResult.metrics.deleted}`
  );
  if (!args.forceDelete) {
    console.log(
      `Pending deletes: posts=${postResult.pendingDeletes.length}, assets=${assetResult.pendingDeletes.length} ` +
      '(run with --force-delete to apply)'
    );
  }
  console.log('Vault export completed.');
}

try {
  main();
} catch (err) {
  console.error('[export-from-vault] ERROR:', err?.message ?? err);
  process.exit(1);
}
