# 📦 application 層

## 役割
ユースケース（ビジネス操作）を担うレイヤーで、  
ドメインロジックと外部インフラ（DB, 外部API）を仲介する「オーケストレーター」です。

- ドメインモデルやリポジトリに依存
- クライアントには直接依存しない
- DTO ↔ Entity の変換も責務（mapper）

## サブディレクトリ
- `post/`
  - `usecase.ts`：Post関連ユースケース（例：一覧取得、投稿など）
  - `mapper.ts`：DTO ⇄ Entity の変換ロジック
  - `dto.ts`：View用に整形されたデータ型

## 参照ルール（依存）
✅ import 可能：
- `@domain/*`
- `@types/*`
- `@util/*`

❌ import 禁止：
- `@server/*`（実装は外から注入すること）

## サンプル
```ts
// usecase.ts
export function makePostUsecase(deps: { postRepository: PostRepository }) {
  return {
    async listPublished(): Promise<PostDto[]> {
      const posts = await deps.postRepository.listPublished();
      return posts.map(toDto);
    }
  };
}
```