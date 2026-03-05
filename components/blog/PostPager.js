import Link from 'next/link';

export default function PostPager({ previous, next }) {
  if (!previous && !next) return null;

  return (
    <nav aria-label="Post pagination" className="post-pager">
      <div className="post-pager-links">
        {previous ? (
          <Link href={`/posts/${previous.slug}/`} className="post-pager-link">
            <span className="post-pager-label">Previous</span>
            <span>{previous.title}</span>
          </Link>
        ) : (
          <span className="post-pager-link post-pager-link-muted" aria-hidden="true">No previous post</span>
        )}
        {next ? (
          <Link href={`/posts/${next.slug}/`} className="post-pager-link">
            <span className="post-pager-label">Next</span>
            <span>{next.title}</span>
          </Link>
        ) : (
          <span className="post-pager-link post-pager-link-muted" aria-hidden="true">No next post</span>
        )}
      </div>
    </nav>
  );
}

