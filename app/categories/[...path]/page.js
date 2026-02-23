import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllCategories, getPostsByCategoryPath } from 'lib/posts';

export const dynamic = 'force-static';

function normalizePathParam(p) {
  if (Array.isArray(p)) return p;
  if (typeof p === 'string') return p.split('/').filter(Boolean);
  return [];
}

export async function generateStaticParams() {
  return getAllCategories().map((key) => ({
    path: key.split('/').filter(Boolean)
  }));
}

export default async function CategoryPage({ params }) {
  const resolvedParams = await params;
  const segs = normalizePathParam(resolvedParams?.path);
  if (segs.length === 0) notFound();

  const categoryKey = segs.join('/');
  const posts = getPostsByCategoryPath(categoryKey);
  if (posts.length === 0) notFound();

  return (
    <main className="stack-lg">
      <h1>Category: {categoryKey}</h1>
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
    </main>
  );
}
