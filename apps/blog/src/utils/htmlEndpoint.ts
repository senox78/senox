import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { getCollection } from "astro:content";
import {
  createMarkdownProcessor,
  parseFrontmatter,
} from "@astrojs/markdown-remark";
import { remarkPlugins, rehypePlugins } from "../markdown-pipeline.js";

const htmlHeaders = {
  "Content-Type": "text/html; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

const slugPattern = /^[A-Za-z0-9_-]+$/;
const contentRoot = join(process.cwd(), "src", "content");

async function resolveMarkdownPath(slug: string) {
  const target = slug.toLowerCase();
  const entries = await readdir(contentRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.toLowerCase() !== target) {
      continue;
    }

    const articleDir = join(contentRoot, entry.name);
    const files = await readdir(articleDir, { withFileTypes: true });
    const markdownFile = files.find(
      (file) => file.isFile() && file.name.toLowerCase() === `${target}.md`,
    );

    if (markdownFile) {
      return join(articleDir, markdownFile.name);
    }
  }

  return null;
}

export async function getPublishedHtmlPaths() {
  const posts = await getCollection("blog");

  return posts
    .filter((post) => post.data.published !== false)
    .map((post) => ({
      params: { slug: post.id.split("/")[0] },
    }));
}

// The article body is rendered with the exact same remark/rehype pipeline the
// site uses (see src/markdown-pipeline.js), so the HTML matches the published
// article. Build the processor once and reuse it across slugs.
let processorPromise: ReturnType<typeof createMarkdownProcessor> | null = null;
function getProcessor() {
  processorPromise ??= createMarkdownProcessor({
    remarkPlugins,
    rehypePlugins,
  });
  return processorPromise;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("ja-JP");
}

// Strip any <script> elements from the rendered body. The markdown pipeline can
// emit scripts as part of an embed (e.g. the Twitter widget loader); those are
// behaviour, not document content, so they are removed while the surrounding
// markup (the tweet blockquote and its link) is kept. Escaped scripts shown
// inside code blocks are `&lt;script&gt;` text and are left untouched.
function stripScripts(html: string) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

type Frontmatter = {
  title?: unknown;
  description?: unknown;
  date?: unknown;
  latest_edit_at?: unknown;
  tags?: unknown;
};

// Renders the frontmatter as the article header, mirroring the structure the
// site's BlogPost layout produces (title, description, date, edit date, tags).
function renderHeader(frontmatter: Frontmatter) {
  const parts: string[] = [];

  const title =
    typeof frontmatter.title === "string" ? frontmatter.title.trim() : "";
  parts.push(`<h1>${escapeHtml(title)}</h1>`);

  const description =
    typeof frontmatter.description === "string"
      ? frontmatter.description.trim()
      : "";
  if (description) {
    parts.push(`<p class="post-description">${escapeHtml(description)}</p>`);
  }

  const meta: string[] = [];
  const date = toDate(frontmatter.date);
  if (date) {
    meta.push(
      `<time datetime="${date.toISOString()}">${escapeHtml(formatDate(date))}</time>`,
    );
  }

  const editedAt = toDate(frontmatter.latest_edit_at);
  if (editedAt) {
    meta.push(
      `<time datetime="${editedAt.toISOString()}" class="last-modified">` +
        `<span class="time-arrow">⇒</span>` +
        `<span>${escapeHtml(formatDate(editedAt))}</span>` +
        `</time>`,
    );
  }

  const tags = Array.isArray(frontmatter.tags)
    ? frontmatter.tags.filter((tag): tag is string => typeof tag === "string")
    : [];
  if (tags.length > 0) {
    const tagSpans = tags
      .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
      .join("");
    meta.push(`<div class="tags">${tagSpans}</div>`);
  }

  if (meta.length > 0) {
    parts.push(`<div class="post-meta">${meta.join("")}</div>`);
  }

  return parts.join("\n    ");
}

// Static site footer, mirroring src/components/Footer.astro's markup (without
// the scoped styles). The version/build metadata computed there is not part of
// the rendered footer, so it is intentionally omitted here too.
const FOOTER = `<footer>
  <div class="footer-content">
    <div class="copy-right">
      <p>&copy; 2026 Uliboooo. All rights reserved.</p>
    </div>
    <div class="site-info">
      <p>
        <a href="https://github.com/Uliboooo/blog" target="_blank" rel="noopener noreferrer" class="link--underline link--external">View Source</a>
      </p>
    </div>
  </div>
  <section class="why-snails">
    <div class="why-snail-c">
      <h2>Why "Compute on Snails" ?</h2>
      <p>
        ハードウェアに依らない抽象化された計算機を、「計算機の要件を満たすのならばカタツムリの上で計算してもいい」という冗談から。
      </p>
    </div>
  </section>
</footer>`;

// Builds a self-contained, parseable HTML document: a minimal <head> (charset,
// viewport, title, description) plus the article (frontmatter header + main
// content) and the site footer. No stylesheet, theme script, or other page
// chrome — just the document.
function buildDocument(frontmatter: Frontmatter, body: string) {
  const title =
    typeof frontmatter.title === "string" ? frontmatter.title.trim() : "";
  const description =
    typeof frontmatter.description === "string"
      ? frontmatter.description.trim()
      : "";

  const head = [
    `<meta charset="utf-8" />`,
    `<meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `<title>${escapeHtml(title)}</title>`,
    description
      ? `<meta name="description" content="${escapeHtml(description)}" />`
      : "",
  ]
    .filter(Boolean)
    .join("\n    ");

  return `<!doctype html>
<html lang="ja">
  <head>
    ${head}
  </head>
  <body>
    <main>
      <article class="prose">
        ${renderHeader(frontmatter)}
        ${body}
      </article>
    </main>
    ${FOOTER}
  </body>
</html>
`;
}

export async function getHtmlResponse(slug: string) {
  if (!slugPattern.test(slug)) {
    return new Response("Not found", { status: 404 });
  }

  const markdownPath = await resolveMarkdownPath(slug);
  if (!markdownPath) {
    return new Response("Not found", { status: 404 });
  }

  const source = await readFile(markdownPath, "utf-8");
  const { frontmatter, content } = parseFrontmatter(source);

  const processor = await getProcessor();
  const { code } = await processor.render(content);

  return new Response(buildDocument(frontmatter, stripScripts(code)), {
    headers: htmlHeaders,
  });
}
