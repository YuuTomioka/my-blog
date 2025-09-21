# 📘 CONVENTIONS.md - 開発ルール & 設計方針

このドキュメントは、本プロジェクトにおけるアーキテクチャ設計・実装・運用上の共通ルールを定めます。

---

## 📐 アーキテクチャ方針

### ✅ 三層構造（DDD+クリーンアーキテクチャ簡易版）

| 層            | 役割 |
|---------------|------|
| `domain/`     | ビジネスルール・抽象インタフェース |
| `application/`| ユースケース・DTO・マッピング |
| `server/`     | 外部依存（DB, S3, APIなど）実装 |

---

## 📁 ディレクトリ構成のガイドライン

```
src/lib/
├── domain/ # Entity, ValueObject, Repository Interface
├── application/ # Usecase, Mapper, DTO
├── server/ # Infrastructure / 外部API実装
├── types/ # 汎用型（Result型など）
├── util/ # 副作用のない関数
```

---

## 🔃 依存方向ルール

| From \ To    | domain | application | server |
|--------------|--------|-------------|--------|
| `domain`     | ✅可    | ❌禁止       | ❌禁止  |
| `application`| ✅可    | ✅可         | ❌禁止  |
| `server`     | ✅可    | ❌禁止       | ✅可    |

- `domain/` → どこにも依存しない
- `application/` → `domain`, `types`, `util` のみ可
- `server/` → `application` には依存禁止

---

## 🧪 命名規則・ファイル構成

### ファイル命名
- interface → `*.ts`（例：`repository.ts`）
- 実装 → `repositoryImpl.ts` or `repository.s3.ts` / `repository.prisma.ts`
- ユースケース → `usecase.ts`
- DTO定義 → `dto.ts`
- マッパー → `mapper.ts`

### コンポーネント命名
- Server Action → `usecase名 + Action`（例：`publishPostAction`）
- Route Handler → REST風エンドポイント命名（例：`/api/posts/[slug]`）

---

## 🛡 サーバー/クライアント分離

- `server/` 以下は **全て `import "server-only"` を宣言**
- クライアント側から `server/` を直接 import しない
  - → 必要なら `Server Action` や `Route Handler` を経由

---

## 🧩 DTO戦略

- View（Client）には **DTO** を渡す
- ドメインオブジェクトは直接レンダリングしない
- `mapper.ts` で Entity ↔ DTO を明示的に変換

---

## 🔁 BFFルール

| 種類           | 用途                       | 備考                             |
|----------------|----------------------------|----------------------------------|
| Server Action  | 内部的に閉じた呼び出し     | `useFormState`, `useTransition` |
| Route Handler  | REST API / SWR取得用       | `/api/**`で fetch 可能          |

---

## 🔤 型ルール

- 外部APIやS3のレスポンスは必ず **`zod`** でスキーマ検証する
- エラーハンドリングは `Result<T, E>` 型 または throw のいずれかに統一
- 型名は `PostDto`, `PostEntity`, `PostFormData` のように目的別に分ける

---

## ⛓ ESLintルール（推奨）

- import制限を ESLint で定義する
- `no-restricted-imports` を使って逆依存を防止
```js
// .eslintrc.js
{
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "@server",
            message: "application層からserver層をimportしないでください",
          }
        ],
      },
    ],
  }
}
```

---

## 📦 環境変数のルール

- クライアントで使う環境変数：NEXT_PUBLIC_ プレフィックスをつける
- API鍵などの機密情報は server/ からのみ参照（process.env）

---

## 🧼 その他スタイルガイド

- デフォルトのエクスポートは避け、必ず named export にする
- import順序：ライブラリ系 → alias系 → 相対パス（1行ずつ空ける）
- 機能単位の index.ts は使ってOKだが、責務が増えすぎないように注意

---

## 📌 変更があった場合は？

- この CONVENTIONS.md は pull request単位で更新・レビュー対象
- 誤った実装を防ぐため、重要な構成・命名変更はここに明示してください

---

## ✨ 補足：組織・チームで運用する場合の拡張項目

必要に応じて以下のセクションも追加できます：

- ✅ テスト方針（ユニット/統合、Vitest/Jest）
- ⛑ エラー戦略（ログの出し方、Sentry等）
- 🌐 外部APIのモックポリシー
- 🔄 デプロイポリシー（Preview環境など）
- 💬 PRレビュー観点チェックリスト

---