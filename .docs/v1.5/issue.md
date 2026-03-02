# 📘 my-blog v1.5 実装仕様書（Codex向け）

## 1. 目的

v1.5 は v1.4 の基盤（差分export・strict・redirect管理）を維持しつつ、検索体験を実用レベルへ引き上げるフェーズ。

* `/search` の UX 改善（使いやすさ、0件時の案内）
* 検索精度の改善（表記ゆれ・同義語の吸収）
* 検索インデックスの運用品質（サイズ監視）を追加

---

## 2. 前提（v1.4で成立）

* `content/index/search.json` を事前生成し、`public/index/search.json` で配信
* `lib/search/client.js` でクライアント検索ロジックを実装済み
* `/search` は query (`?q=`) で検索できる
* `content/reports/quality.{json,md}` が運用されている

---

## 3. スコープ（v1.5）

### 含む

1. 検索UX改善
* 結果内ハイライト（タイトル/summary）
* 0件時の提案表示（例: 表記を変える、タグページへ誘導）
* 入力デバウンス（例: 250ms）

2. 検索精度改善
* 同義語辞書（`nextjs` / `next.js` など）
* 正規化強化（記号や空白差異への耐性）

3. 検索インデックス監視
* `search.json` サイズを quality report に記録
* しきい値超過で warning（strict対象外）

### 含まない（v1.6以降）

* 本文全文検索
* サーバーサイド検索API
* パーソナライズ検索

---

## 4. 仕様（確定）

## 4.1 検索UX

### 4.1.1 ハイライト

* 対象: タイトル、summary
* 表示方法: 一致 token 部分を `<mark>` で装飾
* セキュリティ: 生HTMLを挿入せず、文字列分割ベースで実装

### 4.1.2 0件時UI

* 表示条件: `query` が非空 && `results.length === 0`
* 表示内容:
  * 「別表記を試す」案内
  * `/tags` への導線リンク

### 4.1.3 入力デバウンス

* 入力中の再検索を 250ms 遅延
* `Enter` は即時反映

---

## 4.2 検索精度

### 4.2.1 同義語辞書

`lib/search/synonyms.js` を追加し、query token 展開に使用。

例:

```js
{
  nextjs: ['next.js', 'next js'],
  s3: ['aws s3']
}
```

* 辞書は最小限で開始し、過学習を避ける

### 4.2.2 スコアリング

* 既存重みは維持:
  * title: 3
  * summary: 2
  * tags/categories: 2
* 同義語一致は元tokenと同等重み
* 同一token重複加点は1回まで

---

## 4.3 インデックス監視

### 4.3.1 計測項目

`quality.json` に以下を追加:

```json
{
  "search_index": {
    "bytes": 12345,
    "records": 42,
    "warn_threshold_bytes": 262144
  }
}
```

### 4.3.2 warning条件

* `bytes > warn_threshold_bytes` で `SEARCH_INDEX_TOO_LARGE` warning
* strict対象外（v1.5）

---

## 5. 実装対象ファイル

### app

* `app/search/page.js`（ハイライト、0件UI、デバウンス）

### lib

* `lib/search/client.js`（同義語展開、重複加点制御）
* `lib/search/synonyms.js`（新規）

### scripts

* `scripts/build-index.mjs`（indexサイズ計測、quality出力拡張）

### docs

* `.docs/v1.5/test.md`（別途作成）

---

## 6. コマンド（提案）

* `npm run index`
* `npm run quality:strict`（strict対象はv1.4準拠）
* `npm run dev`

---

## 7. 完了条件（Definition of Done）

* `/search` で結果ハイライトが表示される
* 0件時に提案UIが表示される
* デバウンス入力でも検索が安定動作する
* 同義語辞書が検索結果に反映される
* `quality.json` に search index サイズ情報が出力される
* indexサイズ超過で warning が出る（strict非対象）

---

# ✅ v1.5 Issueテンプレ（GitHubコピペ用）

## Issue 1: `/search` UX改善（ハイライト/0件UI/デバウンス）

**目的**
検索体験を改善し、結果の理解と再検索をしやすくする。

**作業**
* タイトル/summaryハイライト
* 0件時提案UI
* 250msデバウンス

**DoD**
* 入力体験と0件導線が改善される

---

## Issue 2: 同義語辞書とスコアリング改善

**目的**
表記ゆれでヒットしない問題を減らす。

**作業**
* `lib/search/synonyms.js` 追加
* token展開ロジック実装
* 重複加点抑制

**DoD**
* `nextjs` / `next.js` などで同等に検索できる

---

## Issue 3: 検索インデックスサイズ監視

**目的**
検索機能追加による肥大化を早期検知する。

**作業**
* `build-index.mjs` で bytes/records を計測
* quality report に出力
* しきい値超過で warning

**DoD**
* `quality.json` に `search_index` が出る
* 閾値超過時 warning が記録される
