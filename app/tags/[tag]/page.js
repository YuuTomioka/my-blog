import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllTags, getPostsByTag } from 'lib/posts';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return getAllTags().map((tag) => ({ tag }));
}

export default async function TagPage({ params }) {
  const resolvedParams = await params;
  const tag = resolvedParams?.tag;
  if (!tag) notFound();

  const posts = getPostsByTag(tag);
  if (posts.length === 0) notFound();

  return (
    <section className="stack-lg">
      <h1>Tag: {tag}</h1>
      <ul className="post-list compact">
        {posts.map((post) => (
          <li key={post.slug} className="post-card">
            <h2 className="post-card-title">
              <Link href={`/posts/${post.slug}/`}>{post.title}</Link>
            </h2>
            <p className="post-meta">
              <span>Published: {post.created_at}</span>
              {post.updated_at ? <span>Updated: {post.updated_at}</span> : null}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
