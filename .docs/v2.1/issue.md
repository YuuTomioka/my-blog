# 📘 my-blog v2.1 実装仕様書（Codex向け）

## 1. 目的

v2.1 は v1.x で蓄積した品質・運用基盤を、公開配信レイヤまで接続するフェーズ。

* redirect 生成結果（`redirects.json`）を実配信へ適用
* redirect 設定事故（ループ/過剰連鎖）を防止
* export 実行ログを機械可読化し、CI監視可能にする

---

## 2. 前提（v1.4〜v1.6で成立）

* `content/index/redirects.json` が生成できる
* 差分exportに `--dry-run`, `--force-delete`, state検証がある
* quality report と strict運用がある

---

## 3. スコープ（v2.1）

### 含む

1. redirect 適用基盤
* `redirects.json` から配信向けルールを生成
* ローカル検証用の redirect シミュレーションを追加

2. redirect 安全装置
* ループ検知
* 連鎖圧縮（A->B, B->C を A->C に正規化）
* 無効/自己参照ルール除外

3. export observability
* JSON形式の実行サマリ出力
* CIで件数しきい値監視可能な形にする

### 含まない（v2.2以降）

* UIデザイン刷新
* 本文全文検索
* リアルタイム分析基盤

---

## 4. 仕様（確定）

## 4.1 redirect 配信ルール生成

### 4.1.1 生成物

* `content/index/redirects.json`（既存）
* `content/index/redirects.runtime.json`（新規、配信用）

`redirects.runtime.json` schema:

```json
[
  {
    "from": "/posts/old-slug/",
    "to": "/posts/new-slug/",
    "status": 301
  }
]
```

### 4.1.2 生成ルール

* `from` は一意
* `to` は最終到達先に圧縮
* `status` は固定 301

---

## 4.2 redirect 安全装置

### 4.2.1 ループ検知

* `A->B->A` を検知したら error
* 該当ルールをログに列挙して停止

### 4.2.2 連鎖圧縮

* `A->B`, `B->C` は `A->C` に正規化
* 不要中間ルールは runtime 出力では除去

### 4.2.3 無効ルール除外

* `from === to` は warning で無効化
* path不正（`/` で始まらない等）は warning で無効化

---

## 4.3 export observability

### 4.3.1 生成物

* `content/reports/export-run.json`（最新1件）

schema:

```json
{
  "generated_at": "2026-03-03T00:00:00.000Z",
  "mode": {
    "dry_run": false,
    "force_delete": true
  },
  "posts": { "created": 0, "updated": 1, "skipped": 10, "deleted": 1 },
  "assets": { "created": 0, "updated": 0, "skipped": 30, "deleted": 0 },
  "redirects": { "added": 1, "total": 25 },
  "pending_deletes": { "posts": 0, "assets": 0 }
}
```

### 4.3.2 ログ方針

* コンソール要約 + JSON保存を両立
* dry-run 時も `mode.dry_run=true` で出力

---

## 5. 実装対象ファイル

### scripts

* `scripts/export-from-vault.mjs`
  * redirects.runtime 生成
  * redirect安全装置
  * export-run.json 出力

### content（生成物）

* `content/index/redirects.runtime.json`
* `content/reports/export-run.json`

### docs

* `.docs/v2.1/test.md`（別途作成）

---

## 6. コマンド（提案）

* `npm run export:diff`
* `npm run export:diff -- --dry-run`
* `npm run export:diff -- --force-delete`
* `npm run export:report`（`export-run.json` の整形表示、任意）

---

## 7. 完了条件（Definition of Done）

* `redirects.runtime.json` が生成される
* redirect ループ検知で安全停止する
* 連鎖圧縮が反映される
* `export-run.json` が毎回更新される
* CIで export 件数監視に利用できる

---

# ✅ v2.1 Issueテンプレ（GitHubコピペ用）

## Issue 1: redirects.runtime.json を生成

**目的**
redirect を配信レイヤで使える形式にする。

**作業**
* `redirects.json` から runtime 形式へ変換
* 301固定のルール出力

**DoD**
* runtimeファイルが生成される

---

## Issue 2: redirect 安全装置（ループ/連鎖圧縮）

**目的**
redirect 設定ミスによる障害を防ぐ。

**作業**
* ループ検知
* 連鎖圧縮
* 無効ルール除外

**DoD**
* ループで停止、正常時は圧縮出力

---

## Issue 3: export-run.json を出力

**目的**
export の運用監視を機械可読化する。

**作業**
* 実行サマリを JSON で保存
* dry-run/force モード情報を含める

**DoD**
* CIで件数監視に使える
