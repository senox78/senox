#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { rename } from "node:fs/promises";
import path from "node:path";
import { generateSlugFromGemini } from "./generate_slug";

const projectRoot = path.resolve(import.meta.dir, "../..");
const contentRoot = path.join(projectRoot, "src/content");

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Usage: bun run slug <article.md>

Regenerate an article slug from its title, description, and Markdown body, then
rename the article file (and its containing directory when applicable).

GEMINI_API_KEY must be set.`);
  process.exit(0);
}

const input = process.argv[2] ?? fail("Usage: bun run slug <article.md>");
const articlePath = [
  path.resolve(process.cwd(), input),
  path.resolve(projectRoot, input),
  path.resolve(projectRoot, "../..", input),
].find((candidate) => existsSync(candidate)) ??
  path.resolve(process.cwd(), input);
const relativePath = path.relative(contentRoot, articlePath);

if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
  fail(`Article must be inside ${contentRoot}`);
}
if (!articlePath.endsWith(".md") || !existsSync(articlePath)) {
  fail(`Article not found: ${articlePath}`);
}

const source = await Bun.file(articlePath).text();
const frontmatterMatch =
  source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/) ??
  fail(`Missing frontmatter: ${articlePath}`);

const [frontmatterBlock, frontmatter] = frontmatterMatch;
const readString = (name: string) => {
  const value = frontmatter.match(
    new RegExp(`^${name}:\\s*(?:"([^"]*)"|'([^']*)'|(.*?))\\s*$`, "m"),
  );
  return value?.[1] ?? value?.[2] ?? value?.[3]?.trim() ?? "";
};
const title = readString("title");
if (!title) fail(`Missing title: ${articlePath}`);

const slug = await generateSlugFromGemini({
  title,
  description: readString("description"),
  content: source.slice(frontmatterBlock.length).trim(),
});

const currentDirectory = path.dirname(articlePath);
const currentBasename = path.basename(articlePath, ".md");
const isArticleDirectory =
  currentDirectory !== contentRoot &&
  path.basename(currentDirectory) === currentBasename;

if (currentDirectory !== contentRoot && !isArticleDirectory) {
  fail(
    "Nested articles must use src/content/<slug>/<slug>.md before they can be renamed.",
  );
}

const destination = isArticleDirectory
  ? path.join(contentRoot, slug)
  : path.join(contentRoot, `${slug}.md`);

if (destination === (isArticleDirectory ? currentDirectory : articlePath)) {
  console.log(`Slug is unchanged: ${slug}`);
  process.exit(0);
}
if (existsSync(destination)) fail(`Destination already exists: ${destination}`);

if (isArticleDirectory) {
  const renamedArticle = path.join(currentDirectory, `${slug}.md`);
  if (existsSync(renamedArticle)) {
    fail(`Destination already exists: ${renamedArticle}`);
  }
  await rename(articlePath, renamedArticle);
  await rename(currentDirectory, destination);
} else {
  await rename(articlePath, destination);
}

const renamedPath = isArticleDirectory
  ? path.join(destination, `${slug}.md`)
  : destination;
console.log(`${relativePath} -> ${path.relative(contentRoot, renamedPath)}`);
