// @ts-check
import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import pkg from "./package.json" with { type: "json" };
// import wasm from 'vite-plugin-wasm'
// import topLevelAwait from 'vite-plugin-top-level-await'
import { existsSync, readFileSync } from "node:fs";
import { remarkPlugins, rehypePlugins } from "./src/markdown-pipeline.js";

function readCommit() {
  const environmentCommit =
    process.env.CF_PAGES_COMMIT_SHA ?? process.env.GITHUB_SHA;
  if (environmentCommit) return environmentCommit.slice(0, 7);

  const gitDir = new URL("../../.git/", import.meta.url);
  try {
    const head = readFileSync(new URL("HEAD", gitDir), "utf8").trim();
    if (!head.startsWith("ref: ")) return head.slice(0, 7);

    const ref = head.slice(5);
    const looseRef = new URL(ref, gitDir);
    if (existsSync(looseRef)) {
      return readFileSync(looseRef, "utf8").trim().slice(0, 7);
    }

    const packedRefs = readFileSync(new URL("packed-refs", gitDir), "utf8");
    return (
      packedRefs
        .split("\n")
        .find((line) => line.endsWith(` ${ref}`))
        ?.split(" ")[0]
        ?.slice(0, 7) ?? "unknown"
    );
  } catch {
    return "unknown";
  }
}

const commit = readCommit();

export default defineConfig({
  site: "https://senox.cc",
  base: "/blog",
  outDir: "../../dist/blog",

  server: {
    host: true,
    allowedHosts: true,
  },

  image: {
    service: {
      entrypoint: "astro/assets/services/sharp",
    },
  },

  markdown: {
    processor: unified({ remarkPlugins, rehypePlugins }),
  },

  vite: {
    optimizeDeps: {
      exclude: [
        "@myriaddreamin/typst.ts",
        "@myriaddreamin/typst-ts-renderer",
        "@myriaddreamin/typst-ts-web-compiler",
      ],
    },
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __COMMIT_HASH__: JSON.stringify(commit),
    },
  },
});
