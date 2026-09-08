import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { getCollection } from "astro:content";

const markdownHeaders = {
  "Content-Type": "text/plain; charset=utf-8",
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

export async function getPublishedMarkdownPaths() {
  const posts = await getCollection("blog");

  return posts
    .filter((post) => post.data.published !== false)
    .map((post) => ({
      params: { slug: post.id.split("/")[0] },
    }));
}

export async function getMarkdownResponse(slug: string) {
  if (!slugPattern.test(slug)) {
    return new Response("Not found", { status: 404 });
  }

  const markdownPath = await resolveMarkdownPath(slug);
  if (!markdownPath) {
    return new Response("Not found", { status: 404 });
  }

  const source = await readFile(markdownPath, "utf-8");

  return new Response(source, { headers: markdownHeaders });
}
