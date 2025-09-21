# /src/app ガイド（App Router × BFF）

本ディレクトリは **画面エントリ（RSC）とBFF** を担います。ビジネス処理は `/src/lib` にあります。

- RSC = Server Components（データ取得＆描画）
- BFF = Server Actions / Route Handlers（UI専用API）
- UI構築自体は `/src/components` に委譲

---

## インポート方針

✅ 直接 import してよいもの
- `@app/*`（自ディレクトリのactions/handlers）
- `@components/*`（UI）
- `@lib/application/*`（ユースケース ※**サーバでのみ**）
- `@lib/domain/*`（型・インタフェース ※抽象のみ）
- `@lib/types/*`, `@lib/util/*`

❌ 禁止
- `@lib/server/*` を RSC 以外（クライアント）から import（**server-only**）
- `@components/*` から BFF を直 import（RSC経由で注入）

---

## データフロー（基本形）

**RSC（page.tsx / layout.tsx） → Usecase（lib/application） → RepositoryImpl（lib/server） → DTO → UI**

- 取得は **RSC** で行い、**DTO** を `Client Component` に **props** で渡す
- クライアントで再検証が必要なら **Route Handler + SWR** を使う

---

## BFF の使い分け

| 目的 | 手段 | ファイル例 |
|---|---|---|
| 内部呼び出し（フォーム/ボタン） | **Server Action** | `app/(feature)/actions.ts` |
| RESTで公開/CSRから取得 | **Route Handler** | `app/api/feature/route.ts` or `app/api/feature/[id]/route.ts` |

### Server Action（例）
```ts
// app/(blog)/actions.ts
"use server";
import "server-only";
import { makePostUsecase } from "@lib/application/post/usecase";
import { postRepositoryImpl } from "@lib/server/gateway/post/repositoryImpl";

const uc = makePostUsecase({ postRepository: postRepositoryImpl });

export async function publishPostAction(slug: string) {
  await uc.publish(slug);
  // revalidateTag("posts"); // 必要に応じて
}
```

### Route Handler（例）
```ts
// app/api/posts/[slug]/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { makePostUsecase } from "@lib/application/post/usecase";
import { postRepositoryImpl } from "@lib/server/gateway/post/repositoryImpl";

const uc = makePostUsecase({ postRepository: postRepositoryImpl });

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const dto = await uc.getBySlug(params.slug);
  return NextResponse.json(dto, { status: 200 });
}
```

---

## RSC での配線（Usecase注入）
```ts
// app/(blog)/[slug]/page.tsx
import "server-only";
import { Suspense } from "react";
import { makePostUsecase } from "@lib/application/post/usecase";
import { postRepositoryImpl } from "@lib/server/gateway/post/repositoryImpl";
import { PostView } from "@components/post/PostView";

export const revalidate = 60; // 必要に応じて
const uc = makePostUsecase({ postRepository: postRepositoryImpl });

export default async function Page({ params }: { params: { slug: string } }) {
  const dto = await uc.getBySlug(params.slug);
  return (
    <Suspense fallback={<div>loading...</div>}>
      <PostView post={dto} /> {/* DTOをUIへ */}
    </Suspense>
  );
}
```

---

## キャッシュと再検証
- 取得頻度高／最新必須 → cache: "no-store" or revalidate = 0
- 定期更新 → export const revalidate = N
- 変更後の無効化 → revalidateTag("posts")（Usecase内やAction内で付与）

---

## ルール要約（Do / Don’t）
- Do: RSCでデータ取得→DTO→UI；BFFで外部API/鍵を隠蔽
- Do: server-only を /src/lib/server/** と BFF に付与
- Don’t: クライアントから @lib/server/** を import
- Don’t: UI内部にビジネスロジックを持ち込む

---

