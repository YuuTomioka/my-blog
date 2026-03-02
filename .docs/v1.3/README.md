# my-blog

Static blog built with Next.js App Router.

This repository is the public publishing boundary. Source notes live in `../my-vault`, and only `published` posts are exported into this repo.

## v1.3 highlights

- Markdown rendering enhancements
  - Stable heading IDs for `h2/h3` (ASCII slug or `h-<hash>`)
  - Inline TOC generation (`h2/h3`, hidden when fewer than 2 headings)
  - Heading anchor links (`#`)
  - Code highlighting via `rehype-pretty-code`
  - External link controls (`target="_blank"`, `rel="noopener noreferrer"`)
  - Wiki links (`[[slug]]`) remain supported
  - Image path convention warning (`/assets/{slug}/...`)
- Post navigation
  - Adjacent posts (newer/older by `created_at desc`)
  - Related posts (`related` frontmatter first, then tag overlap fallback)
- SEO and crawlability
  - `generateMetadata` for title/description/canonical/OG/Twitter
  - JSON-LD (`Article`) on post pages
  - `/sitemap.xml` and `/robots.txt` routes
- Search
  - `/search` page with query support (`/search?q=...`)
  - prebuilt search index at `content/index/search.json`
  - client-side lightweight scoring (`title:3`, `summary:2`, `tags/categories:2`)
- Diff export and safety
  - state file: `content/.export-state.json`
  - unchanged sources are skipped by hash
  - delete candidates are soft by default, applied only with `--force-delete`
  - mass delete guard: stop when candidates exceed `max(10, floor(total*0.2))`
- Quality reports
  - `content/reports/quality.json`
  - `content/reports/quality.md`
  - warning-focused checks (summary/cover/image path/delete candidates)

## Required environment variable

- `NEXT_PUBLIC_SITE_URL` (example: `https://example.com`)
  - Used for canonical URL, OG/Twitter URL/image, JSON-LD, sitemap, robots
  - If missing, app falls back to `http://localhost:3000` with warnings

## Routes

- `/`
- `/posts/{slug}`
- `/tags`
- `/tags/{tag}`
- `/categories`
- `/categories/{...path}`
- `/search`
- `/sitemap.xml`
- `/robots.txt`

## Repository layout

```text
my-blog/
  content/
    .export-state.json
    posts/
    index/
      posts.json
      tags.json
      categories.json
      search.json
    reports/
      quality.json
      quality.md
  public/
    assets/
    index/
      search.json
  scripts/
    export-from-vault.mjs
    build-index.mjs
  app/
    posts/[slug]/page.js
    search/page.js
    sitemap.xml/route.js
    robots.txt/route.js
  lib/
    markdown/render.js
    posts.js
    search/client.js
```

## Content model

### Required frontmatter

```yaml
---
title: "Post title"
slug: "unique-slug"
status: "published"
created_at: "YYYY-MM-DD"
tags: ["tag1", "tag2"]
categories: ["tech/web", "infra/aws"]
---
```

Notes:
- Legacy `date` is accepted by export script and normalized to `created_at`.
- `created_at` is used for ordering (`desc`) and adjacent links.

### Optional frontmatter

```yaml
updated_at: "YYYY-MM-DD"
summary: "short summary for list and metadata"
cover: "/assets/<slug>/cover.jpg"
related: ["other-slug-1", "other-slug-2"]
```

Notes:
- `cover` is used for OG/Twitter image and JSON-LD image.
- `related` preserves order and is resolved before tag-based fallback.

## Vault export pipeline (diff)

Source paths:
- `../my-vault/40_blog/published/` for markdown posts
- `../my-vault/50_assets/blog/` for public assets

Export rules:
- Only posts with `status: published` are exported.
- Destination:
  - posts -> `content/posts/`
  - assets -> `public/assets/`
- Optional frontmatter such as `cover` and `related` is preserved.
- Export state is stored in `content/.export-state.json`.
- If source hash is unchanged, export is skipped.
- Removed sources become delete candidates (`pending_deletes`) by default.
- Use `--force-delete` to apply deletions to generated artifacts.

## Local commands

- `npm run export:vault` : alias of diff export
- `npm run export:diff` : diff export with state tracking
- `npm run export:diff -- --force-delete` : apply pending deletions
- `npm run index` : generate posts/tags/categories/search + quality reports
- `npm run build:search-index` : run index generator (same as `npm run index`)
- `npm run dev` : start local dev server
- `npm run build` : production build
- `npm run publish:check` : export + index + build in one command

## Publishing notes

- This repo should not read from vault at runtime.
- CI should build/deploy only from repository contents.
- Keep image paths in markdown under `/assets/{slug}/...` for consistency.
