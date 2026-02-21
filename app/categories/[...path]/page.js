import fs from 'node:fs';
import path from 'node:path';
import { notFound } from 'next/navigation';
import { getIndexedPosts } from 'lib/posts';

export const dynamic = 'force-static';

function readCategoriesIndex() {
  const p = path.join(process.cwd(), 'content', 'index', 'categories.json');
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw);
}

function normalizePathParam(p) {
  if (Array.isArray(p)) return p;
  if (typeof p === 'string') return p.split('/').filter(Boolean);
  return [];
}

export async function generateStaticParams() {
  const categories = readCategoriesIndex();
  return Object.keys(categories).map((key) => ({
    path: key.split('/').filter(Boolean)
  }));
}

export default async function CategoryPage({ params }) {
  const resolvedParams = await params;
  const segs = normalizePathParam(resolvedParams?.path);
  if (segs.length === 0) notFound();

  const categoryKey = segs.join('/');
  const categories = readCategoriesIndex();
  const slugs = categories[categoryKey];
  if (!slugs) notFound();

  const posts = getIndexedPosts().filter((post) => slugs.includes(post.slug));

  return (
    <main style={{ padding: 24 }}>
      <h1>Category: {categoryKey}</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.slug}>
            <a href={`/posts/${post.slug}/`}>{post.title}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
