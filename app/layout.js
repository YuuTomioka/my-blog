import Link from 'next/link';
import './globals.css';

export const metadata = {
  title: 'my-blog',
  description: 'Static export markdown blog'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <header className="container">
          <div className="site-nav">
            <Link href="/" className="home-link">my-blog</Link>
            <nav className="top-nav" aria-label="Primary">
              <Link href="/tags/">Tags</Link>
              <Link href="/categories/">Categories</Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
