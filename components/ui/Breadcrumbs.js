import Link from 'next/link';

export default function Breadcrumbs({ items = [] }) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs-nav">
      <ol className="breadcrumbs-list">
        <li className="breadcrumbs-item">
          <Link href="/" className="breadcrumbs-link">Home</Link>
        </li>
        {items.map((item) => (
          <li key={`${item.label}-${item.href || 'current'}`} className="breadcrumbs-item">
            <svg
              fill="currentColor"
              viewBox="0 0 24 44"
              preserveAspectRatio="none"
              aria-hidden="true"
              className="breadcrumbs-separator"
            >
              <path d="M.293 0l22 22-22 22h1.414l22-22-22-22H.293z" />
            </svg>
            {item.href ? (
              <Link href={item.href} className="breadcrumbs-link">{item.label}</Link>
            ) : (
              <span aria-current="page" className="breadcrumbs-current">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

