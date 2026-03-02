import crypto from 'node:crypto';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypePrettyCode from 'rehype-pretty-code';
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

function createIdGenerator() {
  const counts = new Map();
  return (text) => {
    const base = makeHeadingIdBase(text);
    const count = (counts.get(base) || 0) + 1;
    counts.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  };
}

function makeHeadingIdBase(text) {
  const normalized = String(text || '').trim();
  if (!normalized) return 'section';

  if (/[^\x00-\x7F]/.test(normalized)) {
    return `h-${shortHash(normalized, 6)}`;
  }

  const slug = normalized
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  return slug || 'section';
}

function shortHash(s, len = 6) {
  return crypto.createHash('sha1').update(s).digest('hex').slice(0, len);
}

function walkTree(node, visitor) {
  if (!node || typeof node !== 'object') return;
  visitor(node);
  if (!Array.isArray(node.children)) return;
  for (const child of node.children) {
    walkTree(child, visitor);
  }
}

function extractTextFromHast(node) {
  const parts = [];
  walkTree(node, (cur) => {
    if (cur?.type === 'text' && typeof cur.value === 'string') {
      parts.push(cur.value);
    }
  });
  return parts.join('').trim();
}

function mergeRel(existing, add) {
  const set = new Set();
  if (typeof existing === 'string') {
    for (const token of existing.split(/\s+/)) {
      if (token) set.add(token);
    }
  } else if (Array.isArray(existing)) {
    for (const token of existing.flat()) {
      if (token) set.add(String(token));
    }
  }
  for (const token of add) {
    set.add(token);
  }
  return Array.from(set).join(' ');
}

function safeHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

function isExternalHttpUrl(href) {
  return href.startsWith('http://') || href.startsWith('https://');
}

function rehypeEnhancePlugin(options = {}) {
  const {
    siteUrl = '',
    postSlug = '',
    toc = [],
    warnings = []
  } = options;

  return (tree) => {
    const siteHost = safeHost(siteUrl);
    const nextHeadingId = createIdGenerator();

    walkTree(tree, (node) => {
      if (node?.type !== 'element') return;

      if (node.tagName === 'h2' || node.tagName === 'h3') {
        const text = extractTextFromHast(node);
        if (!text) return;
        const id = nextHeadingId(text);
        const depth = node.tagName === 'h2' ? 2 : 3;

        node.properties = node.properties || {};
        node.properties.id = id;
        toc.push({ id, text, depth });

        node.children = Array.isArray(node.children) ? node.children : [];
        node.children.unshift({
          type: 'element',
          tagName: 'a',
          properties: {
            href: `#${id}`,
            className: ['heading-anchor'],
            'aria-label': 'Anchor link'
          },
          children: [{ type: 'text', value: '#' }]
        });
        return;
      }

      if (node.tagName === 'a') {
        const href = typeof node.properties?.href === 'string' ? node.properties.href : '';
        if (!href) return;

        if (href.startsWith('mailto:')) {
          node.properties = node.properties || {};
          node.properties.rel = mergeRel(node.properties.rel, ['noreferrer']);
          return;
        }

        if (isExternalHttpUrl(href)) {
          const hrefHost = safeHost(href);
          const isSameHost = siteHost && hrefHost && siteHost === hrefHost;
          if (!isSameHost) {
            node.properties = node.properties || {};
            node.properties.target = '_blank';
            node.properties.rel = mergeRel(node.properties.rel, ['noopener', 'noreferrer']);
          }
        }
        return;
      }

      if (node.tagName === 'img') {
        const src = typeof node.properties?.src === 'string' ? node.properties.src : '';
        if (!src) return;
        const expectedPrefix = `/assets/${postSlug}/`;
        if (src.startsWith('/') && !src.startsWith(expectedPrefix)) {
          warnings.push({
            level: 'warn',
            code: 'IMAGE_PATH_NON_STANDARD',
            message: `Image src "${src}" is not under "${expectedPrefix}" (recommended).`
          });
        }
        return;
      }

      // Fallback code-block enhancement when syntax highlighter plugin is unavailable.
      if (node.tagName === 'pre') {
        const code = Array.isArray(node.children) ? node.children.find((child) => child?.type === 'element' && child.tagName === 'code') : null;
        const className = code?.properties?.className;
        const classes = Array.isArray(className) ? className.map(String) : (typeof className === 'string' ? [className] : []);
        const langClass = classes.find((c) => c.startsWith('language-'));
        const language = langClass ? langClass.slice('language-'.length) : '';
        node.properties = node.properties || {};
        node.properties.className = mergeClassNames(node.properties.className, ['code-block']);
        if (language) {
          node.properties['data-language'] = language;
        }
      }
    });
  };
}

function mergeClassNames(existing, add) {
  const set = new Set();
  const push = (v) => {
    if (!v) return;
    if (Array.isArray(v)) {
      for (const item of v) push(item);
      return;
    }
    for (const token of String(v).split(/\s+/)) {
      if (token) set.add(token);
    }
  };
  push(existing);
  push(add);
  return Array.from(set);
}

export function buildMarkdownExcerpt(markdown, maxChars = 160) {
  const plain = String(markdown || '')
    .replace(/^---[\s\S]*?---/m, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/[#>*_\-]+/g, ' ')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, '$2$1')
    .replace(/\s+/g, ' ')
    .trim();

  if (plain.length <= maxChars) return plain;
  return `${plain.slice(0, maxChars).trimEnd()}…`;
}

export async function renderMarkdown(markdown, opts = {}) {
  const toc = [];
  const warnings = [];
  const excerptMaxChars = opts.excerptMaxChars ?? 160;
  const tocMinItems = opts.tocMinItems ?? 2;
  const siteUrl = opts.siteUrl || '';
  const postSlug = opts.postSlug || '';

  const processor = remark()
    .use(remarkParse)
    .use(wikiLinkPlugin)
    .use(remarkGfm);

  processor.use(remarkRehype);
  processor.use(rehypePrettyCode, {
    theme: 'github-dark',
    keepBackground: false
  });

  processor
    .use(rehypeEnhancePlugin, { toc, warnings, siteUrl, postSlug })
    .use(rehypeStringify);

  const file = await processor.process(markdown);
  const finalToc = toc.length >= tocMinItems ? toc : [];
  return {
    html: String(file),
    toc: finalToc,
    warnings,
    excerpt: buildMarkdownExcerpt(markdown, excerptMaxChars)
  };
}

export async function markdownToHtml(markdown) {
  const { html } = await renderMarkdown(markdown, {});
  return html;
}
