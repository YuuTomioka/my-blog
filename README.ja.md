# my-blog（日本語版）

Next.js App Router で構築した静的ブログです。

このリポジトリは公開境界として運用します。元のノートは `../my-vault` に保持し、`published` の記事だけを本リポジトリに export します。

## v1.3 の主な機能

- Markdown レンダリング強化
  - `h2/h3` の安定見出しID（ASCII slug / 非ASCIIは `h-<hash>`）
  - インライン TOC（`h2/h3` が2件未満なら非表示）
  - 見出しアンカーリンク（`#`）
  - `rehype-pretty-code` によるコードハイライト
  - 外部リンク制御（`target="_blank"`, `rel="noopener noreferrer"`）
  - wikiリンク（`[[slug]]`）互換維持
  - 画像パス規約 warning（`/assets/{slug}/...`）
- 回遊導線
  - 前後記事リンク（`created_at desc`）
  - 関連記事（`related` 優先、次にタグ重複）
- SEO / クローラ対応
  - `generateMetadata`（title/description/canonical/OG/Twitter）
  - JSON-LD（`Article`）
  - `/sitemap.xml` と `/robots.txt`
- 検索
  - `/search` ページ（`/search?q=...`）
  - 事前生成インデックス `content/index/search.json`
  - クライアント軽量スコアリング（`title:3`, `summary:2`, `tags/categories:2`）
- 差分 export と安全装置
  - 状態ファイル `content/.export-state.json`
  - hash一致時はスキップ
  - 削除候補はデフォルト soft（`--force-delete` でのみ削除）
  - 大量削除ガード: `max(10, floor(total*0.2))` 超過で停止
- 品質レポート
  - `content/reports/quality.json`
  - `content/reports/quality.md`
  - warning中心（summary/cover/画像パス/削除候補）

## 必須環境変数

- `NEXT_PUBLIC_SITE_URL`（例: `https://example.com`）
  - canonical、OG/Twitter、JSON-LD、sitemap、robots に使用
  - 未設定時は `http://localhost:3000` にフォールバック（warning 出力）

## ルート

- `/`
- `/posts/{slug}`
- `/tags`
- `/tags/{tag}`
- `/categories`
- `/categories/{...path}`
- `/search`
- `/sitemap.xml`
- `/robots.txt`

## リポジトリ構成

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

## コンテンツモデル

### 必須 frontmatter

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

補足:
- legacy `date` は export 時に `created_at` へ変換されます。
- 並び順と前後記事判定は `created_at desc` 固定です。

### optional frontmatter

```yaml
updated_at: "YYYY-MM-DD"
summary: "一覧・メタ用の要約"
cover: "/assets/<slug>/cover.jpg"
related: ["other-slug-1", "other-slug-2"]
```

補足:
- `cover` は OG/Twitter image と JSON-LD image に使用します。
- `related` は指定順を維持して優先解決します。

## Vault export パイプライン（差分）

入力元:
- `../my-vault/40_blog/published/`（Markdown 記事）
- `../my-vault/50_assets/blog/`（公開アセット）

ルール:
- `status: published` の記事のみ export
- 出力先
  - posts -> `content/posts/`
  - assets -> `public/assets/`
- `cover` / `related` など optional frontmatter は保持
- `content/.export-state.json` で差分状態を管理
- source hash が同じならスキップ
- 削除候補は `pending_deletes` に保持（デフォルトは削除しない）
- `--force-delete` 指定時のみ成果物削除を適用

## ローカルコマンド

- `npm run export:vault` : 差分 export のエイリアス
- `npm run export:diff` : state 管理付き差分 export
- `npm run export:diff -- --force-delete` : pending 削除を実行
- `npm run index` : posts/tags/categories/search + quality を生成
- `npm run build:search-index` : index 生成（`npm run index` と同等）
- `npm run dev` : 開発サーバ起動
- `npm run build` : 本番ビルド
- `npm run publish:check` : export + index + build の通し確認

## 運用メモ

- 実行時に vault を直接参照しない（生成済み成果物のみを利用）
- CI はリポジトリ内成果物だけで build/deploy を行う
- Markdown 内画像パスは `/assets/{slug}/...` を推奨
