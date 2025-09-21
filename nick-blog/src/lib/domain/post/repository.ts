import type { PostMeta, S3PostDto } from '@/lib/application/post/dto';

export interface PostRepository {
    /** 全記事のメタデータを取得（本文なし） */
    listMeta(): Promise<PostMeta[]>;

    /** スラッグから記事を取得 */
    getBySlug(slug: string): Promise<S3PostDto | null>;
}