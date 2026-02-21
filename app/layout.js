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
          <a href="/" className="home-link">my-blog</a>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
