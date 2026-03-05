import Link from 'next/link';
import { notFound } from 'next/navigation';
import PostList from 'components/blog/PostList';
import PostPager from 'components/blog/PostPager';
import Breadcrumbs from 'components/ui/Breadcrumbs';
import { buildMarkdownExcerpt, renderMarkdown } from 'lib/markdown/render';
import { getAdjacentPosts, getAllPosts, getPostBySlug, getRelatedPosts } from 'lib/posts';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

function getSiteUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    console.warn('[v1.2] NEXT_PUBLIC_SITE_URL is not set. Falling back to http://localhost:3000');
    return 'http://localhost:3000';
  }
  return siteUrl.replace(/\/+$/, '');
}

function makePostUrl(slug) {
  return `${getSiteUrl()}/posts/${encodeURIComponent(slug)}/`;
}

function getDescription(post) {
  if (typeof post.summary === 'string' && post.summary.trim()) {
    return post.summary.trim();
  }
  return buildMarkdownExcerpt(post.content, 140);
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  const post = slug ? getPostBySlug(slug) : null;
  if (!post || post.status !== 'published') {
    return {};
  }

  const canonical = makePostUrl(post.slug);
  const description = getDescription(post);
  const image = typeof post.cover === 'string' && post.cover ? `${getSiteUrl()}${post.cover.startsWith('/') ? '' : '/'}${post.cover}` : undefined;

  return {
    title: post.title,
    description,
    alternates: {
      canonical
    },
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url: canonical,
      ...(image ? { images: [{ url: image }] } : {})
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: post.title,
      description,
      ...(image ? { images: [image] } : {})
    }
  };
}

export default async function PostPage({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  const post = slug ? getPostBySlug(slug) : null;

  if (!post || post.status !== 'published') {
    notFound();
  }

  const siteUrl = getSiteUrl();
  const { html, toc, warnings } = await renderMarkdown(post.content, {
    postSlug: post.slug,
    siteUrl
  });
  if (warnings.length > 0) {
    console.warn(`[render warnings] ${post.slug}`, warnings);
  }

  const { next, previous } = getAdjacentPosts(post.slug);
  const { posts: relatedPosts, warnings: relatedWarnings } = getRelatedPosts(post, 3);
  if (relatedWarnings.length > 0) {
    console.warn(`[related warnings] ${post.slug}`, relatedWarnings);
  }

  const canonical = `${siteUrl}/posts/${encodeURIComponent(post.slug)}/`;
  const description = getDescription(post);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    datePublished: post.created_at,
    ...(post.updated_at ? { dateModified: post.updated_at } : {}),
    description,
    mainEntityOfPage: canonical,
    author: { '@type': 'Person', name: 'my-blog' },
    publisher: { '@type': 'Organization', name: 'my-blog' },
    ...(post.cover ? { image: `${siteUrl}${post.cover.startsWith('/') ? '' : '/'}${post.cover}` } : {})
  };

  return (
    <article className="stack-lg">
      <Breadcrumbs items={[{ label: 'Posts', href: '/' }, { label: post.title }]} />
      <h1>{post.title}</h1>
      {toc.length >= 2 ? (
        <nav className="toc-card" aria-label="Table of contents">
          <p className="toc-title">On this page</p>
          <ul className="toc-list">
            {toc.map((item) => (
              <li key={item.id} className={item.depth === 3 ? 'toc-item toc-item-depth3' : 'toc-item'}>
                <a href={`#${item.id}`}>{item.text}</a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <div className="post-meta-block">
        <p className="post-meta-line">Published: {post.created_at}</p>
        {post.updated_at ? <p className="post-meta-line">Updated: {post.updated_at}</p> : null}
      </div>
      <div className="chip-row">
        {(Array.isArray(post.tags) ? post.tags : []).map((tag) => (
          <Link key={`tag-${tag}`} href={`/tags/${encodeURIComponent(tag)}/`} className="chip">
            #{tag}
          </Link>
        ))}
      </div>
      <div className="chip-row">
        {(Array.isArray(post.categories) ? post.categories : []).map((category) => (
          <Link
            key={`cat-${category}`}
            href={`/categories/${category.split('/').map(encodeURIComponent).join('/')}/`}
            className="chip chip-category"
          >
            {category}
          </Link>
        ))}
      </div>
      <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PostPager previous={previous} next={next} />
      {relatedPosts.length > 0 ? (
        <section className="stack-lg">
          <h2>Related Posts</h2>
          <PostList posts={relatedPosts} compact />
        </section>
      ) : null}
    </article>
  );
}
