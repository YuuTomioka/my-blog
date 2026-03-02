# 📘 my-blog v1.3 実装仕様書（Codex向け）

## 1. 目的

v1.3 は「静的ブログのまま、運用と体験をもう一段上げる」フェーズ。

* クライアント不要に近い **簡易検索**（事前生成 index + 軽量JS）
* export を **差分更新**に寄せ、公開運用の安全性と速度を上げる
* **コンテンツ品質レポート**で改善ポイントを可視化する（CIは落とさない）

---

## 2. 前提（v1.1/v1.2で成立しているもの）

* `Vault -> export -> content/` が唯一のソース
* `scripts/export-from-vault.mjs` が公開境界（検証/正規化あり）
* `scripts/build-index.mjs` が検証済み `content/index/*.json` を生成
* `lib/posts.js` が app 層の単一API
* Post: `created_at` 必須 / `updated_at` optional / `status=published` のみ公開

---

## 3. スコープ（v1.3）

### 含む

1. 検索

* `/search` ページ追加
* `content/index/search.json` 生成（検索用）
* クライアント側で軽量検索（本文は対象外）

2. 差分 export

* `content/.export-state.json` に状態保存（hash方式）
* 変更ファイルのみコピー/生成
* 削除安全装置（大量削除検知 + forceフラグ）

3. 品質レポート

* `content/reports/quality.json` と `quality.md` 生成
* v1.3では **warningのみ**（CI fail しない）

### 含まない（将来）

* 本文全文検索（インデックス肥大化回避）
* リダイレクト生成（slug変更時）
* 品質レポートによるビルドfail（厳格運用）

---

## 4. 仕様（確定）

# 4.1 検索（Search）

## 4.1.1 UI / 導線

* `/search` ページを追加
* ナビ（`app/layout`）と Home に Search 入口を追加
* URLクエリ：`/search?q=...`
* 実装方針：`app/search/page.js` は Client Component とし、`useSearchParams()` で `q` を読む

## 4.1.2 検索対象フィールド

* 対象：

  * `title`（重み高）
  * `summary`（中）
  * `tags`（中）
  * `categories`（中）
* 対象外：

  * Markdown本文（v1.3ではやらない）

## 4.1.3 正規化（query と index 共通）

* lower
* 記号除去（過度に厳密にしない）
* 空白分割（日本語は分かち書きなし＝部分一致中心）

## 4.1.4 スコアリング（軽量）

* キーワード（トークン）ごとに includes で判定
* 重み：

  * title: 3
  * summary: 2
  * tags/categories: 2
* スコアは合算（一致したtoken数に比例）
* `score > 0` のみ結果表示

## 4.1.5 検索用インデックス

生成物：`content/index/search.json`

Schema（配列）：

```json
[
  {
    "slug": "getting-started-static-blog",
    "title": "Next.js × S3で最小構成の静的ブログを作る",
    "created_at": "2026-02-21",
    "updated_at": null,
    "summary": "Next.jsのstatic exportとS3 + CloudFrontでブログを公開する最小構成を解説",
    "tags": ["nextjs", "aws", "blog"],
    "categories": ["tech/web"],
    "search_text": "next.js × s3で最小構成の静的ブログを作る next.jsのstatic exportとs3 + cloudfrontでブログを公開する最小構成を解説 nextjs aws blog tech/web"
  }
]
```

* `search_text` は **正規化済み結合文字列**
* `search.json` は **publishedのみ**を含む
* 配信方法（固定）：

  * build時に `content/index/search.json` を `public/index/search.json` へコピーする
  * `/search` は `/index/search.json` を fetch してクライアント側で絞り込む

---

# 4.2 差分 export（Diff Export）

## 4.2.1 状態ファイル

`content/.export-state.json` を生成し、git管理対象とする。

Schema（概念）：

```json
{
  "version": 1,
  "generated_at": "2026-03-02T00:00:00Z",
  "items": [
    {
      "source_path": "vault/path/to/note.md",
      "slug": "getting-started-static-blog",
      "hash": "sha1:....",
      "exported_at": "2026-03-02T00:00:00Z"
    }
  ]
}
```

* 追跡キー：`source_path`（vault内の相対パス）
* `hash` は以下から生成：

  * frontmatter（正規化後）
  * markdown本文
  * ※同一内容なら hash が同じになる

## 4.2.2 差分判定

export run ごとに vault を走査して、各 `source_path` の hash を計算：

* state に存在しない → **新規**
* hash が変化 → **更新**
* hash 同一 → **スキップ**
* state にあるが vault に無い → **削除候補**

## 4.2.3 削除安全装置（重要）

誤設定・誤パスで全消しが起きないようにする。

* 削除候補数が `max(10, floor(total * 0.2))` を超えたら **停止（error）**
* 削除の実行はデフォルトで行わない
* `--force-delete` フラグがある場合のみ削除を実行する
* `total` は **直近stateの item 件数**（`content/.export-state.json` の items 長）

削除の扱い（v1.3）：

* `--force-delete` あり：該当 slug の成果物を削除（`content/posts/{slug}.md` と対応 asset）
* `--force-delete` なし：quality report に「削除候補」として出すのみ（soft）

## 4.2.4 slug変更（リネーム）

* 追跡キーが source_path なので、同一ファイルで slug が変わったら「slug変更」と判断できる
* `--force-delete` ありの場合：

  * 旧slug成果物を削除して、新slugで生成
* リダイレクトは作らない（v1.4以降）

---

# 4.3 品質レポート（Quality Report）

## 4.3.1 出力先

* `content/reports/quality.json`
* `content/reports/quality.md`

## 4.3.2 v1.3での扱い

* **warningのみ**（ビルドは落とさない）
* ただし重大エラー（slug重複等）は v1.1/v1.2 の検証で fail 済みの前提

## 4.3.3 チェック項目（固定）

* summary 未入力（warn）
* summary が短すぎる（例：< 20 chars warn）
* cover 未設定（任意warn）
* 画像パス規約違反（`build-index.mjs` 内で `renderMarkdown(..., { postSlug })` を実行し warnings を集計して warn）
* 削除候補一覧（warn）
* タグ/カテゴリの表記ゆれ（検出できるなら warn）

  * ※v1.1で正規化されるため、検出できる場合のみ（元値ログがある場合）

---

## 5. 実装対象ファイル

### scripts

* `scripts/export-from-vault.mjs`（差分export + state管理 + 安全装置）
* `scripts/build-index.mjs`（search.json生成 + quality report生成）

### lib

* `lib/search/client.js`（検索ロジック：query正規化/スコアリング）
* `lib/posts.js`（検索ページ用の補助が必要なら追加）

### app

* `app/search/page.js`（検索UI）
* `app/layout.js`（Searchリンク追加）
* `app/page.js`（HomeにSearch入口を追加）

### content（生成物）

* `content/.export-state.json`
* `content/index/search.json`
* `content/reports/quality.json`
* `content/reports/quality.md`

---

## 6. コマンド（提案）

* `npm run build:search-index`

  * build-index の中で search.json を生成しても良い（分割してもOK）
* `npm run export:diff`

  * 差分exportを有効化した export コマンド
* `npm run export:diff -- --force-delete`

  * 削除も反映（危険操作）
* 互換方針（固定）：

  * 既存 `npm run export:vault` は `export:diff` のエイリアスにする
  * 既存 `npm run index` は posts/tags/categories + search + quality をまとめて生成する

---

## 7. 完了条件（Definition of Done）

* `/search` で title/summary/tags/categories が検索できる
* `content/index/search.json` が生成される（publishedのみ）
* 差分exportが動き、未変更記事をスキップする
* 大量削除が検知されたら停止する
* `--force-delete` のみ削除を実行する
* `content/reports/quality.{json,md}` が生成される（warning中心）

---

# ✅ v1.3 Issueテンプレ（GitHubコピペ用）

## Issue 1: 検索用インデックス `content/index/search.json` を生成

**目的**
クライアント簡易検索のための軽量indexを事前生成する。

**作業**

* `build-index.mjs` で `search.json` を生成
* fields：slug/title/created_at/updated_at/summary/tags/categories/search_text
* search_text は正規化済み結合文字列
* publishedのみ対象

**DoD**

* `content/index/search.json` が生成される
* 1記事=1レコードで必要フィールドが揃う

---

## Issue 2: `/search` ページ（検索UI）を追加

**目的**
読者が検索できる導線を提供する。

**作業**

* `app/search/page.js` を追加
* クエリ：`/search?q=...`
* `search.json` を読み込み、クライアントで絞り込み

**DoD**

* `/search?q=nextjs` で結果が出る
* 結果は created_at desc で並ぶ

---

## Issue 3: クライアント検索ロジック（正規化 + スコアリング）を実装

**目的**
依存少なく軽量な検索を実現する。

**作業**

* `lib/search/client.js` を作成
* 正規化：lower + 記号除去 + 空白split
* スコア：title=3, summary=2, tag/cat=2 の includes 判定合算

**DoD**

* token一致でスコアがつき、`score>0` のみ表示される
* title一致が最優先で上に来る

---

## Issue 4: ナビ/Homeに Search 導線を追加

**目的**
検索の入口を常設する。

**作業**

* `app/layout.js` に `/search` リンク追加
* `app/page.js` に Search 入口（リンク）追加

**DoD**

* どのページからも Search に行ける

---

## Issue 5: export の差分更新（hash + state保存）を実装

**目的**
全削除コピーから脱却し、変更ファイルのみ更新する。

**作業**

* `content/.export-state.json` を導入（source_path追跡）
* hash（正規化frontmatter+本文）を計算
* 新規/更新のみ export し、同一hashはスキップ
* state を更新して保存

**DoD**

* 2回連続実行で2回目がほぼスキップになる
* state が更新される

---

## Issue 6: 削除検知と安全装置（大量削除停止 + force-delete）を実装

**目的**
誤操作での全消し事故を防ぐ。

**作業**

* 削除候補（stateにあるがvaultに無い）を検知
* 閾値超なら停止（error）
* `--force-delete` のときだけ削除実行

**DoD**

* 閾値超で export が落ちる
* `--force-delete` ありでのみ削除が走る
* `--force-delete` なしではレポートに出るだけ

---

## Issue 7: slug変更（同一source_pathでslugが変わる）を扱う

**目的**
リネーム時に旧slug成果物が残る問題を防ぐ。

**作業**

* source_path追跡により slug変更を検知
* `--force-delete` ありなら旧slug成果物を削除
* なしなら削除候補としてレポートに出す

**DoD**

* slug変更が検知される
* force-deleteで旧slugが消える

---

## Issue 8: 品質レポート `content/reports/quality.{json,md}` を生成

**目的**
改善対象を可視化する（CIでは落とさない）。

**作業**

* summary未入力、短すぎ、cover未設定、画像パス規約違反、削除候補を集計
* json と md を生成

**DoD**

* レポートファイルが生成される
* warning中心で一覧できる
