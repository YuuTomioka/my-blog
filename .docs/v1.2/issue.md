# 📘 my-blog v1.2 実装仕様書（Codex向け）

## 1. 目的

v1.2 は v1.1 の土台（検証済み `content/index` と `lib/posts.js`）の上に、以下を追加して **ブログとしての完成度** を上げる：

* 回遊性：TOC / 見出しアンカー / 前後記事 / 関連記事
* SEO：Metadata / sitemap / robots / JSON-LD
* Markdown品質：見出しID安定化 / コードハイライト / 外部リンク属性制御 / 画像パス規約（warning）
* 既存互換：wikiリンク（`[[slug]]`）の挙動を維持

---

## 2. 前提（v1.1で成立しているもの）

* `content/index/*.json` は検証済みインデックス
* `lib/posts.js` が app 層の唯一の読み取りAPI
* Post は `created_at` 必須 / `updated_at` optional
* 並び順は `created_at desc` 固定

---

## 3. スコープ（v1.2）

### 含む

* TOC（h2/h3）生成と表示
* 見出しアンカーリンク
* 前後記事リンク（created_at順）
* 関連記事（related優先 → 同タグfallback）
* `generateMetadata`（OG/Twitter/Canonical含む）
* `sitemap.xml` / `robots.txt`
* JSON-LD（Article）
* Markdownレンダリング強化（見出しID/コードハイライト/外部リンク属性）
* export時の optional frontmatter 保持（`related`, `cover`）

### 含まない（v1.3以降）

* 検索
* 差分export
* コンテンツ品質レポートの本格化（v1.2ではwarning程度）

---

## 4. 仕様（確定）

## 4.1 TOC（目次）

* 対象見出し：`h2`, `h3` のみ
* 表示：**記事冒頭インライン**
* 表示条件：見出しが **2つ未満なら非表示**
* クリックで該当見出しへ遷移（`#heading-id`）

TOCデータ構造（例）：

```json
[
  { "id": "intro", "text": "Intro", "depth": 2 },
  { "id": "h-3a2f9c", "text": "日本語見出し", "depth": 2 },
  { "id": "setup", "text": "Setup", "depth": 3 }
]
```

---

## 4.2 見出しID（アンカー）の生成ルール（最重要）

目的：TOC/アンカーが **再ビルドや編集で壊れにくい** こと。

### 対象

* `h2`, `h3`（v1.2ではここに限定）
* `h1` はページタイトル相当のため対象外でもOK（実装簡略化）

### 生成ルール（固定）

1. 見出しテキストを取得（記号は除去して良い）
2. **ASCII英数中心**なら通常slugify（`hello-world`）
3. **非ASCII（日本語など）を含む**場合は `h-<short-hash>` を使う

   * short-hash は見出しテキストから生成（例：sha1→先頭6-8桁）
4. 同一IDが発生した場合は `-2`, `-3`…でユニーク化

例：

* `Introduction` → `introduction`
* `Next.js を始める` → `h-3a2f9c`
* `Setup` が2回 → `setup`, `setup-2`

---

## 4.3 コードハイライト

* 方針：**rehype-pretty-code**（Shiki系）を採用
* テーマ：1つ固定（v1.2では切替しない）
* 対象：Markdownの fenced code blocks
* 既存の wikiリンク変換（`[[slug]]` → `/posts/{slug}/`）は維持する（回帰禁止）

---

## 4.4 外部リンク属性制御

* 外部判定：

  * `http/https` かつ **ホストが自サイト以外** → 外部
  * 自サイトの絶対URLは内部扱い
* 外部リンクに付与：

  * `target="_blank"`
  * `rel="noopener noreferrer"`
* `mailto:` は `target` を付与しない（relは付与しても良い）

※自サイト判定のため `NEXT_PUBLIC_SITE_URL` を使用する

---

## 4.5 前後記事リンク（Adjacent）

* 基準：`created_at desc` の並びと一致
* 表示：

  * Next（新しい記事） / Previous（古い記事）
  * 端は片方のみ

---

## 4.6 関連記事

前提となる optional frontmatter:

* `related?: string[]`（slug配列）

* 優先順位：

  1. frontmatter `related`（指定順を尊重）
  2. fallback：同タグ（共通タグ数が多い順）
* limit：3件
* 自分自身は除外
* 存在しない slug が `related` に含まれる場合は warning（表示時は無視）

---

## 4.7 Metadata（SEO基本）

`generateMetadata` で以下を生成する。

### description

* `summary` があればそれ
* 無ければ本文先頭から自動生成（N文字、例: 140）

### canonical

* `NEXT_PUBLIC_SITE_URL` + `pathname`

### OG/Twitter

* `title`, `description`, `url(canonical)` を含める
* frontmatter `cover?: string` があれば og:image/twitter:image として使う
* cover無ければ image は省略でOK

---

## 4.8 sitemap.xml

* 対象：

  * `/`
  * `/posts/[slug]`（publishedのみ）
  * `/tags` と `/tags/[tag]`（実装済み前提。未なら対象は実在ページのみ）
  * `/categories` と `/categories/[...path]`（同上）
* lastmod：

  * `updated_at ?? created_at`

---

## 4.9 robots.txt

* **Next.js Metadata Route（`app/robots.js`）を優先**（`NEXT_PUBLIC_SITE_URL` を使えるため）
* `Sitemap: {NEXT_PUBLIC_SITE_URL}/sitemap.xml` を含める

---

## 4.10 JSON-LD（Article）

投稿ページに `<script type="application/ld+json">`

最低限：

* `@type: Article`
* `headline`
* `datePublished`（created_at）
* `dateModified`（updated_at があれば）
* `description`
* `mainEntityOfPage`（canonical）
* `author` / `publisher` は固定文字列でOK
* `image` は cover があれば

---

## 4.11 画像パス規約（v1.2はwarningのみ）

* 推奨：`/assets/{slug}/...`（現行 export が `public/assets` に出力するため）
* Markdown内の画像パスが規約外なら warning（ビルドは落とさない）

---

## 5. 必須環境変数

* `NEXT_PUBLIC_SITE_URL`（例：`https://example.com`）

  * canonical / sitemap / JSON-LD に使用
  * ローカル開発時は未設定でも動作させ、`http://localhost:3000` をfallbackにしてよい（warning推奨）

---

## 6. 実装対象ファイル

### Markdownレンダリング

* `lib/markdown/render.js`（plugin導入、見出しID、TOC、外部リンク、コードハイライト）
  * 既存 wikiリンク変換の移植/維持を含む

### export（optional frontmatter保持）

* `scripts/export-from-vault.mjs`

  * `related`, `cover` など v1.2 optional frontmatter を削除しない

### posts API拡張

* `lib/posts.js`

  * `getAdjacentPosts(slug)`
  * `getRelatedPosts(post, limit=3)`

### ページ（UI/SEO）

* `app/posts/[slug]/page.js`

  * TOC表示
  * 前後リンク
  * 関連記事
  * `generateMetadata`
  * JSON-LD挿入

### sitemap/robots

* `app/sitemap.js`（推奨。Next.js metadata route）
* `app/robots.js`（推奨。Next.js metadata route）

---

## 7. 完了条件（Definition of Done）

* 投稿ページに TOC（条件付き）/ 見出しアンカー がある
* 投稿ページに 前後記事 / 関連記事（最大3）がある
* `generateMetadata` が title/description/og/twitter/canonical を出す
* `sitemap.xml` が生成され、公開記事が含まれる
* `robots.txt` が存在し sitemap URL を含む
* JSON-LD（Article）が出力される
* Markdownのコードブロックがハイライトされる
* 外部リンクに target/rel が付く（自サイトは除外）
* 既存 wikiリンク（`[[slug]]`）が回帰しない
* `related` / `cover` frontmatter が export で消えない

---

# 8. v1.2 Issueテンプレ（GitHubコピペ用）

## Issue 1: Markdownレンダリング基盤を拡張（見出しID/TOC/コード/外部リンク）

**目的**
v1.2全機能の土台を `lib/markdown/render.js` に集約。

**作業**

* 見出しID生成（ASCII=slugify、非ASCII=hash、重複suffix）
* TOC抽出（h2/h3、2件未満は空）
* コードハイライト（rehype-pretty-code）
* 外部リンク属性付与（自サイト判定は `NEXT_PUBLIC_SITE_URL`）
* 既存 wikiリンク変換を維持（回帰禁止）

**DoD**

* 見出しIDが安定し、TOCと一致する
* code highlight が適用される
* 外部リンクに target/rel が付く

---

## Issue 2: 投稿ページにTOCを表示（インライン）

**目的**
可読性の向上。

**作業**

* `app/posts/[slug]/page.js` にTOC表示
* 見出しが2未満なら非表示

**DoD**

* TOCクリックで見出しに遷移する
* 条件付き表示が機能する

---

## Issue 3: 見出しアンカーリンクを追加

**目的**
共有性/引用性向上。

**作業**

* h2/h3 に `#` リンクを付与（hover or 常時表示は実装都合でOK）

**DoD**

* `#` クリックでURLが `#id` 付きになる
* 直接リンクで該当位置に飛べる

---

## Issue 4: 前後記事リンク（Adjacent）を実装

**目的**
記事回遊導線を追加。

**作業**

* `lib/posts.js`: `getAdjacentPosts(slug)`（created_at desc）
* 投稿ページに Next/Prev を表示

**DoD**

* 端は片側のみ表示
* created_at順と一致する

---

## Issue 5: 関連記事を実装（related優先→同タグfallback）

**目的**
回遊率向上。

**作業**

* `lib/posts.js`: `getRelatedPosts(post, limit=3)`
* related（指定順）→ tags overlap（共通数desc）
* 投稿ページに表示

**DoD**

* 最大3件表示
* 自分自身が混ざらない

---

## Issue 6: generateMetadata 実装（OG/Twitter/Canonical）

**目的**
SEO・共有対応の基本。

**作業**

* description：summary or 本文冒頭N文字
* canonical：`NEXT_PUBLIC_SITE_URL` + pathname
* og/twitter：title/description/url (+coverがあればimage)

**DoD**

* ページHTMLにmetaが出る
* coverがある時だけimageが出る

---

## Issue 7: JSON-LD（Article）を追加

**目的**
構造化データ対応。

**作業**

* 投稿ページに Article JSON-LD
* datePublished/Modified、headline、description、canonical、author/publisher固定

**DoD**

* JSON-LD script が出力される
* created_at/updated_at が反映される

---

## Issue 8: sitemap.xml を生成

**目的**
クロール最適化。

**作業**

* home + posts + tags/categories（実在ページのみ）
* lastmod = updated_at ?? created_at

**DoD**

* sitemap.xml が取得できる
* 公開記事が含まれる

---

## Issue 9: robots.txt を追加

**目的**
クロール制御と sitemap 告知。

**作業**

* `app/robots.js`（metadata route）を作成
* sitemap URL を `NEXT_PUBLIC_SITE_URL` で記載（未設定時のfallback方針も実装）

**DoD**

* robots.txt が公開されている

---

## Issue 10: 画像パス規約のwarningを導入

**目的**
将来の画像最適化に向けた運用整備。

**作業**

* `/assets/{slug}/...` を推奨規約として README 追記
* Markdown内の画像パスが規約外なら warning（`/assets/{slug}/...` 推奨）

**DoD**

* 規約が明文化される
* 規約外がwarningになる（ビルドは落とさない）

---

## 9. 実装順（推奨）

1. Issue 1（Markdown基盤）
2. Issue 2/3（TOC/アンカー）
3. Issue 4/5（回遊）
4. Issue 6/7（SEOメタ/JSON-LD）
5. Issue 8/9（sitemap/robots）
6. Issue 10（画像運用）
