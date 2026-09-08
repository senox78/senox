const TWEET_URL_RE =
  /^https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/[A-Za-z0-9_]+\/status\/\d+(?:[/?#].*)?$/;

const buildEmbedHtml = (url) => `<blockquote class="twitter-tweet">
    <p lang="ja" dir="ltr"></p>
    <a href="${url}"></a>
</blockquote>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>`;

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
    const walk = (node) => {
      if (!node || !Array.isArray(node.children)) return;

      node.children = node.children.map((child) => {
        const url = extractTweetUrl(child);
        if (url) {
          return { type: "html", value: buildEmbedHtml(url) };
        }
        walk(child);
        return child;
      });
    };

    walk(tree);
  };
};

export default remarkTwitterEmbed;
