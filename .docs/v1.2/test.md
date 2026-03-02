## my-blog v1.2 テスト項目

## 1. 目的

v1.2 の以下を確認する。

* Markdown レンダリング基盤強化（見出しID / TOC / コードハイライト / 外部リンク属性 / wikiリンク互換）
* 投稿ページの回遊機能（前後記事 / 関連記事）
* SEO 基本（`generateMetadata` / JSON-LD / sitemap / robots）
* optional frontmatter（`related`, `cover`）が export で保持される
* 画像パス規約 warning が動作する（ビルド停止しない）

---

## 2. 前提

* v1.1 が通っていること
* 作業ディレクトリ: `my-blog`
* `NEXT_PUBLIC_SITE_URL` を設定できること（未設定時 fallback 挙動も確認対象）
* v1.2 で導入する依存がインストール済みであること（例: `rehype-pretty-code`, `shiki`, `github-slugger`）

---

## 3. 基本コマンド

```bash
npm run index
npm run build
npm run publish:check
npm run dev
```

補助確認:

```bash
curl -s http://localhost:3000/sitemap.xml
curl -s http://localhost:3000/robots.txt
rg "content/index|fs\\.readFileSync\\(.+index" app
```

---

## 4. テスト一覧

## 4.1 Markdownレンダリング基盤（Issue 1）

### T-MD-01: wikiリンク互換（回帰防止）

手順:

1. 本文に `[[publishing-boundary]]` を含む記事を表示
2. レンダリングHTMLを確認（画面 or HTMLソース）

期待結果:

* `/posts/publishing-boundary/` へのリンクに変換される
* v1.1 時点の挙動から回帰しない

### T-MD-02: TOC抽出（h2/h3のみ）

手順:

1. `h2`, `h3`, `h4` を含む記事を表示
2. TOC を確認

期待結果:

* TOC に `h2`, `h3` のみ表示される
* `h4` は TOC 対象外

### T-MD-03: TOC表示条件（見出し2件未満で非表示）

手順:

1. `h2/h3` が 0〜1 件の記事を表示

期待結果:

* TOC が表示されない

### T-MD-04: 見出しIDの安定生成（ASCII）

例:

* `## Introduction`
* `## Setup`
* `## Setup`

期待結果:

* `introduction`, `setup`, `setup-2` のように安定した ID
* TOC の `id` と見出し `id` が一致する

### T-MD-05: 見出しIDの安定生成（非ASCII）

例:

* `## Next.js を始める`

期待結果:

* `h-xxxxxx` 形式の ID が付与される
* 再ビルドしても同一テキストなら同じ ID

### T-MD-06: 見出しアンカーリンク

期待結果:

* `h2/h3` に `#` アンカーリンクがある
* クリックで URL に `#id` が付く
* 直接アクセス時に該当位置へ移動できる

### T-MD-07: コードハイライト（fenced code block）

手順:

1. ```js などの fenced code block を含む記事を表示

期待結果:

* コードブロックにハイライト用の HTML/CSS class が付く
* プレーンテキスト崩れがない

### T-MD-08: 外部リンク属性付与

データ例:

* 外部: `https://example.org/...`
* 自サイト絶対URL: `${NEXT_PUBLIC_SITE_URL}/posts/...`
* `mailto:foo@example.com`

期待結果:

* 外部リンクに `target="_blank"` + `rel="noopener noreferrer"`
* 自サイト絶対URLには `target="_blank"` が付かない
* `mailto:` には `target="_blank"` が付かない

### T-MD-09: 画像パス規約 warning（`/assets/{slug}/...`）

手順:

1. 記事本文に規約外画像パス（例: `/images/foo.png`）を含める
2. 投稿ページ描画ログを確認

期待結果:

* warning が出る
* ページ表示/ビルドは継続する

---

## 4.2 export / frontmatter（v1.2追加項目）

### T-EXPORT-21: optional frontmatter `related`, `cover` を保持

手順:

1. Vault 側記事に `related`, `cover` を追加
2. `npm run export:vault`
3. `content/posts/<slug>.md` を確認

期待結果:

* `related` / `cover` が export 後 frontmatter に残る
* 必須項目正規化（`created_at`, tags, categories）は従来通り動く

### T-EXPORT-22: 既存 warning/error 挙動を壊さない

期待結果:

* v1.1 の `summary` warning / slug/date 検証が引き続き機能する

---

## 4.3 posts API拡張（Issue 4/5）

### T-LIB-21: `getAdjacentPosts(slug)`

確認観点:

* `created_at desc` 順で前後が決まる
* 先頭記事は `next` のみ（または仕様どおり片側のみ）
* 末尾記事は `previous` のみ
* 存在しない slug では両方 `null`（または仕様どおり）

### T-LIB-22: `getRelatedPosts(post, limit=3)`（related優先）

手順:

1. `related` を指定した記事で実行

期待結果:

* 指定順が維持される
* 自分自身が除外される
* 最大 3 件

### T-LIB-23: `getRelatedPosts(post, limit=3)`（fallback: 同タグ）

手順:

1. `related` 未指定記事で実行

期待結果:

* 同タグ記事が返る
* 共通タグ数の多い順
* 同点時の並びは仕様どおり（要明文化なら追記）

### T-LIB-24: `related` に存在しない slug を含む場合

期待結果:

* warning が出る
* 表示対象からは無視される
* 処理は継続する

---

## 4.4 投稿ページUI（Issue 2〜7）

### T-POST-21: TOC表示（インライン）

確認観点:

* TOC が記事冒頭付近に表示される
* `h3` がインデント等で区別される（見た目は実装都合で可）

### T-POST-22: 前後記事リンク

確認観点:

* Next / Previous の表示が `created_at desc` と一致
* 端の投稿で片側のみ表示

### T-POST-23: 関連記事表示

確認観点:

* 最大3件
* 自記事を含まない
* `related` 指定時は指定順優先

### T-POST-24: `generateMetadata`

確認方法:

* ページHTMLソースを確認（`<head>`）

期待結果:

* `title`
* `description`（`summary` or excerpt）
* canonical
* OG/Twitter メタ
* `cover` あり時のみ image メタ

### T-POST-25: JSON-LD（Article）

確認方法:

* ページHTML内の `<script type="application/ld+json">` を確認

期待結果:

* `@type: Article`
* `headline`, `datePublished`, `description`, `mainEntityOfPage`
* `updated_at` がある場合のみ `dateModified`
* `cover` がある場合のみ `image`

---

## 4.5 sitemap / robots（Issue 8/9）

### T-SEO-21: `sitemap.xml` 生成

手順:

1. `npm run build`
2. 開発/本番環境で `/sitemap.xml` を取得

期待結果:

* 取得できる
* `/`, `/posts/[slug]`, `/tags`, `/tags/[tag]`, `/categories`, `/categories/[...path]` の実在ページが含まれる
* `lastmod = updated_at ?? created_at`

### T-SEO-22: `robots.txt` 生成

手順:

1. `/robots.txt` を取得

期待結果:

* 取得できる
* `Sitemap: <SITE_URL>/sitemap.xml` を含む

### T-SEO-23: `NEXT_PUBLIC_SITE_URL` 未設定時のfallback

手順:

1. `NEXT_PUBLIC_SITE_URL` 未設定で `npm run build`
2. metadata route / 投稿 metadata を確認

期待結果:

* ビルドが落ちない（仕様どおり fallback）
* warning が出るなら内容が分かりやすい

---

## 4.6 回帰テスト（v1.1 維持）

### T-REG-21: v1.1 の一覧/タグ/カテゴリページが引き続き表示される

対象:

* `/`
* `/tags`
* `/tags/[tag]`
* `/categories`
* `/categories/[...path]`

期待結果:

* 既存ページが 500 にならない
* リンク遷移ができる

### T-REG-22: `publish:check` 通し成功

期待結果:

* `export:vault` → `index` → `build` が成功する

### T-REG-23: app 層の index 直接参照なし

確認方法:

```bash
rg "content/index|fs\\.readFileSync\\(.+index" app
```

期待結果:

* `app/*` で index JSON 直接参照がない

---

## 5. 実施優先度（推奨）

1. `T-REG-22` / `T-SEO-21` / `T-SEO-22`（通しと公開物）
2. `T-MD-01`〜`T-MD-08`（Markdown基盤）
3. `T-LIB-21`〜`T-LIB-24`（ロジック）
4. `T-POST-21`〜`T-POST-25`（投稿ページUX/SEO）
5. `T-MD-09`, `T-SEO-23`（warning / fallback）

---

## 6. 受け入れ判定（v1.2）

以下を満たせば v1.2 テスト完了とする。

* Markdown基盤機能（TOC/見出しID/アンカー/コード/外部リンク）が期待どおり
* 投稿ページに TOC/前後/関連記事/SEOメタ/JSON-LD が出る
* `sitemap.xml` / `robots.txt` が公開物として成立
* v1.1 機能が回帰していない（特に wikiリンク・一覧導線・publish:check）
