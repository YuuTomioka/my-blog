import { Prose } from "./Prose";

/** MD から変換した HTML をレンダリングするコンポーネント */
export function MarkdownRenderer({ html }: { html: string }) {
  return <Prose><section dangerouslySetInnerHTML={{ __html: html }} /></Prose>;
}
