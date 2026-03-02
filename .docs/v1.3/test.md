## my-blog v1.3 テスト項目

## 1. 目的

v1.3 の以下を確認する。

* 検索機能（`/search` + `search.json` + 軽量スコアリング）が動作する
* export が差分更新され、未変更データをスキップできる
* 削除安全装置（大量削除停止 + `--force-delete`）が動作する
* 品質レポート（`quality.json` / `quality.md`）が warning 中心で生成される
* 既存運用コマンドとの互換方針が崩れていない

---

## 2. 前提

* v1.2 が通っていること
* 作業ディレクトリ: `my-blog`
* `my-vault` が隣接に存在すること
* `NEXT_PUBLIC_SITE_URL` は任意（未設定 fallback でも可）
* v1.3 実装後、以下生成先が利用可能であること
  * `content/.export-state.json`
  * `content/index/search.json`
  * `public/index/search.json`
  * `content/reports/quality.json`
  * `content/reports/quality.md`

---

## 3. 基本コマンド

```bash
npm run export:vault
npm run index
npm run build
npm run publish:check
```

差分 export 検証:

```bash
npm run export:diff
npm run export:diff -- --force-delete
```

補助確認:

```bash
npm run dev
curl -s "http://localhost:3000/index/search.json"
```

---

## 4. テスト一覧

## 4.1 検索インデックス生成（Issue 1）

### T-SEARCH-01: `content/index/search.json` 生成

手順:

1. `npm run index` を実行
2. `content/index/search.json` を確認

期待結果:

* ファイルが生成される
* 1記事=1レコードで、`slug/title/created_at/updated_at/summary/tags/categories/search_text` を持つ
* `published` 記事のみ含まれる

### T-SEARCH-02: 正規化済み `search_text`

手順:

1. 記号・大文字を含むタイトル/summary/tags を持つ記事を用意
2. `npm run index`
3. `search_text` を確認

期待結果:

* lower 化される
* 記号が過度に残らない
* title + summary + tags + categories の結合内容が入る

### T-SEARCH-03: 配信ファイル `public/index/search.json`

手順:

1. `npm run index` 実行後に `public/index/search.json` を確認
2. `npm run dev` 起動後 `GET /index/search.json` を確認

期待結果:

* `public/index/search.json` が存在する
* ブラウザ/`curl` で取得できる

---

## 4.2 検索UIと導線（Issue 2/4）

### T-SEARCH-11: `/search` ページ表示

手順:

1. `/search` にアクセス

期待結果:

* 検索入力UIが表示される
* 初期状態でエラーなく描画される

### T-SEARCH-12: クエリ連動（`/search?q=...`）

手順:

1. `/search?q=nextjs` にアクセス
2. 入力値と結果を確認

期待結果:

* `q` が入力欄に反映される
* `score > 0` の記事のみ表示される

### T-SEARCH-13: ナビ/Home導線

手順:

1. ヘッダー（全ページ共通）から Search 遷移
2. Home から Search 遷移

期待結果:

* 両導線から `/search` へ遷移できる

---

## 4.3 クライアント検索ロジック（Issue 3）

### T-SEARCH-21: スコア重み（title優先）

データ例:

* A: titleにのみ `nextjs` を含む
* B: summaryのみに `nextjs` を含む

期待結果:

* 同条件なら A が上位（title weight=3, summary weight=2）

### T-SEARCH-22: 複数トークンの合算

手順:

1. `/search?q=nextjs aws` で検索

期待結果:

* token ごとの一致が合算される
* 一致 token が多い記事ほど上位になる

### T-SEARCH-23: 正規化一致

手順:

1. 大文字/記号/余分な空白を含むクエリで検索（例: ` Next.js  `）

期待結果:

* 正規化後の一致で結果が返る
* 0件時もUIが破綻しない

### T-SEARCH-24: 並び順

期待結果:

* まず score 降順
* score 同点時は `created_at desc`（仕様に合わせた順序）

---

## 4.4 差分 export 基盤（Issue 5）

### T-EXPORT-31: stateファイル生成

手順:

1. `npm run export:diff`
2. `content/.export-state.json` を確認

期待結果:

* `version`, `generated_at`, `items[]` が出力される
* `items[]` に `source_path/slug/hash/exported_at` がある

### T-EXPORT-32: 2回目実行でスキップ

手順:

1. 変更なしで `npm run export:diff` を2回連続実行

期待結果:

* 2回目は未変更判定が中心になり、更新件数が大幅に減る
* state は更新時刻のみ更新される（または仕様どおり最小更新）

### T-EXPORT-33: 更新検知

手順:

1. Vault側で既存記事の summary または本文を変更
2. `npm run export:diff`

期待結果:

* 該当 `source_path` のみ更新対象になる
* 対応 `content/posts/{slug}.md` が更新される

---

## 4.5 削除安全装置とslug変更（Issue 6/7）

### T-EXPORT-41: 削除候補検知（soft）

手順:

1. state には存在するが Vault 側にない記事を作る
2. `npm run export:diff`（`--force-delete` なし）

期待結果:

* 削除は実行されない
* quality report に削除候補として記録される

### T-EXPORT-42: 大量削除停止

手順:

1. 削除候補が閾値 `max(10, floor(total*0.2))` を超える状態を作る
2. `npm run export:diff`

期待結果:

* export が error 停止する
* 事故防止メッセージが表示される

### T-EXPORT-43: `--force-delete` で削除実行

手順:

1. 削除候補あり状態で `npm run export:diff -- --force-delete`

期待結果:

* `content/posts/{slug}.md` が削除される
* 対応 asset があれば削除される

### T-EXPORT-44: slug変更検知

手順:

1. 同一 `source_path` の記事で slug を変更
2. `npm run export:diff`（soft）
3. `npm run export:diff -- --force-delete`（hard）

期待結果:

* soft時は旧slugが削除候補として扱われる
* force-delete時は旧slug成果物が削除され、新slug成果物が出力される

---

## 4.6 品質レポート（Issue 8）

### T-QUALITY-01: レポート生成

手順:

1. `npm run index`
2. `content/reports/quality.json` と `quality.md` を確認

期待結果:

* 両ファイルが生成される
* warning 一覧が読める形式で出力される

### T-QUALITY-02: summary未入力/短文検知

手順:

1. `summary` 未入力記事と短文記事（<20 chars）を用意
2. `npm run index`

期待結果:

* 両ケースが warning として記録される

### T-QUALITY-03: cover未設定検知

手順:

1. `cover` なし記事を含めて `npm run index`

期待結果:

* 任意 warning として記録される

### T-QUALITY-04: 画像パス規約違反集計

手順:

1. 規約外画像パス（例: `/images/foo.png`）を含む記事を用意
2. `npm run index`

期待結果:

* `renderMarkdown` 警告由来の warning が quality report に出る
* build は fail しない

---

## 4.7 互換性・回帰

### T-REG-01: 既存コマンド互換

期待結果:

* `npm run export:vault` が `export:diff` 相当として動く
* `npm run index` で posts/tags/categories + search + quality が生成される

### T-REG-02: v1.2機能回帰なし

確認観点:

* 投稿ページの TOC / 見出しアンカー / 関連 / 前後リンクが維持される
* sitemap / robots / metadata / JSON-LD が維持される

### T-REG-03: `publish:check` 通し確認

手順:

1. `npm run publish:check`

期待結果:

* 一連の処理が成功し、公開前チェックとして成立する
