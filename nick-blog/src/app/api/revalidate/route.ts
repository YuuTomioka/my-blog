import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
  const token = req.headers.get("x-revalidate-token");
  if (token !== process.env.REVALIDATE_TOKEN) return new Response("Unauthorized", { status: 401 });
  const { slug } = await req.json();
  if (!slug) return new Response("Bad Request", { status: 400 });
  revalidatePath(`/post/${slug}`);
  return Response.json({ ok: true, slug });
}