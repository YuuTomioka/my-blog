import { notFound } from "next/navigation";
import { makePostUsecase } from "@/lib/application/post/usecase";
import { makePostRepository } from "@/lib/server/gateway/post/makeRepository";
import { MarkdownRenderer } from "@/component/MarkdownRenderer";

type Params = { slug: string };

// Next.js 15+: params は Promise なので await してから使う
export default async function Page({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;

  const repo = makePostRepository();
  const usecase = makePostUsecase({ postRepository: repo });

  const post = await usecase.getBySlug(slug);
  if (!post) return notFound();

  return (
    <article className="mx-auto py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{post.title}</h1>
        {post.date && (
          <p className="text-sm text-gray-500 mt-1">{post.date}</p>
        )}
        {post.coverURL && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverURL} alt={post.title} className="mt-4 rounded" />
        )}
        {post.tags && post.tags.length > 0 && (
          <ul className="flex gap-2 mt-2 text-sm text-gray-600">
            {post.tags.map((t) => (
              <li key={t}>#{t}</li>
            ))}
          </ul>
        )}
      </header>
      <MarkdownRenderer html={post.html} />
    </article>
  );
}

// SSG 用: 可能なら静的生成
export async function generateStaticParams(): Promise<Params[]> {
  const repo = makePostRepository();
  const usecase = makePostUsecase({ postRepository: repo });
  const metas = await usecase.listMeta();
  return metas.map((m) => ({ slug: m.slug }));
}
