import './globals.css';
import SiteHeader from 'components/ui/SiteHeader';

export const metadata = {
  title: 'my-blog',
  description: 'Static export markdown blog'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <SiteHeader />
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
