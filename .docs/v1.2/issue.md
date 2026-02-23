# 📘 my-blog v1.1 実装仕様書（Codex向け・確定版）

## 1. 目的

* Vault（Obsidian）を唯一の執筆源にする
* 公開運用の安全性を上げる（frontmatter / index の検証）
* 読者体験を上げる（一覧カード化・投稿メタ表示・導線追加）
* app層のデータ参照を統一（`lib/posts.js` 経由）

非目的（v1.1ではやらない）

* SEO（metadata/sitemap/robots/JSON-LD）→ v1.2
* TOC/関連記事/前後記事 → v1.2
* 検索/差分export → v1.3

---

## 2. 全体構成（前提）

```
Vault → export-from-vault → content/
     → build-index        → content/index/*.json
     → Next.js (App)      → 静的配信
```

---

## 3. データモデル（frontmatter）

### 必須

* `title: string`
* `slug: string`
* `status: "published" | "draft" | "private"`（ただし公開対象は published のみ）
* `created_at: "YYYY-MM-DD"`
* `tags: string[]`
* `categories: string[] | string`（入力は両対応、内部は array 統一）

### 任意

* `updated_at: "YYYY-MM-DD"`
* `summary: string`

### 互換（旧記事対応）

* `date: "YYYY-MM-DD"` を許容し、export時に `created_at = date` へ変換する

---

## 4. 正規化ルール（export時に統一）

### slug

* 必須
* 正規表現：

  * `^[a-z0-9]+(?:-[a-z0-9]+)*$`
* 重複は error

### tags

* `trim → lower → uniq → sort`

### categories

* `trim → lower → uniq`
* `tech/web` のような path 形式を維持
* 入力が string の場合は array化（例：`"tech/web"` → `["tech/web"]`）

### 日付

* `created_at` 必須、`updated_at` 任意
* 形式は `YYYY-MM-DD`
* `updated_at` がある場合は `updated_at >= created_at` を推奨チェック（errorでもwarningでも良いが v1.1では **error推奨**）

---

## 5. 検証仕様

### 5.1 export-from-vault（公開境界の守護）

**目的**：不正な記事を公開物に混入させない

#### export対象

* `status === "published"` のみ

#### error（停止）

* 必須フィールド欠落（title/slug/status/created_at/tags/categories）
* slug形式不正
* created_at形式不正
* updated_at形式不正（存在する場合）
* updated_at < created_at
* slug重複

#### warning（継続）

* summary未入力
* `date` が存在（互換変換した旨を通知）
* categories が string だった（array化した旨を通知）

---

### 5.2 build-index（検証済みインデックス生成）

**目的**：`content/index/*.json` を「検証済みの真実」にする

#### error（停止）

* slug重複
* created_at/updated_at のパース不可
* （将来拡張）related 不存在は v1.1では未実装

#### warning

* summary未入力

---

## 6. 生成物（契約）

### content/index/posts.json（最低限）

各要素は以下の形：

```json
{
  "slug": "getting-started-static-blog",
  "title": "Next.js × S3で最小構成の静的ブログを作る",
  "created_at": "2026-02-21",
  "updated_at": null,
  "summary": "....",
  "tags": ["nextjs", "aws", "blog"],
  "categories": ["tech/web"]
}
```

ルール：

* `updated_at` は無い場合 `null`（またはフィールド省略でもOKだが **indexはnull推奨**）
* tags/categories は正規化済みであること

---

## 7. 読み取りAPI（lib/posts.js に統一）

### 提供関数（v1.1）

* `getAllPosts()`
* `getPostBySlug(slug)`
* `getAllTags()`
* `getAllCategories()`
* `getPostsByCategoryPath(path)`

### Post shape（返却）

* `slug, title, created_at, updated_at?, summary?, tags[], categories[]`

ルール：

* app層は `content/index/*.json` を直接読まない
* 全て `lib/posts.js` から取得する

---

## 8. UI要件（v1.1）

### 8.1 Home（投稿一覧カード化）

* 表示：title / created_at / updated_at? / summary? / tags / categories
* 並び順：`created_at desc`

### 8.2 投稿ページ

* 表示：

  * `Published: created_at`
  * `Updated: updated_at`（存在する場合のみ）
  * tags / categories（リンク）

### 8.3 categoriesページ

* `categories.json` 直読み禁止
* `lib/posts.js` 経由で表示

### 8.4 layout

* navに `/tags` と `/categories` への入口を追加

---

## 9. 公開前チェック（1コマンド）

`npm run publish:check` を用意し、以下を直列実行する：

1. export-from-vault
2. build-index
3. next build

成功＝公開可能

---

## 10. 実装対象ファイル

* `scripts/export-from-vault.mjs`
* `scripts/build-index.mjs`
* `lib/posts.js`
* `app/page.js`
* `app/posts/[slug]/page.js`
* `app/categories/[...path]/page.js`
* `app/layout.js`

---

## 11. v1.1 完了条件（DoD）

* 一覧がカード化され、必要メタ情報が出る
* 投稿ページに Published/Updated + tags/cats が出る
* categoriesページが lib 経由
* 不正frontmatterで export が止まる
* 不整合indexで build-index が止まる
* publish:check が成功すれば静的ビルドまで通る