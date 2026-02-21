import { getIndexedPosts } from 'lib/posts';

export const dynamic = 'force-static';

export default function HomePage() {
  const posts = getIndexedPosts();

  return (
    <section>
      <h1>Latest Posts</h1>
      <ul>
        {posts.map((post) => (
          <li key={post.slug}>
            <a href={`/posts/${post.slug}/`}>{post.title}</a>
            {' '}
            <small>{post.date}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}
