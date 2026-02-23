## my-blog v1.1 テスト項目

## 1. 目的

v1.1 の以下を確認する。

* frontmatter 検証が export/build-index で正しく動く
* `date` 互換が維持される
* `content/index/*.json` が v1.1 形式で生成される
* `lib/posts.js` 経由で各ページが動作する
* UI 要件（一覧/投稿/タグ/カテゴリ/ナビ）が満たされる
* `publish:check` で公開前の通し確認ができる

---

## 2. 前提

* 作業ディレクトリ: `my-blog`
* Node.js / npm が利用可能
* `my-vault` が隣接ディレクトリに存在（`publish:check` 実行時）

---

## 3. 実施コマンド（基本）

```bash
npm run index
npm run build
npm run publish:check
```

補助確認（任意）:

```bash
npm run dev
```

---

## 4. テスト一覧

## 4.1 build-index 正常系

### T-INDEX-01: v1.1 形式の index が生成される

手順:

1. `npm run index` を実行
2. `content/index/posts.json` を確認

期待結果:

* コマンドが成功する
* `posts.json` の各要素に `created_at` がある
* `updated_at` が未設定記事で `null` になる
* `date` フィールドは出力されない
* `tags` は小文字・重複なし・昇順

### T-INDEX-02: 旧 `date` frontmatter の互換警告

手順:

1. `date` のみを持つ既存記事で `npm run index` を実行

期待結果:

* コマンドは成功する
* warning が出る（legacy `date` 検出）
* `created_at` に変換されて index 出力される

### T-INDEX-03: ソート順が `created_at desc`

手順:

1. `created_at` の異なる記事を複数用意
2. `npm run index`
3. `content/index/posts.json` の順序確認

期待結果:

* 新しい `created_at` の記事が先頭側に並ぶ

---

## 4.2 build-index 異常系

### T-INDEX-11: slug 重複で失敗

手順:

1. `content/posts/*.md` に同一 `slug` の記事を2件用意
2. `npm run index`

期待結果:

* コマンドが失敗する
* 重複 slug を示すエラーが表示される

### T-INDEX-12: `created_at` 不正フォーマットで失敗

例:

* `2026/02/21`
* `2026-2-21`
* `2026-13-01`

期待結果:

* `npm run index` が失敗する
* `created_at` 不正のエラーが表示される

### T-INDEX-13: `updated_at` 不正フォーマットで失敗（存在時のみ）

手順:

1. `updated_at: "invalid"` を持つ記事で `npm run index`

期待結果:

* コマンドが失敗する
* `updated_at` 不正のエラーが表示される

### T-INDEX-14: summary 未入力は warning（継続）

手順:

1. `summary` 未設定記事で `npm run index`

期待結果:

* コマンドは成功する
* warning が表示される

---

## 4.3 export-from-vault 正常系

### T-EXPORT-01: `date` -> `created_at` 変換して export

手順:

1. Vault 側の記事に legacy `date` を設定
2. `npm run export:vault`
3. `content/posts/<slug>.md` を確認

期待結果:

* コマンドが成功する
* 出力 Markdown frontmatter が `created_at` を持つ
* `date` 互換 warning が出る

### T-EXPORT-02: tags/categories 正規化

入力例:

* `tags: [" NextJS ", "blog", "nextjs"]`
* `categories: " Tech/Web "`

期待結果:

* export 後に `tags: ["blog", "nextjs"]`
* export 後に `categories: ["tech/web"]`

---

## 4.4 export-from-vault 異常系

### T-EXPORT-11: 必須項目欠落で失敗

対象:

* `title`
* `slug`
* `status`
* `created_at`（または legacy `date`）
* `tags`
* `categories`

期待結果:

* `npm run export:vault` が失敗する

### T-EXPORT-12: slug 形式不正で失敗

不正例:

* `Hello-World`
* `my_post`
* `foo--bar`

期待結果:

* `npm run export:vault` が失敗する

### T-EXPORT-13: slug 重複で失敗

期待結果:

* `npm run export:vault` が失敗する
* 重複ファイル情報が出る

### T-EXPORT-14: summary 未入力は warning（継続）

期待結果:

* `npm run export:vault` は成功する
* warning が表示される

---

## 4.5 lib/posts.js（単一API）テスト

### T-LIB-01: `getAllPosts()` が v1.1 index を返す

確認観点:

* `created_at` が存在
* `updated_at` が `null` または文字列
* `date` 依存がない
* `created_at desc` 順

### T-LIB-02: `getPostBySlug(slug)` が本文 + メタを返す

確認観点:

* `content` を返す
* frontmatter が `created_at` に正規化される（legacy `date` 互換）

### T-LIB-03: `getPostsByTag(tag)` / `getPostsByCategoryPath(path)`

確認観点:

* 対象 slug のみ返る
* 存在しないキーで空配列

### T-LIB-04: app 層が index を直接読まない（コードレビュー）

確認方法:

```bash
rg "content/index|fs\\.readFileSync\\(.+index" app
```

期待結果:

* `app/*` で `content/index/*.json` 直接参照がない

---

## 4.6 UI/ページ表示テスト（手動）

### T-UI-01: Home（`/`）

確認観点:

* 記事一覧がカード表示
* `title`, `Published`, `Updated(任意)`, `summary`, tags, categories が表示される
* 並び順が `created_at desc`
* tags/categories のリンクが遷移できる

### T-UI-02: 投稿ページ（`/posts/[slug]`）

確認観点:

* タイトル表示
* `Published` 表示
* `Updated` は存在時のみ表示
* tags/categories リンク表示
* 本文 HTML が描画される

### T-UI-03: タグ一覧（`/tags`）

確認観点:

* 全タグ一覧が表示される
* 件数バッジが表示される
* 各タグページへ遷移できる

### T-UI-04: タグ詳細（`/tags/[tag]`）

確認観点:

* 該当タグの記事のみ表示
* 記事リンクで投稿ページへ遷移できる

### T-UI-05: カテゴリ一覧（`/categories`）

確認観点:

* 全カテゴリ一覧が表示される
* 件数バッジが表示される
* 各カテゴリページへ遷移できる

### T-UI-06: カテゴリ詳細（`/categories/[...path]`）

確認観点:

* path 形式（例: `tech/web`）のカテゴリが表示できる
* 該当カテゴリの記事のみ表示

### T-UI-07: ナビゲーション（layout）

確認観点:

* ヘッダに `Tags` / `Categories` リンクがある
* モバイル幅でレイアウト崩れがない

---

## 4.7 404/境界値テスト

### T-EDGE-01: 存在しない投稿 slug

* `/posts/not-found-slug` -> 404

### T-EDGE-02: 存在しないタグ

* `/tags/not-found-tag` -> 404

### T-EDGE-03: 存在しないカテゴリ

* `/categories/not/found` -> 404

### T-EDGE-04: 空カテゴリパス

* `/categories` は一覧ページ表示（404にならない）

---

## 4.8 通しテスト（公開前）

### T-E2E-01: `publish:check`

手順:

1. `npm run publish:check`

期待結果:

* `export:vault` 成功
* `index` 成功
* `build` 成功
* 失敗時は公開を止められる

---

## 5. 受け入れ判定（v1.1）

以下を満たせば v1.1 テスト完了とする。

* 正常系（export/index/build/UI）が通る
* 異常系で想定どおり停止/warning になる
* `lib/posts.js` 経由の参照に統一されている
* `npm run publish:check` が通る
