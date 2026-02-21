import { notFound } from 'next/navigation';
import { markdownToHtml } from 'lib/markdown/render';
import { getIndexedPosts, getPostBySlug } from 'lib/posts';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return getIndexedPosts().map((post) => ({ slug: post.slug }));
}

export default async function PostPage({ params }) {
  const post = getPostBySlug(params.slug);

  if (!post || post.status !== 'published') {
    notFound();
  }

  const html = await markdownToHtml(post.content);

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.date}</p>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}
