import Link from 'next/link';

export default function PostCard({ post, compact = false }) {
  if (!post) return null;

  return (
    <li className="post-card">
      <h2 className={compact ? 'post-card-title post-card-title-compact' : 'post-card-title'}>
        <Link href={`/posts/${post.slug}/`}>{post.title}</Link>
      </h2>
      <p className="post-meta">
        <span>Published: {post.created_at}</span>
        {post.updated_at ? <span>Updated: {post.updated_at}</span> : null}
      </p>
      {post.summary ? <p className="post-summary">{post.summary}</p> : null}
      {Array.isArray(post.tags) && post.tags.length > 0 ? (
        <div className="chip-row">
          {post.tags.map((tag) => (
            <Link key={`tag-${post.slug}-${tag}`} href={`/tags/${encodeURIComponent(tag)}/`} className="chip">
              #{tag}
            </Link>
          ))}
        </div>
      ) : null}
      {Array.isArray(post.categories) && post.categories.length > 0 ? (
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
      ) : null}
    </li>
  );
}

