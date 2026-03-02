## my-blog v1.6 テスト項目

## 1. 目的

v1.6 の以下を確認する。

* strict profile（base/extended）の切替動作
* coverポリシー strict の段階適用
* quality report の前回比 / priority actions 出力

---

## 2. 前提

* v1.5 が通っていること
* 作業ディレクトリ: `my-blog`
* `quality:strict` が利用可能なこと

---

## 3. 基本コマンド

```bash
npm run index
npm run quality:strict
npm run quality:strict:extended
npm run quality:strict:cover -- --cover-policy-date=2026-04-01
```

---

## 4. テスト一覧

## 4.1 strict profile

### T-STRICTP-01: base profile（v1.4互換）

手順:
1. `npm run quality:strict`

期待結果:
* v1.4同等の fail code 判定で動作する

### T-STRICTP-02: extended profile

手順:
1. `SUMMARY_TOO_SHORT` を含む記事を用意
2. `npm run quality:strict:extended`

期待結果:
* `SUMMARY_TOO_SHORT` が fail 対象として扱われる

### T-STRICTP-03: profile差分確認

手順:
1. 同一データで base/extended を連続実行

期待結果:
* base では成功、extended では失敗（または仕様どおり差分）となる

---

## 4.2 coverポリシー

### T-COVER-01: 基準日以降 + coverなし で fail

手順:
1. `created_at >= cover-policy-date` かつ cover未設定記事を用意
2. `npm run quality:strict:cover -- --cover-policy-date=YYYY-MM-DD`

期待結果:
* `COVER_MISSING_NEW_POST` で失敗する

### T-COVER-02: 基準日前記事は warning維持

手順:
1. `created_at < cover-policy-date` の cover未設定記事を用意
2. cover strict 実行

期待結果:
* strict fail にならない（warning扱い）

---

## 4.3 quality report 改善

### T-QUALITY-61: delta 出力

手順:
1. `npm run index` を2回実行（途中でwarning件数を変更）
2. `quality.json` を確認

期待結果:
* `delta.warning_count`
* `delta.by_code`
  が出力される

### T-QUALITY-62: priority actions

手順:
1. warning code を複数発生させて `npm run index`
2. `quality.md` を確認

期待結果:
* warning件数上位の code と対応方針が表示される

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
