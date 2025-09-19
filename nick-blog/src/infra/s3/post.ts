import { GetObjectCommand, ListObjectsV2Command, S3, S3Client } from "@aws-sdk/client-s3";
import matter from "gray-matter";

/** 記事メタデータ */
export type PostMeta = {
    key: string; // S3オブジェクトキー
    slug: string; // スラッグ
    year: string; // 年（アーカイブ用）
    month: string; // 月（アーカイブ用）
    date: string; // 日（アーカイブ用）
    title?: string; // タイトル
    excerpt?: string; // 概要
    cover?: string; // カバー画像URL
    status?: 'draft' | 'published'; // 公開状態
    tags?: string[]; // タグ
};

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.S3_BUCKET!;
const BASE_URL = process.env.NEXT_PUBLIC_ASSET_BASE_URL!;

/** S3のキーから slug/year/month/date を抽出 */
function parseKey(key: string) {
    const match = key.match(/^posts\/(\d{4})\/(\d{2})\/(\d{2})\/(.+)\.md$/);
    if (!match) return null;
    return { slug: match[4], year: match[1], month: match[2], date: match[3] };
}

/** 全記事のメタだけ取得（本文は読まない） */
export async function getAllPostMetas(): Promise<PostMeta[]> {
    const listed = await s3.send(new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: 'posts/',
        MaxKeys: 1000,
    }));

    const keys = (listed.Contents || [])
        .map(obj => obj.Key!)
        .filter(key => key.endsWith('index.md'));

    const metas: PostMeta[] = [];
    for (const key of keys) {
        const parsed = parseKey(key);
        if (!parsed) continue;
        const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
        const raw = await obj.Body?.transformToString();
        if (!raw) continue;
        const { data } = matter(raw);
        metas.push({
            key,
            slug: parsed.slug,
            year: parsed.year,
            month: parsed.month,
            date: parsed.date,
            title: data.title,
            excerpt: data.excerpt,
            cover: data.cover,
            status: data.status,
            tags: data.tags,
        });
    }
    return metas;
}

/** 単一記事：メタ＋本文取得 */
export async function getPostBySlug(slug: string): Promise<{ meta: PostMeta; body: string }> {
    // フォルダ探索コストを抑えるためにメタ一覧はキャッシュすることを検討
    const metas = await getAllPostMetas();
    const meta = metas.find(m => m.slug === slug);
    if (!meta) throw new Error('Post not found');

    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: meta.key }));
    const raw = await obj.Body?.transformToString();
    if (!raw) throw new Error('Post content not found');
    const { data, content } = matter(raw);

    // Frontmatterが本文と差異がある場合、metaを更新して返す
    meta.title = (data.title ?? meta.title)
    meta.year = (data.year ?? meta.year)
    meta.month = (data.month ?? meta.month)
    meta.date = (data.date ?? meta.date)
    meta.excerpt = (data.excerpt ?? meta.excerpt)
    meta.cover = (data.cover ?? meta.cover)
    meta.status = (data.status ?? meta.status)
    meta.tags = (data.tags ?? meta.tags)
    return { meta, body: content };
}

/** Markdown中の相対画像リンクをCDNの絶対URLへ変換 */
export function resolveAssetUrl(meta: PostMeta, src: string) {
    if (/^https?:\/\//i.test(src)) return src; // 既に絶対URL
    const base = `${BASE_URL}/posts/${meta.year}/${meta.month}/${meta.date}/${meta.slug}`;
    // 例: "./chart.png" → "https://cdn/.../posts/2025/09/slug/chart.png"
    return `${base}/${src.replace(/^\.?\//, "")}`;
}