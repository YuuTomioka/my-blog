# 📘 my-blog v1.6 実装仕様書（Codex向け）

## 1. 目的

v1.6 は v1.5 までの検索・品質基盤を前提に、公開品質の運用ルールを一段引き上げるフェーズ。

* strict 対象を段階拡張し、品質基準を明確化
* cover 運用を強化し、SNS共有品質を安定化
* quality report を「改善優先度の判断材料」として使える形にする

---

## 2. 前提（v1.5で成立）

* `quality:strict` が利用可能
* strict fail 対象は v1.4 で `SUMMARY_MISSING`, `IMAGE_PATH_NON_STANDARD`
* `cover` 未設定は warning 運用中
* quality report が json / md で生成される

---

## 3. スコープ（v1.6）

### 含む

1. strict基準の段階拡張
* `SUMMARY_TOO_SHORT` を strict fail 候補に追加
* 移行フラグで段階適用（初期は opt-in）

2. cover 運用強化
* 新規記事（基準日以降）で `COVER_MISSING` を strict対象化するオプション
* 既存記事は warning 維持

3. quality report 改善
* 前回比（増減）を出力
* 上位 warning コードの優先度を表示

### 含まない（v1.7以降）

* 画像最適化（変換/圧縮）自動化
* リアルタイムダッシュボード

---

## 4. 仕様（確定）

## 4.1 strict基準の段階拡張

### 4.1.1 新規strict候補

* `SUMMARY_TOO_SHORT` を fail候補として追加

### 4.1.2 適用モード

`build-index.mjs --strict` に加えて、以下を導入:

* `--strict-profile=base|extended`
  * `base`: v1.4同等
  * `extended`: `SUMMARY_TOO_SHORT` を追加

デフォルト:

* `quality:strict` は `base`
* `quality:strict:extended` を追加

---

## 4.2 coverポリシー

### 4.2.1 ルール

* `--cover-policy-date=YYYY-MM-DD` 以降の `created_at` 記事は、`cover` 未設定を strict対象にできる
* それ以前の記事は warning 維持

### 4.2.2 strict判定

* `--strict-cover-required` が指定された場合のみ有効
* fail code: `COVER_MISSING_NEW_POST`

---

## 4.3 quality report 改善

### 4.3.1 前回比

`content/reports/quality.json` に前回比較を追加:

```json
{
  "delta": {
    "warning_count": -3,
    "by_code": {
      "SUMMARY_MISSING": -1
    }
  }
}
```

### 4.3.2 優先度セクション

`quality.md` に「priority actions」セクションを追加:

* warning件数上位 code を 3件表示
* 件数と推奨対応を短文で表示

---

## 5. 実装対象ファイル

### scripts

* `scripts/build-index.mjs`
  * strict profile対応
  * coverポリシー判定
  * quality delta生成
  * priority actions出力

### package

* `package.json`
  * `quality:strict:extended` 追加
  * （任意）`quality:strict:cover` 追加

### docs

* `.docs/v1.6/test.md`（別途作成）

---

## 6. コマンド（提案）

* `npm run quality:strict`
* `npm run quality:strict:extended`
* `npm run quality:strict:cover -- --cover-policy-date=2026-04-01`
* `npm run index`

---

## 7. 完了条件（Definition of Done）

* strict profile を切り替えて fail code を制御できる
* extended profile で `SUMMARY_TOO_SHORT` が fail する
* coverポリシー有効時、新規記事の cover欠落が fail する
* `quality.json` に前回比が出る
* `quality.md` に priority actions が出る

---

# ✅ v1.6 Issueテンプレ（GitHubコピペ用）

## Issue 1: strict profile（base/extended）を実装

**目的**
品質基準を段階的に引き上げる。

**作業**
* `--strict-profile` を追加
* `extended` で `SUMMARY_TOO_SHORT` を fail対象化

**DoD**
* profile 切替で fail 判定が変わる

---

## Issue 2: coverポリシー strict を実装

**目的**
新規記事の共有品質を保証する。

**作業**
* `--strict-cover-required`
* `--cover-policy-date`
* 新規記事のみ cover 必須判定

**DoD**
* 基準日以降の記事で cover 欠落時に fail

---

## Issue 3: quality report に前回比を追加

**目的**
改善傾向を把握しやすくする。

**作業**
* 前回 `quality.json` との差分出力
* `quality.md` に priority actions 追加

**DoD**
* delta と優先対応が確認できる

---

## Issue 4: npm scripts と README を更新

**目的**
運用手順を明確にする。

**作業**
* strict profile 用 script 追加
* README / README.ja に反映

**DoD**
* チームが同一コマンドで運用できる
