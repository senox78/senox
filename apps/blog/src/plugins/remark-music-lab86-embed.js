const getMusicLinkUrl = (url) => {
  try {
    const parsed = new URL(url);
    const isMusicLink =
      parsed.protocol === "https:" &&
      parsed.hostname.toLowerCase() === "music.lab86.io" &&
      parsed.pathname.startsWith("/link/");

    return isMusicLink ? parsed.href : null;
  } catch {
    return null;
  }
};

const metadataRequests = new Map();

const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getMetaContent = (html, name) => {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const metaTag = metaTags.find((tag) =>
    new RegExp(`(?:property|name)=["']${name}["']`, "i").test(tag),
  );
  const content = metaTag?.match(/content=["']([^"']*)["']/i)?.[1];

  return content?.replace(/&amp;/g, "&") ?? null;
};

const splitTrackTitle = (title) => {
  const separator = title.lastIndexOf(" by ");
  return separator > 0
    ? { title: title.slice(0, separator), artist: title.slice(separator + 4) }
    : { title, artist: "" };
};

const getMusicMetadata = (url) => {
  if (!metadataRequests.has(url)) {
    metadataRequests.set(
      url,
      fetch(url)
        .then(async (response) => {
          if (!response.ok) throw new Error(`Music Link returned ${response.status}`);

          const html = await response.text();
          const title = getMetaContent(html, "og:title");
          const artworkUrl = getMetaContent(html, "og:image");
          if (!title || !artworkUrl) throw new Error("Music Link metadata is missing");

          return { ...splitTrackTitle(title), artworkUrl };
        })
        .catch(() => ({ title: "Music Link", artist: "", artworkUrl: null })),
    );
  }

  return metadataRequests.get(url);
};

const getServiceName = (url) => {
  const service = new URL(url).pathname.split("/")[2] ?? "music";
  return service.replace(/\b\w/g, (character) => character.toUpperCase());
};

const buildEmbedHtml = async (url) => {
  const [{ title, artist, artworkUrl }, service] = await Promise.all([
    getMusicMetadata(url),
    getServiceName(url),
  ]);
  const safeUrl = escapeHtml(url);
  const artwork = artworkUrl
    ? `<img src="${escapeHtml(artworkUrl)}" alt="" loading="lazy" />`
    : `<span class="music-link-card__artwork-fallback" aria-hidden="true">♫</span>`;
  const artistMarkup = artist
    ? `<p class="music-link-card__artist">${escapeHtml(artist)}</p>`
    : "";

  return `<a class="music-link-card" href="${safeUrl}" target="_blank" rel="noopener noreferrer">
  <span class="music-link-card__artwork">${artwork}</span>
  <span class="music-link-card__content">
    <span class="music-link-card__eyebrow">Track on ${escapeHtml(service)}</span>
    <strong class="music-link-card__title">${escapeHtml(title)}</strong>
    ${artistMarkup}
    <span class="music-link-card__button">Open in ${escapeHtml(service)} <span aria-hidden="true">↗</span></span>
  </span>
</a>`;
};

// A paragraph that is just a bare music.lab86.io link, including one produced
// by GFM autolinking, becomes the service's native track card.
const extractMusicLinkUrl = (node) => {
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

  return url ? getMusicLinkUrl(url) : null;
};

const remarkMusicLab86Embed = () => {
  return (tree) => {
    const walk = async (node) => {
      if (!node || !Array.isArray(node.children)) return;

      node.children = await Promise.all(node.children.map(async (child) => {
        const url = extractMusicLinkUrl(child);
        if (url) {
          return { type: "html", value: await buildEmbedHtml(url) };
        }
        await walk(child);
        return child;
      }));
    };

    return walk(tree);
  };
};

export default remarkMusicLab86Embed;
