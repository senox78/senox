#!/usr/bin/env bun

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type TagRules = {
  aliases?: Record<string, string>;
  ignoreSimilar?: [string, string][];
};

type TagOccurrence = {
  file: string;
  tags: string[];
  update: (tags: string[]) => string;
};

const root = process.cwd();
const contentDirectory = path.join(root, "src/content");
const externalDataPath = path.join(root, "src/data/external.json");
const rulesPath = path.join(root, "src/dev_tools/tag-rules.json");
const fix = process.argv.includes("--fix");
const sort = process.argv.includes("--sort");
const check = process.argv.includes("--check");
const generateRules = process.argv.includes("--generate-rules");
const writeRules = process.argv.includes("--write-rules");
const validOptions = new Set([
  "--fix",
  "--sort",
  "--check",
  "--generate-rules",
  "--write-rules",
  "--help",
  "-h",
]);

if (process.argv.slice(2).some((option) => !validOptions.has(option))) {
  console.error("Unknown option. Use --help to see available options.");
  process.exit(2);
}

if (writeRules && !generateRules) {
  console.error("--write-rules requires --generate-rules.");
  process.exit(2);
}

if (sort && !fix && !check) {
  console.error("--sort requires --fix or --check.");
  process.exit(2);
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(`Usage: bun run tags [--fix] [--sort] [--check]

Checks tag spelling and normalization in src/content and src/data/external.json.

  --fix    apply safe normalization, aliases, and remove duplicate tags per entry
  --sort   sort tags alphabetically after normalization (requires --fix or --check)
  --check                 exit with status 1 when the report contains actionable issues
  --generate-rules        print conservative alias rules inferred from similar tags
  --generate-rules --write-rules
                          add the inferred rules to tag-rules.json

Edit src/dev_tools/tag-rules.json to add project-specific aliases or suppress
known similar-but-distinct tag pairs.`);
  process.exit(0);
}

const normalizeBase = (tag: string) =>
  tag.normalize("NFKC").trim().toLocaleLowerCase("en-US");

const canonicalize = (tag: string, aliases: Map<string, string>) => {
  let result = normalizeBase(tag);
  const visited = new Set<string>();

  while (aliases.has(result) && !visited.has(result)) {
    visited.add(result);
    result = aliases.get(result)!;
  }

  return result;
};

const readMarkdownTags = (
  source: string,
  file: string,
): TagOccurrence | undefined => {
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) return undefined;

  const tagsLine = /^tags:\s*\[([^\]]*)\]\s*$/m.exec(frontmatter[1]);
  if (!tagsLine) return undefined;

  const values =
    tagsLine[1]
      .match(/(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|[^,]+/g)
      ?.map((value) => value.trim())
      .filter(Boolean)
      .map((value) => {
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          return value.slice(1, -1).replace(/\\([\\"'])/g, "$1");
        }
        return value;
      }) ?? [];

  const start =
    frontmatter.index! +
    frontmatter[0].indexOf(frontmatter[1]) +
    tagsLine.index;
  const end = start + tagsLine[0].length;
  return {
    file,
    tags: values,
    update: (tags) =>
      `${source.slice(0, start)}tags: [${tags.map((tag) => JSON.stringify(tag)).join(", ")}]${source.slice(end)}`,
  };
};

const markdownFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return markdownFiles(entryPath);
      return entry.isFile() && entry.name.endsWith(".md") ? [entryPath] : [];
    }),
  );
  return nested.flat();
};

const editDistance = (left: string, right: string) => {
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[right.length];
};

const relative = (file: string) => path.relative(root, file);
const rules = JSON.parse(await readFile(rulesPath, "utf8")) as TagRules;
const aliases = new Map(
  Object.entries(rules.aliases ?? {}).map(([from, to]) => [
    normalizeBase(from),
    normalizeBase(to),
  ]),
);
const ignoredSimilar = new Set(
  (rules.ignoreSimilar ?? []).map(([left, right]) =>
    [normalizeBase(left), normalizeBase(right)].sort().join("\0"),
  ),
);

const occurrences: TagOccurrence[] = [];
for (const file of await markdownFiles(contentDirectory)) {
  const source = await readFile(file, "utf8");
  const occurrence = readMarkdownTags(source, file);
  if (occurrence) occurrences.push(occurrence);
}

const externalSource = await readFile(externalDataPath, "utf8");
const externalEntries = JSON.parse(externalSource) as Array<{ tags?: unknown }>;
externalEntries.forEach((entry, index) => {
  if (
    !Array.isArray(entry.tags) ||
    !entry.tags.every((tag): tag is string => typeof tag === "string")
  )
    return;
  occurrences.push({
    file: `${relative(externalDataPath)}#${index + 1}`,
    tags: entry.tags,
    update: (tags) => {
      externalEntries[index].tags = tags;
      return `${JSON.stringify(externalEntries, null, 2)}\n`;
    },
  });
});

const issues: string[] = [];
const canonicalTags = new Set<string>();
const normalizedTagCounts = new Map<string, number>();
const writes = new Map<string, string>();
const displayFile = (file: string) =>
  file.startsWith(root) ? relative(file) : file;

for (const occurrence of occurrences) {
  const normalized = occurrence.tags.map((tag) => canonicalize(tag, aliases));
  occurrence.tags.forEach((tag) => {
    const normalizedTag = normalizeBase(tag);
    normalizedTagCounts.set(
      normalizedTag,
      (normalizedTagCounts.get(normalizedTag) ?? 0) + 1,
    );
  });
  normalized.forEach((tag) => canonicalTags.add(tag));
  const deduplicated = [...new Set(normalized)];
  const nextTags = sort
    ? [...deduplicated].sort((left, right) =>
        left.localeCompare(right, "en-US", { sensitivity: "base" }),
      )
    : deduplicated;

  occurrence.tags.forEach((tag, index) => {
    if (tag !== normalized[index]) {
      issues.push(
        `${displayFile(occurrence.file)}: ${JSON.stringify(tag)} -> ${JSON.stringify(normalized[index])}`,
      );
    }
  });
  if (deduplicated.length !== normalized.length) {
    issues.push(
      `${displayFile(occurrence.file)}: duplicate tags after normalization`,
    );
  }
  if (sort && deduplicated.join("\0") !== nextTags.join("\0")) {
    issues.push(`${displayFile(occurrence.file)}: tags are not sorted`);
  }

  if (fix && occurrence.tags.join("\0") !== nextTags.join("\0")) {
    const realFile = occurrence.file.split("#", 1)[0];
    writes.set(realFile, occurrence.update(nextTags));
  }
}

const similarPairs: string[] = [];
const tags = [...canonicalTags].sort();
for (let index = 0; index < tags.length; index += 1) {
  for (let other = index + 1; other < tags.length; other += 1) {
    const left = tags[index];
    const right = tags[other];
    const pair = [left, right].join("\0");
    if (ignoredSimilar.has(pair)) continue;
    if (
      Math.min(left.length, right.length) >= 4 &&
      editDistance(left, right) <= 1
    ) {
      similarPairs.push(`${left} <-> ${right}`);
    }
  }
}

const generatedAliases: Record<string, string> = {};
const normalizedTags = [...normalizedTagCounts.keys()].sort();
for (let index = 0; index < normalizedTags.length; index += 1) {
  for (let other = index + 1; other < normalizedTags.length; other += 1) {
    const left = normalizedTags[index];
    const right = normalizedTags[other];
    const pair = [left, right].join("\0");
    if (
      ignoredSimilar.has(pair) ||
      Math.min(left.length, right.length) < 4 ||
      editDistance(left, right) > 1
    ) {
      continue;
    }

    const leftCount = normalizedTagCounts.get(left)!;
    const rightCount = normalizedTagCounts.get(right)!;
    const [from, to] =
      leftCount < rightCount
        ? [left, right]
        : leftCount > rightCount
          ? [right, left]
          : [right, left];
    if (!aliases.has(from)) generatedAliases[from] = to;
  }
}

if (issues.length === 0) console.log("No normalization issues found.");
else {
  console.log("Normalization issues:");
  issues.forEach((issue) => console.log(`  - ${issue}`));
}

if (similarPairs.length > 0) {
  console.log(
    "\nPossibly similar tags (review; these are not changed automatically):",
  );
  similarPairs.forEach((pair) => console.log(`  - ${pair}`));
}

if (fix && writes.size > 0) {
  for (const [file, source] of writes) await writeFile(file, source);
  console.log(`\nUpdated ${writes.size} file(s).`);
}

if (generateRules) {
  const suggestions = Object.fromEntries(
    Object.entries(generatedAliases).sort(([left], [right]) =>
      left.localeCompare(right),
    ),
  );
  if (Object.keys(suggestions).length === 0) {
    console.log("\nNo new conservative alias rules were inferred.");
  } else {
    console.log("\nSuggested aliases (review before applying):");
    console.log(JSON.stringify({ aliases: suggestions }, null, 2));
  }

  if (writeRules && Object.keys(suggestions).length > 0) {
    const nextRules: TagRules = {
      ...rules,
      aliases: { ...rules.aliases, ...suggestions },
    };
    await writeFile(rulesPath, `${JSON.stringify(nextRules, null, 2)}\n`);
    console.log(
      `Added ${Object.keys(suggestions).length} rule(s) to ${relative(rulesPath)}.`,
    );
  }
}

if (check && (issues.length > 0 || similarPairs.length > 0)) process.exit(1);
