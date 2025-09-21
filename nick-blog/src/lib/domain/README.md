# 🧠 domain 層

## 役割
アプリケーションの「中核ルール・ビジネス知識」を保持するレイヤー。  
外部実装に依存せず、永続化やAPIの詳細を知らない純粋なモデルとインタフェースを定義します。

- Entity / ValueObject / DomainError / Interface（例：Repository）
- 実装は一切含まない

## サブディレクトリ
- `post/`
  - `repository.ts`：PostRepository interface（永続化の抽象）

## 参照ルール（依存）
✅ import 可能：
- 基本的に内部（同階層）または純粋な型・ユーティリティのみ

❌ import 禁止：
- `@application/*`
- `@server/*`

## サンプル
```ts
// repository.ts
export interface PostRepository {
  findBySlug(slug: string): Promise<Post | null>;
  listPublished(): Promise<Post[]>;
}
```