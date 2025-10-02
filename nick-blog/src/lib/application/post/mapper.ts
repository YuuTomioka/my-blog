import type { S3PostDto, PostViewModel } from "@/lib/application/post/dto";
import { markdownToHtml } from "@/lib/util/markdown/toHtml";
const ASSET_BASE_URL = process.env.NEXT_PUBLIC_ASSET_BASE_URL;

/** S3のDTOから記事表示用モデルに変換 */
function converUrlFrom(dto: S3PostDto): string | undefined {
    const fm = dto.frontMatter;
    if (!fm.cover || !fm.year || !fm.month || !fm.day || !fm.slug) return undefined;
    return `${ASSET_BASE_URL}/post/${fm.year}/${fm.month}/${fm.day}/${fm.slug}/${fm.cover}`;
}


/** S3のDTOから記事表示用モデルに変換 */
export async function toPostViewModel(dto: S3PostDto): Promise<PostViewModel> {
    const html = await markdownToHtml(dto.body ?? "");
    const fm = dto.frontMatter;
    return {
        slug: fm.slug!,
        title: fm.title || fm.slug || "Untitled",
        excerpt: fm.excerpt || undefined,
        tags: fm.tags ?? [],
        coverURL: converUrlFrom(dto),
        date: fm.date || undefined,
        html,
    }
}

export default toPostViewModel;
