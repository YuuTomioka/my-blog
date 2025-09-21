# /src/components ガイド（UIコンポーネント）

本ディレクトリは **純UI** を担います。ビジネスロジックは `/src/lib` に置き、ここには持ち込みません。

- サーバ・クライアントは **ファイル単位で選択**（`"use client"`）
- 受け取るデータは基本 **DTO**（`/src/lib/application/.../dto.ts`）

---

## インポート方針

✅ 直接 import してよいもの
- UI専用ユーティリティ（`date-fns`等）、`@lib/types/*`
- **原則** `@lib/application/*` / `@lib/server/*` はここから直 import しない

❌ 禁止
- `@lib/server/*`（鍵やI/Oを触らない）
- `@lib/application/*`（UsecaseはRSC/Action経由）

---

## データの受け取り

- **RSC** で取得した **DTO** を **props** で渡す（推奨）
- CSRで再取得が必要な場合のみ、`Route Handler` を `fetch/SWR` で叩く

### 受け取るDTO例
```ts
// lib/application/post/dto.ts
export type PostDto = { slug: string; title: string; contentHtml: string; publishedAt: string };
```

### 表示コンポーネント（Server Component OK）
```ts
// components/post/PostView.tsx
import type { PostDto } from "@lib/application/post/dto";

export function PostView({ post }: { post: PostDto }) {
  return (
    <article>
      <h1>{post.title}</h1>
      <time dateTime={post.publishedAt}>{post.publishedAt}</time>
      <div dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
    </article>
  );
}
```

### 互換クライアント版（インタラクションが必要なとき）
```ts
// components/post/PostToolbar.client.tsx
"use client";

export function PostToolbar({ onPublish }: { onPublish: () => Promise<void> }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      onClick={async () => { setLoading(true); await onPublish(); setLoading(false); }}
      disabled={loading}
    >
      {loading ? "Publishing..." : "Publish"}
    </button>
  );
}
```

---

## CSRでのデータ再取得（必要時のみ）
```ts
// components/post/PostClientData.client.tsx
"use client";
import useSWR from "swr";

export function PostClientData({ slug }: { slug: string }) {
  const { data, isLoading, error } = useSWR(`/api/posts/${slug}`, (u) => fetch(u).then(r => r.json()));
  if (isLoading) return <span>loading...</span>;
  if (error) return <span>error</span>;
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
```

---

## ルール要約（Do / Don’t）
- Do: DTOを props で受け、UIに専念
- Do: インタラクションは Server Action をコールバック注入で呼ぶ
- Don’t: @lib/server/** を import しない
- Don’t: ビジネスロジックや外部API呼び出しを直接ここに書かない

---