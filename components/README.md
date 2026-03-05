# Components Guide (`components/`)

This document defines how `components/` should be used in `my-blog`.

Current project status:
- Runtime: Next.js App Router (`app/`)
- Data layer: `lib/` + prebuilt JSON under `content/index/`
- Styling: global CSS in `app/globals.css` (no Tailwind setup yet)

## Purpose

- Keep page files in `app/` small and compositional
- Separate UI rendering from data loading and indexing logic
- Make future UI redesigns (v2.x) safe and incremental

## Directory policy

Planned structure:

```text
components/
  plus/   # Source library (reference-only originals)
  blog/   # Post/list/search related presentational components
  ui/     # Shared layout and primitive UI components
```

Notes:
- `components/plus/` stores imported originals for reference.
- Production routes should import from `blog/` and `ui/`, not directly from `plus/`.
- Copy/adapt from `plus/` into `blog/` or `ui/` for project-ready usage.

## Responsibilities

`components/blog/*`
- Blog-domain UI only (post cards, metadata blocks, list sections, search result blocks)
- Receives data via props
- Must not fetch from files or APIs directly

`components/plus/*`
- Original reference components (source snapshots)
- Keep as close to original as practical
- Do not couple these files with project data/loading logic

`components/ui/*`
- Cross-page shared UI (container, section shell, badges, empty states, etc.)
- No blog-specific assumptions unless explicitly documented

`app/*`
- Route-level orchestration
- Loads data through `lib/*`
- Passes normalized props to `components/*`

`lib/*`
- Data access and transformation (post loading, search scoring, normalization)
- No JSX rendering responsibilities

## Hard rules

- Do not read `content/` directly from `components/*`.
- Do not import `fs`, `path`, or build scripts from `components/*`.
- Do not embed indexing/export logic in React components.
- Keep components deterministic from props (no hidden global state).
- Keep accessibility defaults (`aria-*`, semantic heading order, keyboard focusable controls).
- Do not treat `plus/` as production runtime components.

## Styling rules (current)

- Reuse existing tokens/classes from `app/globals.css` first.
- Add new global classes only when reuse is impractical.
- Avoid introducing a new UI framework without a dedicated versioned issue.

## Implementation flow

1. Pick a base reference from `components/plus/*`.
2. Adapt it into `components/blog/*` or `components/ui/*`.
3. Define/use component boundary in `app/*` (what props are needed).
4. Keep data shaping in `lib/*` and pass minimal props.
5. Verify pages via `npm run dev`.
6. Validate build/index pipeline (`npm run index`, `npm run build`).

## Review checklist

- Is this component purely presentational?
- Are props typed/documented clearly (at least by naming and shape)?
- Is data already normalized before reaching the component?
- Does it reuse existing styles and semantic HTML?
- Does it avoid adding coupling to export/index scripts?
