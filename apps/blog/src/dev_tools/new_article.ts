#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import prompts from "prompts";
import { generateSlugFromGemini, normalizeSlug } from "./generate_slug";

// Resolve paths from this script instead of the caller's working directory.
// `./new` is also exposed at the monorepo root, so cwd may be either the
// repository root or apps/blog.
const project_root = path.resolve(import.meta.dir, "../..");
const has_project_manifest = existsSync(path.join(project_root, "package.json"));

if (!has_project_manifest) {
  console.error(`Could not locate the blog project at ${project_root}`);

  process.exit(1);
}

const resp = await prompts([
  {
    type: "text",
    name: "title",
    message: "input a new article title",
  },
  {
    type: "text",
    name: "slug",
    message: "slug (leave empty to generate with Gemini)",
  },
  {
    type: "text",
    name: "desc",
    message: "description of new article",
  },
  {
    type: "text",
    name: "tags",
    message: "enter the values separated by ` ` or `,`.",
  },
  {
    type: "confirm",
    name: "is_public",
    message: "is public?",
    initial: true,
  },
]);

if (!resp.title) {
  console.error("canceled");
  process.exit(1);
}

const print_title = (resp.title ?? "").trim();

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

const input_slug = String(resp.slug ?? "").trim();
const slug = input_slug
  ? normalizeSlug(input_slug)
  : await generateSlugFromGemini({
      title: print_title,
      description: String(resp.desc ?? "").trim(),
    });

if (!slug) {
  fail("failed to generate slug.");
}

const now = new Date();
const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
  now.getDate(),
).padStart(2, "0")}`;

const tags = String(resp.tags ?? "")
  .split(/[ ,]+/)
  .map((s) => s.trim())
  .filter(Boolean);

const input_meta_data = {
  title: print_title,
  date: formatted,
  description: resp.desc ?? "",
  tags: tags,
  published: resp.is_public,
};

const frontmatter = [
  "---",
  `title: "${input_meta_data.title}"`,
  `date: ${input_meta_data.date}`,
  `description: "${input_meta_data.description}"`,
  `tags: [${input_meta_data.tags.map((t) => `"${t}"`).join(", ")}]`,
  `published: ${input_meta_data.published}`,
  "---",
  "",
].join("\n");

const article_path = path.join(project_root, "src/content", slug, `${slug}.md`);
const display_path = path.relative(process.cwd(), article_path);
const file = Bun.file(article_path);

if (await file.exists()) {
  console.error("already exists article, please rename.");
  process.exit(1);
}

try {
  await mkdir(path.dirname(article_path), { recursive: true });
  await Bun.write(article_path, frontmatter);
} catch (e) {
  fail(`failed write: ${e instanceof Error ? e.message : String(e)}`);
}

console.log(`created at ${display_path}`);
