import type { PropsWithChildren } from "react";

export function Prose({ children, className }: PropsWithChildren<{ className?: string }>) {
  const cls = [
    "prose prose-slate max-w-none",
    // Headings
    "prose-headings:font-semibold prose-headings:tracking-tight",
    "prose-h1:text-3xl md:prose-h1:text-4xl prose-h1:mt-8 prose-h1:mb-4",
    "prose-h2:text-2xl md:prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-3",
    "prose-h3:text-xl md:prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-2",
    // Text and links
    "prose-p:leading-7 prose-p:my-4",
    "prose-a:text-blue-600 prose-a:underline prose-a:underline-offset-2",
    // Quotes
    "prose-blockquote:border-l-4 prose-blockquote:border-slate-300 prose-blockquote:pl-4",
    // Code
    "prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-normal",
    "prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:p-4 prose-pre:rounded-lg",
    // Lists
    "prose-ul:list-disc prose-ul:pl-6 prose-ol:list-decimal prose-ol:pl-6 prose-li:my-1",
    // Media
    "prose-img:rounded-lg",
    // Tables and misc
    "prose-table:table-auto prose-th:border-b prose-td:border-b prose-td:p-2 prose-th:text-left",
    "prose-hr:my-8",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <div className={cls}>{children}</div>;
}
