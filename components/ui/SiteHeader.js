import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/search/', label: 'Search' },
  { href: '/tags/', label: 'Tags' },
  { href: '/categories/', label: 'Categories' }
];

export default function SiteHeader() {
  return (
    <header className="container site-header">
      <div className="site-nav">
        <Link href="/" className="home-link">my-blog</Link>
        <nav className="top-nav" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href}>{item.label}</Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

