import { getIndexedPosts, getTagIndex } from 'lib/posts';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return Object.keys(getTagIndex()).map((tag) => ({ tag }));
}

export default function TagPage({ params }) {
  const tags = getTagIndex();
  const slugs = tags[params.tag] || [];
  const posts = getIndexedPosts().filter((post) => slugs.includes(post.slug));

  return (
    <section>
      <h1>Tag: {params.tag}</h1>
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
