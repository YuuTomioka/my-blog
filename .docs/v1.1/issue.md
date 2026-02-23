# 📘 my-blog v1.1 実装仕様書（Codex向け）

## 1. 目的

本アップデートは以下を達成する：

* 公開運用の安全性を高める（検証導入）
* 読者体験を改善する（一覧/投稿UI）
* データ参照を統一する（lib層集約）

---

## 2. 前提アーキテクチャ

```
Vault (Obsidian)
  ↓ export
content/
  ↓ build-index
content/index/*.json
  ↓
Next.js (App Router)
```

* Markdownが唯一のデータソース
* Next.jsは静的生成のみ
* DB / CMS は使用しない

👉 Markdownベースの静的ブログは高速・シンプルで管理しやすい構成を維持する

---

## 3. スコープ（v1.1）

### 含む

* lib/posts.js の統一
* 投稿一覧UI改善
* 投稿ページメタ表示
* frontmatter検証（export）
* index検証（build-index）
* publishチェックコマンド

### 含まない

* SEO（v1.2）
* 目次/関連記事（v1.2）
* 検索（v1.3）

---

## 4. データモデル（確定仕様）

### Frontmatter（Markdown）

```yaml
---
title: string                # 必須
slug: string                 # 必須
status: "published"         # 必須

created_at: "YYYY-MM-DD"    # 必須
updated_at: "YYYY-MM-DD"    # 任意

tags: string[]              # 必須
categories: string[] | string # 必須

summary: string             # 任意
---
```

---

### 正規化ルール（export時）

#### slug

* 小文字英数 + ハイフンのみ
* 正規表現：

  ```
  ^[a-z0-9]+(?:-[a-z0-9]+)*$
  ```

#### tags

```
trim → lower → uniq → sort
```

#### categories

```
trim → lower → uniq
```

* path形式維持（例：`tech/web`）

#### categories 入力

* string or array 許可
* export時に arrayへ統一

---

### 日付ルール

* フォーマット：`YYYY-MM-DD`
* ソート：`created_at desc 固定`
* `updated_at` は表示のみ

---

### 互換対応（重要）

旧フォーマット：

```yaml
date: "2026-02-21"
```

変換ルール：

```
created_at = date
updated_at = undefined
```

---

## 5. 検証仕様

### export-from-vault.mjs

#### error（停止）

* 必須フィールド欠落
* slug形式不正
* created_at形式不正
* slug重複

#### warning（継続）

* summary未入力
* dateが存在（互換変換する）

---

### build-index.mjs

#### error（停止）

* slug重複
* created_at パース不可
* updated_at パース不可（存在する場合）

#### warning

* summary未入力

---

## 6. indexデータ構造

### content/index/posts.json

```json
[
  {
    "slug": "example-post",
    "title": "Example",
    "created_at": "2026-02-21",
    "updated_at": null,
    "summary": "text",
    "tags": ["nextjs"],
    "categories": ["tech/web"]
  }
]
```

👉 このファイルは「検証済みデータ」として扱う
* `updated_at` は index では `null` を許可（lib層で `undefined` に正規化してもよい）

---

## 7. lib/posts.js（単一データAPI）

### 提供関数

```js
getAllPosts()
getPostBySlug(slug)
getAllTags()
getAllCategories()
getPostsByTag(tag)
getPostsByCategoryPath(path)
```

---

### Post型

```ts
type Post = {
  slug: string
  title: string
  created_at: string
  updated_at?: string | null
  summary?: string
  tags: string[]
  categories: string[]
}
```

---

### ルール

* app層は index.json を直接読まない
* 必ず lib/posts.js 経由

---

## 8. UI要件

### 8.1 投稿一覧（Home）

表示項目：

* title
* created_at
* updated_at（あれば）
* summary（あれば）
* tags（リンク）
* categories（リンク）

#### 並び順

```
created_at desc
```

---

### 8.2 投稿ページ

表示：

```
Published: 2026-02-21
Updated: 2026-02-22（存在する場合のみ）
```

* tags / categories（リンク）

---

### 8.3 ナビゲーション

layoutに追加：

* `/tags`
* `/categories`

※ 上記リンク先の一覧ページ（`/tags`, `/categories`）も v1.1 の実装対象とする

---

## 9. コマンド

### publishチェック

```bash
npm run publish:check
```

中身：

```
npm run export:vault
→ npm run index
→ npm run build
```

---

## 10. 実装対象ファイル

### scripts

* `scripts/export-from-vault.mjs`
* `scripts/build-index.mjs`

### package

* `package.json`（`publish:check` 追加）

### lib

* `lib/posts.js`

### app

* `app/page.js`
* `app/posts/[slug]/page.js`
* `app/tags/page.js`
* `app/tags/[tag]/page.js`
* `app/categories/page.js`
* `app/categories/[...path]/page.js`
* `app/layout.js`

---

## 11. 完了条件（Definition of Done）

* 一覧がカードUIで表示される
* 投稿ページに tags/categories/updated が表示される
* tagsページが lib 経由で動く
* categoriesページが lib 経由で動く
* `/tags` `/categories` ナビゲーションが有効
* frontmatter不正で export が失敗する
* index不正で build が失敗する
* `publish:check` が成功すれば公開可能

---

## 12. 設計思想（重要）

* Markdown = 真実
* content/index = 検証済みデータ
* lib = 読み取りAPI
* app = 表示のみ

👉 この分離により、拡張（SEO/検索/差分更新）が容易になる
