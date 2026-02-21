# my-blog

Static blog built with Next.js (App Router) and exported as fully static assets.
Deployed to AWS S3 + CloudFront (OAC) and served via a custom domain (Route53 + ACM).

This repo is the **public/blog delivery repo**.
Source notes and knowledge stay in a separate local vault (`../my-vault`).
Only **published** blog posts are exported from the vault into this repo.

---

## Goals (v1)

- Minimal-cost static blog hosting
- Content source is Markdown (no MDX)
- Navigation via tags/categories (no DB)
- Safe publishing boundary:
  - Vault may contain private notes
  - Only `published` posts are exported into this repo
- Automated deploy to S3 + CloudFront on push

---

## Architecture

### Hosting
- **S3 (private)**: stores static export output (`out/`)
- **CloudFront + OAC**: CDN + secure origin access
- **Custom Domain**: Route53 + ACM certificate (must be in `us-east-1` for CloudFront)

### Rendering
- Markdown -> HTML using remark/rehype (no MDX)

### Data model
- Posts are Markdown files with YAML frontmatter
- Index JSON files are generated at build time for:
  - posts list
  - tags map
  - categories map

No database.

---

## Routes

- Home: `/`
- Post: `/posts/{slug}`
- Tag: `/tags/{tag}`
- Category: `/categories/{...path}`
  - category uses path syntax in frontmatter, e.g. `"tech/web"`
  - URL becomes `/categories/tech/web`

---

## Repository layout (v1)

my-blog/
- content/
  - posts/                     # exported markdown posts
  - index/
    - posts.json               # list of posts
    - tags.json                # tag -> [slug]
    - categories.json          # categoryPath -> [slug]
- public/
  - assets/                    # public images copied from vault (optional)
- scripts/
  - export-from-vault.mjs      # export published posts/assets from ../my-vault
  - build-index.mjs            # generate content/index/*.json
- app/                         # Next.js App Router pages
- lib/
  - markdown/                  # markdown render utilities
- out/                         # Next.js static export output (generated)
- .github/workflows/deploy.yml # CI deploy to S3/CloudFront

---

## Content model

### Markdown frontmatter (required)

Each post file under `content/posts/{slug}.md` must contain:

```yaml
---
title: "..."
slug: "unique-slug"
date: "YYYY-MM-DD"
status: "published"   # only published is exported
tags: ["tag1", "tag2"]
categories: ["tech/web", "infra/aws"]
---
```

### Optional fields

```yaml
updated: "YYYY-MM-DD"
summary: "short summary for list pages"
series: "series-name"
series_order: 1
related: ["other-slug-1", "other-slug-2"]
```

---

## Vault export pipeline (publishing boundary)

Source vault is expected at:

* `../my-vault/40_blog/published/` (markdown posts)
* `../my-vault/50_assets/blog/` (public assets, optional)

Export rules:

* Only markdown posts with `status: published` are imported.
* Export destination:

  * posts -> `content/posts/`
  * assets -> `public/assets/`

This repo should **never** read directly from vault at runtime.
Everything needed for deploy must exist inside this repo after export.

---

## Local commands (v1)

### 1) Export from vault

* Reads from `../my-vault`
* Writes into `content/` and `public/assets`

Command:

* `node scripts/export-from-vault.mjs`

### 2) Build index JSON

Command:

* `node scripts/build-index.mjs`

### 3) Dev

Command:

* `npm run dev`

### 4) Static build/export

Command:

* `npm run build`
* `npm run export` (or included in build step depending on config)

---

## Deployment (GitHub Actions)

On push to `main`:

1. install deps
2. export-from-vault (optional in CI; can be local-only depending on workflow choice)
3. build-index
4. next build + export -> `out/`
5. `aws s3 sync out/ s3://<BUCKET>/`
6. CloudFront invalidation (optional but recommended)

### Publishing policy (IMPORTANT)
This repo only contains public artifacts.
Vault export is performed locally and committed into this repo.

CI must NOT access the vault.
GitHub Actions performs only:
- build (static export)
- deploy to S3 + CloudFront

---

## AWS setup checklist (summary)

* S3 bucket for site output (private)
* CloudFront distribution with OAC to S3
* Route53 hosted zone for domain
* ACM certificate in `us-east-1` attached to CloudFront
* GitHub Actions IAM permissions:

  * s3:PutObject, s3:DeleteObject, s3:ListBucket (on the bucket)
  * cloudfront:CreateInvalidation (on the distribution)

---

## Non-goals (v1)

* CMS / admin UI
* Full-text search
* Comments
* SSR/ISR
* Database

---

## Notes

* Categories must be consistent with vault `_meta/categories.md` vocabulary.
* Tags should be consistent with vault `_meta/tags.md` vocabulary.
* Use Tailwind.