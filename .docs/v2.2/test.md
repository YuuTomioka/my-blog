## my-blog v2.2 テスト項目

## 1. 目的

v2.2 の以下を確認する。

* 語彙ポリシー（allowed tags/categories）による統制
* コンテンツ lint 拡張の検出精度
* scripts テスト自動化（unit/fixture）

---

## 2. 前提

* v2.1 までの quality/export が動作すること
* `content/policy/*.json` が用意されること
* 作業ディレクトリ: `my-blog`

---

## 3. 基本コマンド

```bash
npm run index
npm run quality:strict -- --strict-profile=governance
npm run test:scripts
npm run test:fixtures
```

---

## 4. テスト一覧

## 4.1 語彙ポリシー

### T-GOV-01: unknown tag/category 検知

手順:
1. allowed辞書外の tag/category を含む記事を用意
2. `npm run index`

期待結果:
* `UNKNOWN_TAG` / `UNKNOWN_CATEGORY` warning が出る

### T-GOV-02: governance strict

手順:
1. `npm run quality:strict -- --strict-profile=governance`

期待結果:
* unknown語彙が fail 対象として扱われる

---

## 4.2 lint 拡張

### T-LINT-01: タイトル重複

手順:
1. 同一タイトル記事を複数用意
2. `npm run index`

期待結果:
* `TITLE_DUPLICATE` warning が出る

### T-LINT-02: summary 長さチェック

手順:
1. summary 長過ぎ記事を用意
2. `npm run index`

期待結果:
* `SUMMARY_TOO_LONG` warning が出る

### T-LINT-03: 見出し深さジャンプ

手順:
1. `h2 -> h4` の見出し構造記事を用意
2. `npm run index`

期待結果:
* `HEADING_DEPTH_JUMP` warning が出る

---

## 4.3 テスト自動化

### T-TEST-01: scripts unit test

手順:
1. `npm run test:scripts`

期待結果:
* 主要 scripts のテストが通る

### T-TEST-02: fixture 回帰

手順:
1. `npm run test:fixtures`

期待結果:
* 既知ケースで期待出力と一致する

### T-TEST-03: CI互換

手順:
1. CI相当環境で `test:scripts` + strict を実行

期待結果:
* PR時に自動実行可能で再現性がある

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
