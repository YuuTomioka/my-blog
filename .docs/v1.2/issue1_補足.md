OK。**Issue 1（`lib/markdown/render.js`）用に「ほぼコピペ」版**を出します。
Next.js（App Router）前提で、Markdown → HTML に変換しつつ、

* **見出しIDの安定生成（ASCII=slugify / 非ASCII=hash / 重複は -2）**
* **TOC抽出（h2/h3、2未満なら空）**
* **コードハイライト（rehype-pretty-code）**
* **外部リンク属性制御（自ドメイン除外）**
* **画像パス規約 warning（/assets/{slug}/...）**
* **既存wikiリンク（`[[slug]]`）の変換維持**

を **render時にまとめて**処理します。

---

## 0) 追加する依存（npm）

（既に入っているものはスキップでOK）

```bash
npm i unified remark-parse remark-gfm remark-rehype rehype-stringify unist-util-visit
npm i rehype-pretty-code shiki
npm i github-slugger
npm i -D @types/node
```

> `github-slugger` は **slugify + 重複suffix** を安全にやってくれるのでおすすめ。
> 非ASCIIは hash にするので、ASCIIだけ slugger を使います。
>
> 注意: 現行 `lib/markdown/render.js` には wikiリンク変換があるため、置き換え時はその機能を必ず移植してください（回帰防止）。

---

## 1) `lib/markdown/render.js`（コピペ版 / ESM想定）

> 返り値に `{ html, toc, warnings, excerpt }` を含めます。
> 投稿ページ側は `toc.length >= 2` のときだけ表示。

````js
// lib/markdown/render.js
import crypto from "node:crypto";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypePrettyCode from "rehype-pretty-code";
import { visit } from "unist-util-visit";
import GithubSlugger from "github-slugger";

/**
 * @typedef {{ id: string, text: string, depth: 2|3 }} TocItem
 * @typedef {{ level: "warn"|"error", code: string, message: string }} RenderWarning
 */

/**
 * Render markdown to HTML with:
 * - stable heading IDs (ASCII -> slugify; non-ASCII -> hash)
 * - TOC extraction (h2/h3)
 * - code highlight (rehype-pretty-code)
 * - external link attrs
 * - image path warnings
 * - preserve wiki-link conversion ([[slug]] -> /posts/slug/)
 *
 * @param {string} markdown
 * @param {{
 *   postSlug: string,
 *   siteUrl: string, // e.g. https://example.com
 *   tocMinItems?: number, // default 2
 *   excerptMaxChars?: number, // default 160
 * }} opts
 * @returns {Promise<{ html: string, toc: TocItem[], warnings: RenderWarning[], excerpt: string }>}
 */
export async function renderMarkdown(markdown, opts) {
  const toc = /** @type {TocItem[]} */ ([]);
  const warnings = /** @type {RenderWarning[]} */ ([]);

  const tocMinItems = opts.tocMinItems ?? 2;
  const excerptMaxChars = opts.excerptMaxChars ?? 160;

  // 1) remark段階でTOC用に「見出しテキスト」を抽出しておく
  // 2) rehype段階で「同じルール」でidを付与する（idとtocを一致させる）
  //    -> そのために、両方が同じ関数 generateHeadingId() を使う
  const slugger = new GithubSlugger();

  // TOC抽出（remark plugin）
  function remarkCollectToc() {
    return (tree) => {
      slugger.reset();

      visit(tree, "heading", (node) => {
        const depth = node.depth;
        if (depth !== 2 && depth !== 3) return;

        const text = extractTextFromMdast(node);
        if (!text) return;

        const id = generateHeadingId(text, slugger);
        toc.push({ id, text, depth: /** @type {2|3} */ (depth) });
      });
    };
  }

  // 外部リンク属性 + 画像パス warning + 見出しID付与（rehype plugin）
  function rehypeEnhanceHtml({ siteUrl, postSlug }) {
    const siteHost = safeHost(siteUrl);

    return (tree) => {
      // 見出しID（rehype側）: TOCと同じルールで付与する
      // ここでも slugger を reset して同順で生成し、TOCと一致させる
      // （※ remarkCollectToc と同じ順序で heading を訪問する想定）
      slugger.reset();

      visit(tree, "element", (node) => {
        // Heading IDs
        if (node.tagName === "h2" || node.tagName === "h3") {
          const text = extractTextFromHast(node);
          if (text) {
            const id = generateHeadingId(text, slugger);
            node.properties = node.properties || {};
            node.properties.id = id;

            // 見出しにアンカーリンクを追加（#）
            // <h2 id="..."><a href="#..." class="heading-anchor">#</a>Title</h2>
            node.children = node.children || [];
            node.children.unshift({
              type: "element",
              tagName: "a",
              properties: {
                href: `#${id}`,
                "aria-label": "Anchor link",
                className: ["heading-anchor"],
              },
              children: [{ type: "text", value: "#" }],
            });
          }
          return;
        }

        // External links
        if (node.tagName === "a") {
          const href = typeof node.properties?.href === "string" ? node.properties.href : "";
          if (!href) return;

          // mailto: は target 付与しない（方針）
          if (href.startsWith("mailto:")) {
            node.properties = node.properties || {};
            // rel付与は任意（ここでは付与）
            node.properties.rel = mergeRel(node.properties.rel, ["noreferrer"]);
            return;
          }

          if (isExternalHttpUrl(href)) {
            const hrefHost = safeHost(href);
            const isSameHost = siteHost && hrefHost && siteHost === hrefHost;

            if (!isSameHost) {
              node.properties = node.properties || {};
              node.properties.target = "_blank";
              node.properties.rel = mergeRel(node.properties.rel, ["noopener", "noreferrer"]);
            }
          }
          return;
        }

        // Image path warning
        if (node.tagName === "img") {
          const src = typeof node.properties?.src === "string" ? node.properties.src : "";
          if (!src) return;

          // ルール：/assets/{slug}/... を推奨（v1.2はwarningのみ）
          const expectedPrefix = `/assets/${postSlug}/`;
          if (src.startsWith("/") && !src.startsWith(expectedPrefix)) {
            warnings.push({
              level: "warn",
              code: "IMAGE_PATH_NON_STANDARD",
              message: `Image src "${src}" is not under "${expectedPrefix}" (recommended).`,
            });
          }
        }
      });
    };
  }

  // excerpt（summaryが無い場合の description fallback 用）
  const excerpt = buildExcerpt(markdown, excerptMaxChars);

  // rehype-pretty-code 設定（最小）
  const prettyCodeOptions = {
    // ここは好みで変更してOK（v1.2は固定テーマ方針）
    theme: "github-dark",
    keepBackground: false,
  };

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    // NOTE: 現行の wikiLinkPlugin をここに移植してから使う（順序は remarkRehype より前）
    // .use(wikiLinkPlugin)
    .use(remarkCollectToc)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypePrettyCode, prettyCodeOptions)
    .use(rehypeEnhanceHtml, { siteUrl: opts.siteUrl, postSlug: opts.postSlug })
    .use(rehypeStringify)
    .process(markdown);

  const html = String(file.value);

  // TOC表示条件（2件未満なら空）
  const finalToc = toc.length >= tocMinItems ? toc : [];

  return { html, toc: finalToc, warnings, excerpt };
}

/* ----------------------------- helpers ----------------------------- */

function isExternalHttpUrl(href) {
  return href.startsWith("http://") || href.startsWith("https://");
}

function safeHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

/**
 * ASCII中心なら github-slugger で slugify+重複処理
 * 非ASCIIを含むなら hash を採用（安定性優先）
 */
function generateHeadingId(text, slugger) {
  const normalized = text.trim();
  if (!normalized) return "section";

  if (containsNonAscii(normalized)) {
    const h = shortHash(normalized, 6);
    // hashでも重複する可能性がゼロではないので slugger を使って suffix 管理
    // ただし slugger は入力が同じだと suffix を振るので、"h-xxxxxx" を入力にする
    return slugger.slug(`h-${h}`);
  }

  // ASCII: slugify + 重複は "-2" など
  return slugger.slug(normalized);
}

function containsNonAscii(s) {
  // 0x00-0x7F 以外を含むなら非ASCII
  return /[^\x00-\x7F]/.test(s);
}

function shortHash(s, len = 6) {
  return crypto.createHash("sha1").update(s).digest("hex").slice(0, len);
}

// mdast heading node からテキスト抽出
function extractTextFromMdast(headingNode) {
  /** @type {string[]} */
  const parts = [];
  visit(headingNode, (node) => {
    if (node.type === "text") parts.push(node.value);
  });
  return parts.join("").trim();
}

// hast element からテキスト抽出
function extractTextFromHast(el) {
  /** @type {string[]} */
  const parts = [];
  visit(el, (node) => {
    if (node.type === "text") parts.push(node.value);
  });
  return parts.join("").trim();
}

// rel を配列/文字列どちらでも安全にマージ
function mergeRel(existing, add) {
  const cur = new Set(
    typeof existing === "string"
      ? existing.split(/\s+/).filter(Boolean)
      : Array.isArray(existing)
        ? existing.flat().map(String)
        : []
  );
  for (const a of add) cur.add(a);
  return Array.from(cur).join(" ");
}

// summaryが無いときの description fallback 用の抜粋
function buildExcerpt(markdown, maxChars) {
  const plain = markdown
    .replace(/^---[\s\S]*?---/m, "") // frontmatter除去（雑でOK）
    .replace(/```[\s\S]*?```/g, "") // code block除去
    .replace(/`[^`]*`/g, "") // inline code除去
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[[^\]]*\]\([^)]*\)/g, "") // links
    .replace(/[#>*_\-]+/g, " ") // md記号
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= maxChars) return plain;
  return plain.slice(0, maxChars).trimEnd() + "…";
}
````

---

## 2) 投稿ページ側の使い方（最小例）

`app/posts/[slug]/page.js` で、`renderMarkdown()` を呼んで TOC/HTML を使います。

```js
// app/posts/[slug]/page.js（抜粋イメージ）
import { renderMarkdown } from "lib/markdown/render";
import { getPostBySlug } from "lib/posts";

export default async function PostPage({ params }) {
  const post = await getPostBySlug(params.slug);

  const { html, toc, warnings } = await renderMarkdown(post.content, {
    postSlug: post.slug,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  });

  // warnings はログに出すだけでもOK（v1.2は止めない）
  if (warnings.length) console.warn(`[render warnings] ${post.slug}`, warnings);

  return (
    <article>
      {toc.length >= 2 && (
        <nav>
          <div>On this page</div>
          <ul>
            {toc.map((i) => (
              <li key={i.id} style={{ marginLeft: i.depth === 3 ? 16 : 0 }}>
                <a href={`#${i.id}`}>{i.text}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}
```

---

## 3) 最低限のCSS（アンカー見た目だけ）

（CSSは任意。雰囲気だけ整える用）

```css
/* 例: globals.css */
.heading-anchor {
  margin-right: 0.5rem;
  text-decoration: none;
  opacity: 0.35;
}
h2:hover .heading-anchor,
h3:hover .heading-anchor {
  opacity: 1;
}
```

---

## 4) 実装上の注意（ハマりどころだけ）

* **TOCと見出しIDを一致**させるため、`remarkCollectToc` と `rehypeEnhanceHtml` の両方が **同じ `generateHeadingId()`** を使っています。
* `github-slugger` を **両方で reset** して「同順で生成」するのがポイント（順序がズレると一致しない）。
* 非ASCIIは hash に寄せるので、**見出しを日本語で編集してもURLが大崩れしにくい**（編集で見出し文言が変われば hash は変わる点は仕様通り）。
