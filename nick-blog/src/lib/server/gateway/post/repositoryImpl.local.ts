import "server-only";

import fs from "fs/promises";
import path from "path";

import { extractFrontmatterAndContent } from "@/lib/util/markdown/extractFrontmatterAndContent";
import type { PostRepository } from "@/lib/domain/post/repository";
import type { PostMeta, S3PostDto } from "@/lib/application/post/dto";

// ローカルのコンテンツルート
// Next プロジェクト(root: nick-blog) から見て一つ上に `content/` がある前提
const CONTENT_ROOT = process.env.LOCAL_CONTENT_ROOT
  ? path.resolve(process.env.LOCAL_CONTENT_ROOT)
  : path.resolve(process.cwd(), "../content");

const POST_DIR = path.join(CONTENT_ROOT, "post");

/** `.../content/post/YYYY/MM/DD/slug/index.md` 形式のパスから情報抽出 */
function parseFilePath(filePath: string) {
  const rel = path.relative(CONTENT_ROOT, filePath).split(path.sep).join("/");
  const m = rel.match(/^post\/(\d{4})\/(\d{2})\/(\d{2})\/([^\/]+)\/index\.md$/);
  if (!m) return null;
  return { year: m[1], month: m[2], day: m[3], slug: m[4] } as const;
}

async function exists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function* walk(dir: string): AsyncGenerator<string> {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  for (const d of dirents) {
    const full = path.join(dir, d.name);
    if (d.isDirectory()) {
      yield* walk(full);
    } else if (d.isFile()) {
      yield full;
    }
  }
}

/** 記事リポジトリ実装(local) */
export class LocalFsPostRepository implements PostRepository {
  async listMeta(): Promise<PostMeta[]> {
    const metas: PostMeta[] = [];
    if (!(await exists(POST_DIR))) return metas;

    for await (const file of walk(POST_DIR)) {
      if (!file.endsWith("index.md")) continue;
      const info = parseFilePath(file);
      if (!info) continue;

      const raw = await fs.readFile(file, "utf-8");
      const { data } = extractFrontmatterAndContent(raw);

      const key = `post/${info.year}/${info.month}/${info.day}/${info.slug}/index.md`;
      const fm = data as Record<string, unknown>;

      metas.push({
        key,
        slug: (fm.slug as string) || info.slug,
        year: info.year,
        month: info.month,
        day: info.day,
        title: (fm.title as string) || undefined,
        excerpt: (fm.excerpt as string) || undefined,
        tags: (fm.tags as string[]) || undefined,
        status: (fm.status as "draft" | "published") || undefined,
        cover: (fm.cover as string) || undefined,
        date: (fm.date as string) || `${info.year}-${info.month}-${info.day}`,
      });
    }

    // 投稿日降順に並び替え（文字列比較でOK: YYYY-MM-DD）
    metas.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    return metas;
  }

  async getBySlug(slug: string): Promise<S3PostDto | null> {
    if (!(await exists(POST_DIR))) return null;

    for await (const file of walk(POST_DIR)) {
      if (!file.endsWith("index.md")) continue;
      const info = parseFilePath(file);
      if (!info) continue;
      // frontmatter.slug または パスの slug の一致を見る
      const raw = await fs.readFile(file, "utf-8");
      const { data, content } = extractFrontmatterAndContent(raw);
      const fm = data as Record<string, unknown>;
      const fmSlug = (fm.slug as string) || info.slug;
      if (fmSlug !== slug) continue;

      const key = `post/${info.year}/${info.month}/${info.day}/${info.slug}/index.md`;
      return {
        key,
        frontMatter: {
          slug: fmSlug,
          year: info.year,
          month: info.month,
          day: info.day,
          title: (fm.title as string) || undefined,
          excerpt: (fm.excerpt as string) || undefined,
          tags: (fm.tags as string[]) || undefined,
          status: (fm.status as "draft" | "published") || undefined,
          cover: (fm.cover as string) || undefined,
          date: (fm.date as string) || `${info.year}-${info.month}-${info.day}`,
        },
        body: content,
      } satisfies S3PostDto;
    }

    return null;
  }
}
