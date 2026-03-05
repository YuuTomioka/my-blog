## my-blog v2.0 テスト項目（Issue 1）

## 1. 目的

`components/plus` の参照コンポーネントを `blog/`・`ui/` に改修した実装が、README ルールどおり適用されていることを確認する。

## 2. テスト項目

### T-V20-01: plus 直接参照禁止

手順:
1. `rg "components/plus" app components/blog components/ui`

期待結果:
- 実運用コードに `components/plus` への import が存在しない

### T-V20-02: レイアウトの共通ヘッダー適用

手順:
1. `/` を表示
2. ヘッダーに Home / Search / Tags / Categories 導線が表示されることを確認

期待結果:
- `components/ui/SiteHeader` が適用され、導線が動作する

### T-V20-03: Breadcrumbs 適用

手順:
1. `/tags/<tag>/`, `/categories/<path>/`, `/posts/<slug>/` を表示

期待結果:
- Breadcrumbs が表示され、階層リンクが機能する

### T-V20-04: PostPager 適用

手順:
1. 任意の投稿詳細ページを表示

期待結果:
- Previous / Next のページャーUIが表示される

### T-V20-05: ビルド整合

手順:
1. `npm run index`
2. `npm run build`

期待結果:
- いずれも成功する

## 3. 実施結果テンプレ

実施日:
実施者:

結果サマリ:
- PASS:
- FAIL:
- BLOCKED:

補足:
- デザインレビュー観点
- レスポンシブ確認
- アクセシビリティ確認
