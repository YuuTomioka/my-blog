## my-blog v2.1 テスト項目

## 1. 目的

v2.1 の以下を確認する。

* redirect runtime 形式生成
* redirect 安全装置（ループ/連鎖圧縮/無効除外）
* export observability（`export-run.json`）出力

---

## 2. 前提

* v1.4+ の export 基盤が動作すること
* `content/index/redirects.json` が生成可能なこと
* 作業ディレクトリ: `my-blog`

---

## 3. 基本コマンド

```bash
npm run export:diff
npm run export:diff -- --dry-run
npm run export:diff -- --force-delete
```

---

## 4. テスト一覧

## 4.1 redirect runtime 生成

### T-RUNTIME-01: `redirects.runtime.json` 生成

手順:
1. slug rename を発生させる
2. `npm run export:diff`
3. `content/index/redirects.runtime.json` を確認

期待結果:
* `from`, `to`, `status: 301` を持つ

### T-RUNTIME-02: runtime正規化

手順:
1. 連鎖 redirect を含む状態を作る
2. runtime を確認

期待結果:
* `to` が最終到達先に圧縮される

---

## 4.2 redirect 安全装置

### T-REDSAFE-01: ループ検知

手順:
1. ループ（A->B->A）を作る
2. `npm run export:diff`

期待結果:
* error 停止する
* ループ経路がログに出る

### T-REDSAFE-02: 自己参照/不正path除外

手順:
1. `from===to` や不正pathルールを投入
2. export 実行

期待結果:
* warning で除外される
* runtime に不正ルールが入らない

---

## 4.3 export observability

### T-OBS-01: `export-run.json` 出力

手順:
1. `npm run export:diff`
2. `content/reports/export-run.json` を確認

期待結果:
* mode/posts/assets/redirects/pending_deletes が出る

### T-OBS-02: dry-run モード反映

手順:
1. `npm run export:diff -- --dry-run`
2. `export-run.json` を確認

期待結果:
* `mode.dry_run = true`

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
