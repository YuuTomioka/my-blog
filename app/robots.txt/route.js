export const dynamic = 'force-static';

function getSiteUrl() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    console.warn('[v1.2] NEXT_PUBLIC_SITE_URL is not set. Falling back to http://localhost:3000 for robots.');
    return 'http://localhost:3000';
  }
  return siteUrl.replace(/\/+$/, '');
}

export async function GET() {
  const siteUrl = getSiteUrl();
  const body = [
    'User-agent: *',
    'Allow: /',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    ''
  ].join('\n');

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=3600'
    }
  });
}
