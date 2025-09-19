import React from "react";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getAllPostMetas, getPostBySlug, resolveAssetUrl } from "@/infra/s3/post";

export const revalidate = 300; // 5分キャッシュ

type Props = { params: { slug: string } };

/** 事前ビルド対象の slug を列挙（ISRと併用可能） */
export async function generateStaticParams() {
    const metas = await getAllPostMetas();
    return metas
        .filter(m => m.status === 'published')
        .map(m => ({ slug: m.slug }));
}

/** SEO/OGP用メタデータ */
export async function generateMetadata({ params: { slug } }: Props) {
    try {
        const { meta } = await getPostBySlug(slug);
        // 下書きの場合はメタデータを出さない
        if (meta.status === 'draft') return {};
        // OGP画像はカバー画像があれば絶対URLに解決
        const ogImage = meta.cover ? resolveAssetUrl(meta, meta.cover) : undefined;
        return {
            title: meta.title,
            description: meta.excerpt ?? meta.title,
            openGraph: {
                title: meta.title,
                description: meta.excerpt,
                // Next.js Metadata API では `images`
                images: typeof ogImage === "string" ? [ogImage] : undefined,
            }
        }
    } catch {
        return {};
    }
}

/** 本文ページ */
export default async function PostPage({ params: { slug } }: Props) {
    try {
        const { meta, body } = await getPostBySlug(slug);
        if (meta.status == 'draft') return notFound();

        return (
            <article className="prose mx-auto py-8">
                <h1>{meta.title}</h1>
                {meta.date && <p className="opacity-60 text-sm">{meta.date}</p>}

                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    // 画像やリンクの相対パスをCDNの絶対URLに解決
                    components={{
                        img({ node, ...props }) {
                        const resolvedSrc = typeof props.src === "string" ? resolveAssetUrl(meta, props.src) : undefined;
                        return <img {...props} src={resolvedSrc ?? props.src} alt={props.alt ?? ""} />;
                        },
                        a({ node, ...props }) {
                        // 外部リンクは別タブ
                        const isExternal = typeof props.href === "string" && /^https?:\/\//i.test(props.href);
                        return <a {...props} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener noreferrer" : undefined} />;
                        },
                    }}
                >
                    {body}
                </ReactMarkdown>
            </article>
        );
    } catch (e: any) {
        return notFound();
    }
}
