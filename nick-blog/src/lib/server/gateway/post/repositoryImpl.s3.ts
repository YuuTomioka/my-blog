import "server-only"

import { listKeys } from "../../s3/listKeys";
import { getObjectText } from "../../s3/getObjectText";
import { extractFrontmatterAndContent } from "@/lib/util/markdown/extractFrontmatterAndContent";
import type { PostRepository } from "@/lib/domain/post/repository";
import type { PostMeta, S3PostDto } from "@/lib/application/post/dto";

/** S3オブジェクトキーから記事のメタ情報を抽出 */
function parseKey(key: string) {
    const m = key.match(/^post\/(\d{4})\/(\d{2})\/(\d{2})\/([^\/]+)\/index\.md$/);
    if (!m) return null;
    return { year: m[1], month: m[2], day: m[3], slug: m[4] };
}

/** 記事リポジトリ実装(s3) */
export class S3PostRepository implements PostRepository {
    async listMeta(): Promise<PostMeta[]> {
        // TODO: Implement actual logic to fetch post metadata
        return [];
    }
    async getBySlug(slug: string): Promise<S3PostDto | null> {
        // TODO: Implement actual logic to fetch post by slug
        return null;
    }
}