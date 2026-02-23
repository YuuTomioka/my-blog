import Link from 'next/link';
import { notFound } from 'next/navigation';
import { markdownToHtml } from 'lib/markdown/render';
import { getAllPosts, getPostBySlug } from 'lib/posts';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export default async function PostPage({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  const post = slug ? getPostBySlug(slug) : null;

  if (!post || post.status !== 'published') {
    notFound();
  }

  const html = await markdownToHtml(post.content);

  return (
    <article className="stack-lg">
      <h1>{post.title}</h1>
      <div className="post-meta-block">
        <p className="post-meta-line">Published: {post.created_at}</p>
        {post.updated_at ? <p className="post-meta-line">Updated: {post.updated_at}</p> : null}
      </div>
      <div className="chip-row">
        {(Array.isArray(post.tags) ? post.tags : []).map((tag) => (
          <Link key={`tag-${tag}`} href={`/tags/${encodeURIComponent(tag)}/`} className="chip">
            #{tag}
          </Link>
        ))}
      </div>
      <div className="chip-row">
        {(Array.isArray(post.categories) ? post.categories : []).map((category) => (
          <Link
            key={`cat-${category}`}
            href={`/categories/${category.split('/').map(encodeURIComponent).join('/')}/`}
            className="chip chip-category"
          >
            {category}
          </Link>
        ))}
      </div>
      <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}
