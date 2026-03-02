'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { searchPosts } from 'lib/search/client';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [input, setInput] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const syncFromLocation = () => {
      const q = new URLSearchParams(window.location.search).get('q') || '';
      setQuery(q);
      setInput(q);
    };

    syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);
    return () => {
      window.removeEventListener('popstate', syncFromLocation);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError('');
        const res = await fetch('/index/search.json', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`failed to load search index: ${res.status}`);
        }
        const data = await res.json();
        if (!active) return;
        setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!active) return;
        setError(err?.message || 'failed to load search index');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const results = useMemo(() => searchPosts(items, query), [items, query]);

  function onSubmit(event) {
    event.preventDefault();
    const next = input.trim();
    const nextPath = next ? `/search/?q=${encodeURIComponent(next)}` : '/search/';
    window.history.pushState({}, '', nextPath);
    setQuery(next);
  }

  return (
    <section className="stack-lg">
      <div className="page-head">
        <p className="eyebrow">Search</p>
        <h1>Search Posts</h1>
      </div>

      <form className="search-form" onSubmit={onSubmit}>
        <input
          type="search"
          name="q"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Search by title, summary, tags, categories"
          className="search-input"
          aria-label="Search query"
        />
        <button type="submit" className="search-button">Search</button>
      </form>

      {loading ? <p className="search-note">Loading search index...</p> : null}
      {error ? <p className="search-error">{error}</p> : null}

      {!loading && !error ? (
        <>
          <p className="search-note">
            {query.trim() ? `Results: ${results.length}` : 'Enter a query to search posts.'}
          </p>
          {results.length > 0 ? (
            <ul className="post-list compact">
              {results.map((post) => (
                <li key={post.slug} className="post-card">
                  <h2 className="post-card-title">
                    <Link href={`/posts/${post.slug}/`}>{post.title}</Link>
                  </h2>
                  <p className="post-meta">
                    <span>Published: {post.created_at}</span>
                    {post.updated_at ? <span>Updated: {post.updated_at}</span> : null}
                    <span>Score: {post.score}</span>
                  </p>
                  {post.summary ? <p className="post-summary">{post.summary}</p> : null}
                  <div className="chip-row">
                    {post.tags.map((tag) => (
                      <Link key={`tag-${post.slug}-${tag}`} href={`/tags/${encodeURIComponent(tag)}/`} className="chip">
                        #{tag}
                      </Link>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
