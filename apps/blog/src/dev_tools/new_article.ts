#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import prompts from "prompts";

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

const normalize_slug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w-]/g, "");

const has_japanese = (value: string) =>
  /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(value);

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

const generate_slug_from_gemini = async (title: string) => {
  const api_key = process.env.GEMINI_API_KEY;
  if (!api_key) {
    fail("GEMINI_API_KEY is required to generate slug for Japanese titles.");
  }

  const model = "gemini-3.5-flash-lite";

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${api_key}`;
  const prompt = [
    "Generate a concise URL slug in lowercase ASCII for the blog title below.",
    "Use only letters a-z, numbers 0-9, and hyphens. Return ONLY the slug.",
    "If the title isn’t in English, translate it naturally and generate a slug.",
    `Title: ${title}`,
  ].join("\n");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 24 },
    }),
  });

  if (!response.ok) {
    const error_text = await response.text();
    fail(
      `Gemini API request failed: ${response.status} ${response.statusText} ${error_text}`,
    );
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const raw_slug = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  const generated_slug = raw_slug ?? fail("Gemini API returned empty slug.");

  const normalized = normalize_slug(generated_slug);
  if (!normalized || !/^[a-z0-9_-]+$/.test(normalized)) {
    fail(`Gemini API returned invalid slug: ${raw_slug}`);
  }

  return normalized;
};

const slug = has_japanese(print_title)
  ? await generate_slug_from_gemini(print_title)
  : normalize_slug(print_title);

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
