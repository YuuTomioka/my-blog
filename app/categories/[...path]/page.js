import { getCategoryIndex, getIndexedPosts } from 'lib/posts';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return Object.keys(getCategoryIndex()).map((categoryPath) => ({
    path: categoryPath.split('/')
  }));
}

export default function CategoryPage({ params }) {
  const categoryPath = params.path.join('/');
  const categories = getCategoryIndex();
  const slugs = categories[categoryPath] || [];
  const posts = getIndexedPosts().filter((post) => slugs.includes(post.slug));

  return (
    <section>
      <h1>Category: {categoryPath}</h1>
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
