import Link from 'next/link';
import { getAllCategories, getPostsByCategoryPath } from 'lib/posts';

export const dynamic = 'force-static';

export default function CategoriesPage() {
  const categories = getAllCategories().map((category) => ({
    category,
    count: getPostsByCategoryPath(category).length
  }));

  return (
    <section className="stack-lg">
      <div className="page-head">
        <p className="eyebrow">Browse</p>
        <h1>Categories</h1>
      </div>
      <ul className="simple-list">
        {categories.map(({ category, count }) => (
          <li key={category} className="simple-list-item">
            <Link
              href={`/categories/${category.split('/').map(encodeURIComponent).join('/')}/`}
              className="simple-list-link"
            >
              <span>{category}</span>
              <span className="count-badge">{count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
