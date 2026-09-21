import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const TWEET_URL_RE =
  /^https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/[A-Za-z0-9_]+\/status\/\d+(?:[/?#].*)?$/;
const CACHE_PATH = resolve(process.cwd(), "src/data/x-embeds.json");
const CACHE_TEMP_PATH = `${CACHE_PATH}.tmp`;
const embedRequests = new Map();
let cachePromise;
let cacheWrite = Promise.resolve();

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const normalizeTweetUrl = (value) => {
  const url = new URL(value);
  const match = url.pathname.match(/^\/([A-Za-z0-9_]+)\/status\/(\d+)/);
  return `https://x.com/${match[1]}/status/${match[2]}`;
};

const loadCache = () => {
  cachePromise ??= readFile(CACHE_PATH, "utf8")
    .then((contents) => JSON.parse(contents))
    .catch((error) => {
      if (error?.code !== "ENOENT") {
        console.warn(`[x-embed] Could not read the cache: ${error.message}`);
      }
      return {};
    });
  return cachePromise;
};

const persistCache = (cache) => {
  const contents = `${JSON.stringify(
    Object.fromEntries(
      Object.entries(cache).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
    null,
    2,
  )}\n`;

  cacheWrite = cacheWrite
    .then(() => writeFile(CACHE_TEMP_PATH, contents))
    .then(() => rename(CACHE_TEMP_PATH, CACHE_PATH))
    .catch((error) => {
      console.warn(`[x-embed] Could not update the cache: ${error.message}`);
    });

  return cacheWrite;
};

const prepareEmbedHtml = (html) => {
  const withoutScripts = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .trim();
  if (!/^<blockquote class="twitter-tweet"[\s>]/.test(withoutScripts)) {
    throw new Error("X oEmbed returned unexpected HTML");
  }

  return withoutScripts
    .replace('<blockquote class="twitter-tweet"', '<blockquote class="x-embed"')
    .replace(/<a href=/g, '<a target="_blank" rel="noopener noreferrer" href=');
};

const fetchEmbedHtml = async (url) => {
  const endpoint = new URL("https://publish.twitter.com/oembed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("omit_script", "true");
  endpoint.searchParams.set("dnt", "true");

  const response = await fetch(endpoint, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`X oEmbed returned ${response.status}`);

  const result = await response.json();
  if (typeof result?.html !== "string") {
    throw new Error("X oEmbed response did not contain HTML");
  }
  return prepareEmbedHtml(result.html);
};

const buildFallbackHtml = (url) => {
  const safeUrl = escapeHtml(url);
  return `<blockquote class="x-embed x-embed--fallback" cite="${safeUrl}">
  <a target="_blank" rel="noopener noreferrer" href="${safeUrl}">Xで投稿を見る</a>
</blockquote>`;
};

const buildEmbedHtml = async (sourceUrl) => {
  const url = normalizeTweetUrl(sourceUrl);
  const cache = await loadCache();
  if (typeof cache[url] === "string") return cache[url];

  if (!embedRequests.has(url)) {
    embedRequests.set(
      url,
      fetchEmbedHtml(url)
        .then(async (html) => {
          cache[url] = html;
          await persistCache(cache);
          return html;
        })
        .catch((error) => {
          console.warn(`[x-embed] ${url}: ${error.message}`);
          return buildFallbackHtml(url);
        }),
    );
  }

  return embedRequests.get(url);
};

// A paragraph that is just a bare tweet URL, e.g. one produced by GFM
// autolinking `https://x.com/user/status/123` on its own line.
const extractTweetUrl = (node) => {
  if (node?.type !== "paragraph" || node.children?.length !== 1) return null;

  const child = node.children[0];
  const url =
    child.type === "link" &&
    child.children?.length === 1 &&
    child.children[0]?.type === "text"
      ? child.url
      : child.type === "text"
        ? child.value.trim()
        : null;

  return url && TWEET_URL_RE.test(url) ? url : null;
};

const remarkTwitterEmbed = () => {
  return (tree) => {
    const walk = async (node) => {
      if (!node || !Array.isArray(node.children)) return;

      node.children = await Promise.all(
        node.children.map(async (child) => {
          const url = extractTweetUrl(child);
          if (url) {
            return { type: "html", value: await buildEmbedHtml(url) };
          }
          await walk(child);
          return child;
        }),
      );
    };

    return walk(tree);
  };
};

export default remarkTwitterEmbed;
