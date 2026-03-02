# 📘 my-blog v1.4 実装仕様書（ドラフト）

## 1. 目的

v1.4 は v1.3 の運用基盤を強化し、公開品質と安全性を上げるフェーズ。

* slug 変更時のリンク断絶を避ける（redirect 管理）
* 品質レポートを段階的に CI ゲートへ移行する（strict mode）
* 差分 export の運用安全性を高める（dry-run / state 検証）

---

## 2. 前提（v1.3で成立）

* `Vault -> export -> content/` が唯一の公開経路
* `content/.export-state.json` に差分状態を保持
* `content/reports/quality.{json,md}` が warning 生成できる
* `/search` と `content/index/search.json` が運用中

---

## 3. スコープ（v1.4）

### 含む

1. Redirect 管理
* slug 変更時に `content/index/redirects.json` を生成
* `旧slug -> 新slug` の解決情報を保持

2. 品質 strict mode
* 既存 warning を維持しつつ、`--strict` 時のみ fail
* fail 対象は限定（例: summary 未入力、画像規約違反）

3. Export 安全性の拡張
* `--dry-run` で変更予定の可視化（実ファイル変更なし）
* state の形式検証と復旧ガイド出力

### 含まない（v1.5以降）

* 本文全文検索
* CMS化
* 画像最適化パイプライン本実装

---

## 4. 仕様（確定）

## 4.1 Redirect 管理

### 4.1.1 生成物

`content/index/redirects.json`

Schema（配列）:

```json
[
  {
    "from": "/posts/old-slug/",
    "to": "/posts/new-slug/",
    "reason": "slug_rename",
    "updated_at": "2026-03-03T00:00:00.000Z"
  }
]
```

### 4.1.2 生成ルール

* source_path が同一で slug が変化したときに生成
* 同一 `from` が複数候補を持つ場合は最新を採用
* `--force-delete` 実行有無に関わらず記録は残す

### 4.1.3 反映先

* static hosting 前提のため、まずは生成のみ（適用方式は環境依存）
* AWS運用では CloudFront Function / S3 redirect 連携を将来接続

---

## 4.2 品質 strict mode

### 4.2.1 基本方針

* デフォルト: warning only（v1.3互換）
* `--strict` 指定時: fail 対象 warning が1件でもあれば終了コード1

### 4.2.2 初期fail対象（v1.4）

* `SUMMARY_MISSING`
* `IMAGE_PATH_NON_STANDARD`

※ `COVER_MISSING` は v1.4 では warning 維持

### 4.2.3 出力

`quality.json` に strict 判定結果を追加:

```json
{
  "strict": {
    "enabled": true,
    "failed": true,
    "fail_codes": ["SUMMARY_MISSING", "IMAGE_PATH_NON_STANDARD"]
  }
}
```

---

## 4.3 Export 安全性拡張

### 4.3.1 `--dry-run`

* 出力: create/update/delete/skip の予定件数と対象一覧
* 動作: ファイル書き込み・削除・state更新を行わない
* `--dry-run --force-delete` の同時指定は許可（削除予定のみ表示）

### 4.3.2 state 形式検証

* version, items, pending_deletes の必須形を検証
* 不正時:
  * export を停止
  * 復旧ガイド（バックアップ復元または再生成手順）を表示

### 4.3.3 ログ品質

* 実行結果を必ず1行要約:
  * `Posts: created=X, updated=Y, skipped=Z, deleted=W`
  * `Assets: ...`
  * `Redirects: added=R, total=T`

---

## 5. 実装対象ファイル

### scripts

* `scripts/export-from-vault.mjs`
  * redirect生成
  * `--dry-run`
  * state検証強化
* `scripts/build-index.mjs`
  * strict mode（`--strict`）
  * quality strict 判定出力

### content（生成物）

* `content/index/redirects.json`
* `content/reports/quality.{json,md}`（strict結果拡張）

### docs

* `.docs/v1.4/test.md`（別途作成）

---

## 6. コマンド（提案）

* `npm run export:diff`
* `npm run export:diff -- --dry-run`
* `npm run export:diff -- --force-delete`
* `npm run index`
* `npm run index -- --strict`
* `npm run quality:strict`（`node scripts/build-index.mjs --strict` のエイリアス）

---

## 7. 完了条件（Definition of Done）

* slug 変更時に `redirects.json` が生成される
* `--dry-run` でファイル変更なしに差分予定が確認できる
* state 異常時に安全に停止し、復旧ガイドが出る
* `--strict` で対象 warning があると失敗する
* デフォルト運用は v1.3 互換（warning中心、build不落）

---

# ✅ v1.4 Issueテンプレ（GitHubコピペ用）

## Issue 1: slug変更から redirects.json を生成

**目的**
既存リンク切れを回避する。

**作業**
* `source_path` 同一 + slug変更を検出
* `content/index/redirects.json` を出力

**DoD**
* renameケースで `from/to` が生成される

---

## Issue 2: export に `--dry-run` を追加

**目的**
破壊的変更前の確認性を上げる。

**作業**
* create/update/delete/skip 予定の可視化
* dry-run時は書き込みなし

**DoD**
* 実ファイルとstateが不変で、予定差分のみ表示される

---

## Issue 3: state検証と復旧ガイドを実装

**目的**
state破損時の事故を防ぐ。

**作業**
* state schema 検証
* 不正時に停止 + 復旧手順を表示

**DoD**
* 不正stateで安全停止し、原因が判別できる

---

## Issue 4: quality strict mode を実装

**目的**
品質ゲートを段階導入する。

**作業**
* `build-index.mjs --strict`
* fail対象codeで終了コード1

**DoD**
* strict時のみfailし、通常実行はwarning継続

---

## Issue 5: npm scripts を v1.4運用に更新

**目的**
運用コマンドを明確化する。

**作業**
* `quality:strict` 追加
* README に反映

**DoD**
* チームが同一手順で strict チェックを実行できる
