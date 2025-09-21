import matter from "gray-matter";

export function extractFrontmatterAndContent(raw: string) {
  const { data, content } = matter(raw);
  return { data, content } as { data: Record<string, unknown>; content: string };
}
