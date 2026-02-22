import { remark } from 'remark';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';

function wikiLinkPlugin() {
  return (tree) => {
    visitChildren(tree);
  };
}

function visitChildren(node) {
  if (!node || !Array.isArray(node.children)) return;

  const nextChildren = [];
  for (const child of node.children) {
    if (child?.type === 'text') {
      nextChildren.push(...replaceWikiLinksInTextNode(child));
      continue;
    }

    visitChildren(child);
    nextChildren.push(child);
  }

  node.children = nextChildren;
}

function replaceWikiLinksInTextNode(node) {
  const value = node?.value ?? '';
  const pattern = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  const out = [];
  let cursor = 0;
  let match;

  while ((match = pattern.exec(value)) !== null) {
    const [fullMatch, rawTarget, rawLabel] = match;
    const start = match.index;

    if (start > cursor) {
      out.push({ type: 'text', value: value.slice(cursor, start) });
    }

    const target = String(rawTarget || '').trim();
    const label = String(rawLabel || target).trim();

    if (target.length === 0) {
      out.push({ type: 'text', value: fullMatch });
    } else {
      out.push({
        type: 'link',
        url: `/posts/${encodeURIComponent(target)}/`,
        children: [{ type: 'text', value: label || target }]
      });
    }

    cursor = start + fullMatch.length;
  }

  if (cursor === 0) {
    return [node];
  }

  if (cursor < value.length) {
    out.push({ type: 'text', value: value.slice(cursor) });
  }

  return out;
}

export async function markdownToHtml(markdown) {
  const file = await remark()
    .use(remarkParse)
    .use(wikiLinkPlugin)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdown);

  return String(file);
}
