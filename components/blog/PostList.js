import PostCard from './PostCard';

export default function PostList({ posts = [], compact = false }) {
  if (!Array.isArray(posts) || posts.length === 0) return null;

  return (
    <ul className={compact ? 'post-list compact' : 'post-list'}>
      {posts.map((post) => (
        <PostCard key={post.slug} post={post} compact={compact} />
      ))}
    </ul>
  );
}

