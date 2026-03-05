import PostList from 'components/blog/PostList';
import Breadcrumbs from 'components/ui/Breadcrumbs';
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
      <Breadcrumbs items={[{ label: 'Tags', href: '/tags/' }, { label: `#${tag}` }]} />
      <h1>Tag: {tag}</h1>
      <PostList posts={posts} compact />
    </section>
  );
}
