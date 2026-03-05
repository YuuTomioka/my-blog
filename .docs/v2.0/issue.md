# my-blog v2.0 実装仕様（Issue 1）

## 目的

`components/plus` に追加した参照用コンポーネントを、`components/README.md` のルールに従って実運用レイヤーへ反映する。

## スコープ（Issue 1）

- `components/plus/*` は参照専用の原本として維持する
- `components/blog/*` と `components/ui/*` にプロジェクト向け改修版を実装する
- `app/*` からは `blog/` と `ui/` のみを参照する

## 対象（今回）

- Navigation（`plus/navigation` 由来）→ `components/ui/SiteHeader`
- Breadcrumbs（`plus/breadcrumbs` 由来）→ `components/ui/Breadcrumbs`
- Pagination（`plus/Pagination` 由来）→ `components/blog/PostPager`
- 一覧表示の共通化 → `components/blog/PostCard`, `components/blog/PostList`

## 完了条件

- `plus` 配下を直接 `app/*` から import していない
- 共通UIが `ui/`、ブログ固有UIが `blog/` に分離されている
- 主要ページで新コンポーネントが利用される
- `npm run build` が成功する
