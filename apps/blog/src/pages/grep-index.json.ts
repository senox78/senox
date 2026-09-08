import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import { remarkPlugins, rehypePlugins } from "../markdown-pipeline.js";
import externalPosts from "../data/external.json";
import { blogPath } from "../utils/paths";

export const prerender = true;

type HastNode = {
  type?: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

type GrepLine = {
  text: string;
  anchor?: string;
};

const blockTags = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "pre",
  "li",
  "figcaption",
  "summary",
]);

function textContent(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textContent).join("");
}

function idOf(node: HastNode): string | undefined {
  const id = node.properties?.id;
  return typeof id === "string" && id ? id : undefined;
}

function collectLines(tree: HastNode): GrepLine[] {
  const lines: GrepLine[] = [];
  let currentAnchor: string | undefined;

  const push = (text: string, anchor?: string) => {
    for (const rawLine of text.split(/\r?\n/)) {
      const normalized = rawLine.replace(/\s+/g, " ").trim();
      if (normalized) lines.push({ text: normalized, anchor });
    }
  };

  const walk = (node: HastNode, insideBlock = false) => {
    if (node.type !== "element") {
      for (const child of node.children ?? []) walk(child, insideBlock);
      return;
    }

    const tag = node.tagName ?? "";
    const isHeading = /^h[1-6]$/.test(tag);
    if (isHeading) currentAnchor = idOf(node) ?? currentAnchor;

    if (blockTags.has(tag) && !insideBlock) {
      push(textContent(node), isHeading ? idOf(node) : currentAnchor);
      return;
    }

    for (const child of node.children ?? []) {
      walk(child, insideBlock || blockTags.has(tag));
    }
  };

  walk(tree);
  return lines;
}

function captureRenderedText(setLines: (lines: GrepLine[]) => void) {
  return () => (tree: HastNode) => setLines(collectLines(tree));
}

export const GET: APIRoute = async () => {
  const posts = (await getCollection("blog"))
    .filter((post) => post.data.published !== false)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  const articles = [];
  for (const post of posts) {
    let lines: GrepLine[] = [];
    const processor = await createMarkdownProcessor({
      remarkPlugins,
      rehypePlugins: [
        ...rehypePlugins,
        captureRenderedText((value) => {
          lines = value;
        }),
      ],
    });
    await processor.render(post.body ?? "");

    articles.push({
      title: post.data.title,
      url: blogPath(`/${post.id.split("/")[0]}/`),
      lines,
    });
  }

  for (const post of externalPosts) {
    if (!post.published) continue;
    articles.push({
      title: post.title,
      url: post.url,
      lines: [],
    });
  }

  return new Response(JSON.stringify({ articles }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
