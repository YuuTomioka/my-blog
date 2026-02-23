import Link from 'next/link';
import { getAllTags, getPostsByTag } from 'lib/posts';

export const dynamic = 'force-static';

export default function TagsPage() {
  const tags = getAllTags().map((tag) => ({
    tag,
    count: getPostsByTag(tag).length
  }));

  return (
    <section className="stack-lg">
      <div className="page-head">
        <p className="eyebrow">Browse</p>
        <h1>Tags</h1>
      </div>
      <ul className="simple-list">
        {tags.map(({ tag, count }) => (
          <li key={tag} className="simple-list-item">
            <Link href={`/tags/${encodeURIComponent(tag)}/`} className="simple-list-link">
              <span>#{tag}</span>
              <span className="count-badge">{count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
