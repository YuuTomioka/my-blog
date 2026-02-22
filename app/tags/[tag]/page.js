import { notFound } from 'next/navigation';
import { getIndexedPosts, getTagIndex } from 'lib/posts';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return Object.keys(getTagIndex()).map((tag) => ({ tag }));
}

export default async function TagPage({ params }) {
  const resolvedParams = await params;
  const tag = resolvedParams?.tag;
  if (!tag) notFound();

  const tags = getTagIndex();
  const slugs = tags[tag] || [];
  const posts = getIndexedPosts().filter((post) => slugs.includes(post.slug));

  return (
    <section>
      <h1>Tag: {tag}</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.slug}>
            <a href={`/posts/${post.slug}/`}>{post.title}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}
