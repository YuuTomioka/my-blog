import Link from 'next/link';
import { getAllPosts } from 'lib/posts';

export const dynamic = 'force-static';

export default function HomePage() {
  const posts = getAllPosts();

  return (
    <section className="stack-lg">
      <div className="page-head">
        <p className="eyebrow">Home</p>
        <h1>Latest Posts</h1>
      </div>
      <ul className="post-list">
        {posts.map((post) => (
          <li key={post.slug} className="post-card">
            <h2 className="post-card-title">
              <Link href={`/posts/${post.slug}/`}>{post.title}</Link>
            </h2>
            <p className="post-meta">
              <span>Published: {post.created_at}</span>
              {post.updated_at ? <span>Updated: {post.updated_at}</span> : null}
            </p>
            {post.summary ? <p className="post-summary">{post.summary}</p> : null}
            <div className="chip-row">
              {post.tags.map((tag) => (
                <Link key={`tag-${post.slug}-${tag}`} href={`/tags/${encodeURIComponent(tag)}/`} className="chip">
                  #{tag}
                </Link>
              ))}
            </div>
            <div className="chip-row">
              {post.categories.map((category) => (
                <Link
                  key={`cat-${post.slug}-${category}`}
                  href={`/categories/${category.split('/').map(encodeURIComponent).join('/')}/`}
                  className="chip chip-category"
                >
                  {category}
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
