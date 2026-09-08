#!/usr/bin/env bun

import { Glob } from "bun";
import path from "node:path";

type Article = {
  path: string;
  published: boolean;
  title: string;
};

const projectRoot = path.resolve(import.meta.dirname, "../..");
const contentRoot = path.join(projectRoot, "src/content");

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

const readFrontmatter = (source: string, filePath: string): Article => {
  const frontmatter = source.match(
    /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/,
  )?.[1];
  if (frontmatter === undefined)
    return fail(`Missing frontmatter: ${filePath}`);

  const title = frontmatter.match(/^title:\s*["']?(.*?)["']?\s*$/m)?.[1];
  const published = frontmatter.match(/^published:\s*(true|false)\s*$/m)?.[1];

  if (title === undefined) return fail(`Missing title: ${filePath}`);
  if (published === undefined)
    return fail(`Missing published state: ${filePath}`);

  return { path: filePath, title, published: published === "true" };
};

if (!Bun.which("fzf")) {
  fail("fzf is required.");
}
if (!Bun.which("nvim")) {
  fail("nvim is required.");
}

const glob = new Glob("**/*.md");
const articles = await Array.fromAsync(glob.scan({ cwd: contentRoot })).then(
  async (files) =>
    Promise.all(
      files.map(async (file) => {
        const filePath = path.join(contentRoot, file);
        return readFrontmatter(await Bun.file(filePath).text(), filePath);
      }),
    ),
);

if (articles.length === 0) {
  fail("No articles found.");
}

const candidates = articles
  .sort((a, b) => a.title.localeCompare(b.title, "ja"))
  .map(({ path: filePath, published, title }) =>
    [title, published ? "public" : "draft", filePath].join("\t"),
  )
  .join("\n");

const fzf = Bun.spawn(
  ["fzf", "--delimiter=\t", "--with-nth=1,2", "--prompt=Article> "],
  { stdin: "pipe", stdout: "pipe", stderr: "inherit" },
);
fzf.stdin.write(candidates);
fzf.stdin.end();

const selected = (await new Response(fzf.stdout).text()).trimEnd();
if ((await fzf.exited) !== 0 || !selected) {
  process.exit(0);
}

const selectedPath =
  selected.split("\t").at(-1) ??
  fail("Could not read the selected article path.");

const nvim = Bun.spawn(["nvim", selectedPath], {
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

process.exit(await nvim.exited);
