import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { blogPath } from "../utils/paths";

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

export const GET: APIRoute = async ({ site }) => {
  if (!site) throw new Error("Astro site must be configured to generate RSS");

  const posts = (await getCollection("blog"))
    .filter((post) => post.data.published !== false)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  const feedUrl = new URL(blogPath("/rss.xml"), site).href;
  const homeUrl = new URL(blogPath("/"), site).href;

  const items = posts.map((post) => {
    const slug = post.id.split("/")[0];
    const url = new URL(blogPath(`/${slug}/`), site).href;
    return [
      "    <item>",
      `      <title>${escapeXml(post.data.title)}</title>`,
      `      <link>${escapeXml(url)}</link>`,
      `      <guid>${escapeXml(url)}</guid>`,
      `      <pubDate>${post.data.date.toUTCString()}</pubDate>`,
      post.data.description
        ? `      <description>${escapeXml(post.data.description)}</description>`
        : undefined,
      "    </item>",
    ]
      .filter(Boolean)
      .join("\n");
  });

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "  <channel>",
    "    <title>Compute on Snails</title>",
    `    <link>${escapeXml(homeUrl)}</link>`,
    "    <description>Compute on Snails</description>",
    `    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
};
