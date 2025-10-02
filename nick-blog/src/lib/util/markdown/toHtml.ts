import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeExternalLinks from "rehype-external-links";
import rehypePrettyCode from "rehype-pretty-code"; // 使う場合のみ依存追加

// 必要に応じて許可タグ・属性を拡張
const schema: Parameters<typeof rehypeSanitize>[0] = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      ["target"],
      ["rel"],
    ],
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      ["src"],
      ["alt"],
      ["title"],
      ["loading"],
      ["decoding"],
    ],
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ["className"], // language-xxx を許可（ハイライト用）
    ],
  },
};

export async function markdownToHtml(md: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    // MD内の <br> 等のHTMLを解釈したいなら rehype-raw を挟む（サニタイズ前に！）
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw) // ← allowDangerousHtml とセット
    .use(remarkRehype)
    .use(rehypeExternalLinks, { target: "_blank", rel: ["noopener", "noreferrer"] })
    .use(rehypeSanitize, schema)
    .use(rehypePrettyCode, { theme: "github-dark" }) // 任意
    .use(rehypeStringify)
    .process(md);

  return String(file);
}
