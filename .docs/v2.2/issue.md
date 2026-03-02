# 📘 my-blog v2.2 実装仕様書（Codex向け）

## 1. 目的

v2.2 は品質運用を継続改善ループに乗せるフェーズ。

* タグ/カテゴリ語彙管理を強化し、表記ゆれを抑止
* 記事構造・メタ情報の lint を追加
* scripts 系テストを自動化し、回帰検知を標準化

---

## 2. 前提（v2.1で成立）

* quality report が継続運用されている
* strictモード運用が定着している
* export/reporting の基盤がある

---

## 3. スコープ（v2.2）

### 含む

1. 語彙管理（taxonomy governance）
* 許可語彙ファイル導入
* 不正語彙を warning/strict対象として扱う

2. コンテンツ lint 拡張
* 見出し構造、説明文長、重複タイトル等を検査

3. テスト自動化
* `scripts/*.mjs` のユニットテスト
* フィクスチャベース回帰テスト

### 含まない（v2.3以降）

* CMS連携
* 高度なNLP評価
* A/Bテスト自動化

---

## 4. 仕様（確定）

## 4.1 語彙管理

### 4.1.1 辞書ファイル

* `content/policy/tags-allowed.json`
* `content/policy/categories-allowed.json`

例:

```json
{
  "tags": ["nextjs", "aws", "blog", "architecture"]
}
```

### 4.1.2 判定

* 許可語彙外は `UNKNOWN_TAG` / `UNKNOWN_CATEGORY` warning
* `--strict-profile=governance` で fail対象化

---

## 4.2 lint 拡張

### 4.2.1 チェック項目

* `TITLE_DUPLICATE`
* `SUMMARY_TOO_LONG`（例: > 180 chars）
* `HEADING_DEPTH_JUMP`（`h2 -> h4` など）
* `META_DESCRIPTION_MISSING`（summary/excerpt不足）

### 4.2.2 出力

* 既存 quality report に統合
* 各 warning に `slug`, `code`, `message`, `hint` を付与

---

## 4.3 テスト自動化

### 4.3.1 テスト対象

* `scripts/build-index.mjs`
* `scripts/export-from-vault.mjs`
* `lib/search/client.js`

### 4.3.2 方式

* Node組み込みテスト（`node:test`）を採用
* `tests/fixtures/` に入力・期待出力を保持

### 4.3.3 コマンド

* `npm run test:scripts`
* `npm run test:fixtures`

---

## 5. 実装対象ファイル

### content/policy

* `tags-allowed.json`
* `categories-allowed.json`

### scripts / lib

* `scripts/build-index.mjs`（語彙チェック + lint拡張）
* `scripts/export-from-vault.mjs`（必要に応じて語彙事前チェック）
* `lib/markdown/render.js`（見出し構造検査補助、必要なら）

### tests

* `tests/scripts/*.test.mjs`
* `tests/fixtures/*`

### package

* `package.json`（test scripts追加）

### docs

* `.docs/v2.2/test.md`（別途作成）

---

## 6. コマンド（提案）

* `npm run index`
* `npm run quality:strict`
* `npm run quality:strict -- --strict-profile=governance`
* `npm run test:scripts`
* `npm run test:fixtures`

---

## 7. 完了条件（Definition of Done）

* 許可語彙外が quality report で検出される
* governance strict で語彙違反を fail できる
* lint 拡張項目が quality report に反映される
* scripts テストが CI で実行される
* 主要回帰ケースが fixture で再現できる

---

# ✅ v2.2 Issueテンプレ（GitHubコピペ用）

## Issue 1: 語彙ポリシー（tags/categories allowed）を導入

**目的**
表記ゆれと語彙の拡散を防ぐ。

**作業**
* allowed辞書ファイル追加
* quality判定へ統合

**DoD**
* unknown語彙が warning/strict対象になる

---

## Issue 2: コンテンツ lint 拡張

**目的**
公開品質を自動チェックする。

**作業**
* title重複、summary長、見出し深さなどを検査

**DoD**
* quality report で一括確認できる

---

## Issue 3: scriptsテスト自動化

**目的**
v2系の回帰を防ぐ。

**作業**
* `node:test` ベースの unit/fixture テスト作成

**DoD**
* `npm run test:scripts` で主要ケースが通る

---

## Issue 4: CI連携

**目的**
品質と回帰検知を継続運用する。

**作業**
* CIに `test:scripts` と strictチェックを追加

**DoD**
* PR時に自動検証が走る
