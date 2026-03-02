## my-blog v1.4 テスト項目

## 1. 目的

v1.4 の以下を確認する。

* slug 変更時の redirect 情報が生成される
* export の `--dry-run` が安全に差分予定を可視化する
* state 異常時に安全停止し、復旧ガイドが出る
* quality strict mode（`--strict`）で対象 warning のみ fail する
* デフォルト運用が v1.3 互換（warning中心）を維持する

---

## 2. 前提

* v1.3 実装が通っていること
* 作業ディレクトリ: `my-blog`
* `my-vault` が隣接ディレクトリに存在すること
* `scripts/export-from-vault.mjs` が差分 export 対応済みであること
* `scripts/build-index.mjs` が quality report 生成に対応済みであること

---

## 3. 基本コマンド

```bash
npm run export:diff
npm run export:diff -- --dry-run
npm run export:diff -- --force-delete
npm run index
npm run index -- --strict
npm run quality:strict
```

補助確認:

```bash
cat content/index/redirects.json
cat content/.export-state.json
cat content/reports/quality.json
```

---

## 4. テスト一覧

## 4.1 Redirect 管理（Issue 1）

### T-REDIRECT-01: slug変更で redirects.json 生成

手順:

1. 同一 `source_path` の記事で slug を変更
2. `npm run export:diff`
3. `content/index/redirects.json` を確認

期待結果:

* `from: /posts/<old-slug>/`
* `to: /posts/<new-slug>/`
* `reason: slug_rename`
* `updated_at` を含む

### T-REDIRECT-02: 同一from競合時の最新採用

手順:

1. 同一記事で slug を複数回変更
2. `npm run export:diff` を都度実行
3. `redirects.json` の `from` 重複を確認

期待結果:

* 同一 `from` に対して最新の `to` が採用される
* 重複エントリが無秩序に増えない

### T-REDIRECT-03: force-delete有無で記録継続

手順:

1. slug変更を作る
2. `npm run export:diff`（soft）
3. `npm run export:diff -- --force-delete`（hard）
4. `redirects.json` を確認

期待結果:

* `--force-delete` の有無に関わらず redirect 記録は保持される

---

## 4.2 export `--dry-run`（Issue 2）

### T-DRYRUN-01: dry-runで差分予定が表示される

手順:

1. 新規/更新/削除候補がある状態を作る
2. `npm run export:diff -- --dry-run`

期待結果:

* create/update/delete/skip の件数と対象が表示される
* 実行が成功する

### T-DRYRUN-02: dry-runで実ファイル不変

手順:

1. 実行前に `content/posts`, `public/assets`, `content/.export-state.json` のタイムスタンプまたは hash を記録
2. `npm run export:diff -- --dry-run`
3. 再比較

期待結果:

* ファイル内容が変化しない
* state が更新されない

### T-DRYRUN-03: `--dry-run --force-delete`

手順:

1. 削除候補がある状態で `npm run export:diff -- --dry-run --force-delete`

期待結果:

* 削除予定が表示される
* 実削除は行われない

---

## 4.3 state検証（Issue 3）

### T-STATE-01: 不正stateで安全停止

手順:

1. `content/.export-state.json` を不正形式にする（例: `items` を配列以外）
2. `npm run export:diff`

期待結果:

* export が error 停止する
* state 不正が原因であることが分かるメッセージが出る

### T-STATE-02: 復旧ガイド表示

手順:

1. `T-STATE-01` 実行時ログを確認

期待結果:

* バックアップ復元または再生成手順が案内される

### T-STATE-03: 正常state復旧後に再実行成功

手順:

1. state を正常に戻す
2. `npm run export:diff`

期待結果:

* ふたたび通常実行できる

---

## 4.4 quality strict mode（Issue 4）

### T-STRICT-01: デフォルトはwarning継続

手順:

1. `SUMMARY_MISSING` または `IMAGE_PATH_NON_STANDARD` を含む記事を用意
2. `npm run index`

期待結果:

* quality report に warning は出る
* コマンドは成功する

### T-STRICT-02: `--strict` でfail

手順:

1. `T-STRICT-01` と同条件で `npm run index -- --strict`

期待結果:

* 終了コード1で失敗する
* fail 対象 code が表示される

### T-STRICT-03: fail対象が無いとstrict成功

手順:

1. `SUMMARY_MISSING` / `IMAGE_PATH_NON_STANDARD` を解消
2. `npm run index -- --strict`

期待結果:

* strict実行が成功する

### T-STRICT-04: quality.json の strict セクション

手順:

1. strict実行後 `content/reports/quality.json` を確認

期待結果:

* `strict.enabled`
* `strict.failed`
* `strict.fail_codes`
  が出力される

---

## 4.5 npm scripts / 回帰（Issue 5）

### T-CMD-01: `quality:strict` が実行できる

手順:

1. `npm run quality:strict`

期待結果:

* `node scripts/build-index.mjs --strict` 相当が実行される

### T-REG-01: 既存コマンド回帰なし

手順:

1. `npm run export:diff`
2. `npm run index`
3. `npm run build`

期待結果:

* v1.3同様に通常フローが通る

### T-REG-02: `publish:check` 互換

手順:

1. `npm run publish:check`

期待結果:

* 既存公開前チェックとして成立する

---

## 5. 実施結果記録テンプレ

実施日:

実施者:

結果サマリ:

* PASS:
* FAIL:
* BLOCKED:

補足:

* 失敗ケースのログ/再現条件
* 一時データ作成有無と後始末

---

## 6. 実施結果（2026-03-03）

実施者:

* Codex

結果サマリ:

* PASS: `T-REDIRECT-01`, `T-REDIRECT-03`
* PASS: `T-REDIRECT-02`
* PASS: `T-DRYRUN-01`, `T-DRYRUN-02`, `T-DRYRUN-03`
* PASS: `T-STATE-01`, `T-STATE-02`, `T-STATE-03`
* PASS: `T-STRICT-01`, `T-STRICT-02`, `T-STRICT-03`, `T-STRICT-04`
* PASS: `T-CMD-01`, `T-REG-01`, `T-REG-02`
* 未実施（手動UI中心）: なし

実施コマンド（抜粋）:

```bash
npm run export:diff
npm run export:diff -- --dry-run
npm run export:diff -- --force-delete
npm run index
npm run quality:strict
npm run build
```

補足:

* redirect 生成確認:
  * slug 変更テストで `content/index/redirects.json` に `from/to/reason/updated_at` を確認
  * 同一 `from` の再発生ケースで `to` が最新値に置換され、重複件数が増えないことを確認
* strict fail 確認:
  * 一時記事で `SUMMARY_MISSING` を作り、`npm run quality:strict` が終了コード1になることを確認
* strict success 確認:
  * fail 対象 warning 解消後に `npm run quality:strict` が成功することを確認
* state 異常停止確認:
  * `content/.export-state.json` を意図的に不正化し、復旧ガイド付きエラーで停止することを確認
* dry-run + force-delete 確認:
  * `--dry-run --force-delete` 実行時に削除予定は表示されるが、対象postとstateが不変であることを確認
* 後始末:
  * 一時 Vault 記事（`zv4-*`）と一時 post ファイルを削除済み
  * `export:diff -- --force-delete` 実行後、通常データ状態に復帰済み
