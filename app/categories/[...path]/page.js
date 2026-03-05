import PostList from 'components/blog/PostList';
import Breadcrumbs from 'components/ui/Breadcrumbs';
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
      <Breadcrumbs items={[{ label: 'Categories', href: '/categories/' }, { label: categoryKey }]} />
      <h1>Category: {categoryKey}</h1>
      <PostList posts={posts} compact />
    </main>
  );
}
