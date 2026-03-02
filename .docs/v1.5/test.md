## my-blog v1.5 テスト項目

## 1. 目的

v1.5 の以下を確認する。

* `/search` UX 改善（ハイライト / 0件UI / デバウンス）
* 同義語辞書による検索精度向上
* 検索インデックスサイズ監視の導入

---

## 2. 前提

* v1.4 が通っていること
* 作業ディレクトリ: `my-blog`
* `content/index/search.json` が生成可能なこと

---

## 3. 基本コマンド

```bash
npm run index
npm run quality:strict
npm run dev
```

---

## 4. テスト一覧

## 4.1 `/search` UX

### T-SEARCHUX-01: タイトル/summaryハイライト

手順:
1. `/search?q=nextjs` を開く
2. 結果のタイトル/summaryを確認

期待結果:
* 一致語が `<mark>` 相当で強調される

### T-SEARCHUX-02: 0件時提案UI

手順:
1. `/search?q=zzzz-non-existent` を開く

期待結果:
* 0件メッセージが表示される
* 再検索提案または `/tags` 導線が表示される

### T-SEARCHUX-03: デバウンス検索

手順:
1. 検索入力を連続でタイプ
2. ネットワーク/UI更新頻度を確認

期待結果:
* 250ms程度のデバウンスで結果更新される
* `Enter` では即時反映される

---

## 4.2 同義語辞書 / スコアリング

### T-SYN-01: `nextjs` / `next.js` 同等ヒット

手順:
1. `q=nextjs` と `q=next.js` を比較

期待結果:
* 結果集合が同等または期待どおり近似する

### T-SYN-02: 重複加点抑制

手順:
1. 同じ語を繰り返すクエリ（例: `nextjs nextjs`）を実行

期待結果:
* 同一tokenの異常な過加点が起きない

---

## 4.3 検索インデックス監視

### T-INDEXMON-01: `quality.json` へのサイズ情報出力

手順:
1. `npm run index`
2. `content/reports/quality.json` を確認

期待結果:
* `search_index.bytes`
* `search_index.records`
* `search_index.warn_threshold_bytes`
  が出力される

### T-INDEXMON-02: サイズ超過warning

手順:
1. しきい値を超えるテストデータを用意
2. `npm run index`

期待結果:
* `SEARCH_INDEX_TOO_LARGE` warning が記録される
* strict対象外のため通常実行は成功する

---

## 5. 実施結果記録テンプレ

実施日:
実施者:

結果サマリ:
* PASS:
* FAIL:
* BLOCKED:

補足:
* 失敗ケースのログ
* 一時データの後始末
