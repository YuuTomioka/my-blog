import { getAllCategories, getAllPosts, getAllTags } from 'lib/posts';

export const dynamic = 'force-static';

function getSiteUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    console.warn('[v1.2] NEXT_PUBLIC_SITE_URL is not set. Falling back to http://localhost:3000 for sitemap.');
    return 'http://localhost:3000';
  }
  return siteUrl.replace(/\/+$/, '');
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc, lastmod) {
  const lastmodValue = lastmod ? `<lastmod>${xmlEscape(lastmod)}</lastmod>` : '';
  return `<url><loc>${xmlEscape(loc)}</loc>${lastmodValue}</url>`;
}

export async function GET() {
  const siteUrl = getSiteUrl();
  const now = new Date().toISOString();
  const entries = [];

  entries.push(urlEntry(`${siteUrl}/`, now));
  entries.push(urlEntry(`${siteUrl}/tags/`, now));
  entries.push(urlEntry(`${siteUrl}/categories/`, now));

  for (const tag of getAllTags()) {
    entries.push(urlEntry(`${siteUrl}/tags/${encodeURIComponent(tag)}/`, now));
  }

  for (const category of getAllCategories()) {
    const path = category.split('/').map(encodeURIComponent).join('/');
    entries.push(urlEntry(`${siteUrl}/categories/${path}/`, now));
  }

  for (const post of getAllPosts()) {
    const lastmod = post.updated_at || post.created_at;
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(lastmod) ? `${lastmod}T00:00:00.000Z` : lastmod;
    entries.push(urlEntry(`${siteUrl}/posts/${encodeURIComponent(post.slug)}/`, iso));
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>'
  ].join('');

  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=3600'
    }
  });
}
