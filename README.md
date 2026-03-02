# my-blog

Static blog built with Next.js App Router.

This repository is the public publishing boundary. Source notes live in `../my-vault`, and only `published` posts are exported into this repo.

## v1.2 highlights

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
- `/sitemap.xml`
- `/robots.txt`

## Repository layout

```text
my-blog/
  content/
    posts/
    index/
      posts.json
      tags.json
      categories.json
  public/
    assets/
  scripts/
    export-from-vault.mjs
    build-index.mjs
  app/
    posts/[slug]/page.js
    sitemap.xml/route.js
    robots.txt/route.js
  lib/
    markdown/render.js
    posts.js
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

## Vault export pipeline

Source paths:
- `../my-vault/40_blog/published/` for markdown posts
- `../my-vault/50_assets/blog/` for public assets

Export rules:
- Only posts with `status: published` are exported.
- Destination:
  - posts -> `content/posts/`
  - assets -> `public/assets/`
- Optional frontmatter such as `cover` and `related` is preserved.

## Local commands

- `npm run export:vault` : export published posts/assets from vault
- `npm run index` : generate `content/index/*.json`
- `npm run dev` : start local dev server
- `npm run build` : production build
- `npm run publish:check` : export + index + build in one command

## Publishing notes

- This repo should not read from vault at runtime.
- CI should build/deploy only from repository contents.
- Keep image paths in markdown under `/assets/{slug}/...` for consistency.
