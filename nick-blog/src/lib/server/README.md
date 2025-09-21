# 🔌 server 層

## 役割
ドメインで定義された interface（Repositoryなど）を具体的に実装する、インフラ担当レイヤー。  
DB, S3, 外部APIなど、I/OやNode APIを扱う処理がここに集まります。

- すべてのファイルは `"server-only"` 制約が前提
- 実装名は `.impl.ts`, `.s3.ts` など外部接続先で明示するとベター

## サブディレクトリ
- `gateway/post/repositoryImpl.ts`：PostRepositoryのS3実装
- `s3/`：S3クライアントや共通ユーティリティ（fetch、Listなど）

## 参照ルール（依存）
✅ import 可能：
- `@domain/*`（interface）
- `@types/*`
- `@util/*`

❌ import 禁止：
- `@application/*`（逆依存になるため）

## サンプル
```ts
// repositoryImpl.ts
import "server-only";

export const postRepositoryImpl: PostRepository = {
  async listPublished() {
    const keys = await listKeys();
    return keys.map(loadPostByKey);
  },
};
```