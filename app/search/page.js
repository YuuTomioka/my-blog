'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildSearchTokens,
  includesToken,
  normalizeSearchText,
  searchPosts
} from 'lib/search/client';

const INPUT_DEBOUNCE_MS = 250;

function shouldHighlightToken(textChunk, tokens) {
  const normalizedChunk = normalizeSearchText(textChunk);
  if (!normalizedChunk) return false;
  return tokens.some((token) => includesToken(normalizedChunk, token) || includesToken(token, normalizedChunk));
}

function renderHighlightedText(text, tokens) {
  const value = String(text || '');
  if (!value || tokens.length === 0) return value;

  const chunks = value.split(/(\s+)/);
  let hasMarked = false;
  const highlighted = chunks.map((chunk, index) => {
    if (!chunk || /^\s+$/.test(chunk)) return chunk;
    if (!shouldHighlightToken(chunk, tokens)) return chunk;
    hasMarked = true;
    return <mark key={`${chunk}-${index}`}>{chunk}</mark>;
  });

  return hasMarked ? highlighted : value;
}

function toSearchPath(query) {
  return query ? `/search/?q=${encodeURIComponent(query)}` : '/search/';
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [input, setInput] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const searchTokens = useMemo(() => buildSearchTokens(query), [query]);
  const results = useMemo(() => searchPosts(items, query), [items, query]);
  const hasNoResults = query.trim().length > 0 && results.length === 0;

  const commitQuery = useCallback((nextQuery, { history = 'replace' } = {}) => {
    const nextPath = toSearchPath(nextQuery);
    if (history === 'push') {
      window.history.pushState({}, '', nextPath);
    } else {
      window.history.replaceState({}, '', nextPath);
    }
    setQuery(nextQuery);
  }, []);

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
    const nextQuery = input.trim();
    if (nextQuery === query) return;

    const timer = window.setTimeout(() => {
      commitQuery(nextQuery, { history: 'replace' });
    }, INPUT_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [commitQuery, input, query]);

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

  function onSubmit(event) {
    event.preventDefault();
    commitQuery(input.trim(), { history: 'push' });
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
                    <Link href={`/posts/${post.slug}/`}>{renderHighlightedText(post.title, searchTokens)}</Link>
                  </h2>
                  <p className="post-meta">
                    <span>Published: {post.created_at}</span>
                    {post.updated_at ? <span>Updated: {post.updated_at}</span> : null}
                    <span>Score: {post.score}</span>
                  </p>
                  {post.summary ? <p className="post-summary">{renderHighlightedText(post.summary, searchTokens)}</p> : null}
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
          ) : (
            hasNoResults ? (
              <div className="search-empty">
                <p>No results found for "{query}".</p>
                <p>Try a different spelling or a shorter keyword.</p>
                <p>
                  Browse related topics from <Link href="/tags/">/tags</Link>.
                </p>
              </div>
            ) : null
          )}
        </>
      ) : null}
    </section>
  );
}
