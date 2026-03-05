import Link from 'next/link';
import PostList from 'components/blog/PostList';
import { getAllPosts } from 'lib/posts';

export const dynamic = 'force-static';

export default function HomePage() {
  const posts = getAllPosts();

  return (
    <section className="stack-lg">
      <div className="page-head">
        <p className="eyebrow">Home</p>
        <h1>Latest Posts</h1>
        <p><Link href="/search/">Search posts</Link></p>
      </div>
      <PostList posts={posts} />
    </section>
  );
}
