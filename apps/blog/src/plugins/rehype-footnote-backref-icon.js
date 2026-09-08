// Replace the default GFM footnote backref glyph (↩, U+21A9) with an inline
// SVG icon. On iOS the bare U+21A9 code point is rendered as a colored emoji
// (a blue rounded square), which clashes with the surrounding text. Swapping it
// for a `currentColor` SVG keeps the return arrow consistent across platforms.

const BACKREF_GLYPH = "↩"; // ↩

const buildIcon = () => ({
  type: "element",
  tagName: "svg",
  properties: {
    className: ["footnote-backref-icon"],
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    width: "1em",
    height: "1em",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    focusable: "false",
  },
  children: [
    {
      type: "element",
      tagName: "polyline",
      properties: { points: "9 10 4 15 9 20" },
      children: [],
    },
    {
      type: "element",
      tagName: "path",
      properties: { d: "M20 4v7a4 4 0 0 1-4 4H4" },
      children: [],
    },
  ],
});

const isBackref = (node) => {
  if (node?.type !== "element" || node.tagName !== "a") return false;
  const className = node.properties?.className;
  const classes = Array.isArray(className)
    ? className
    : typeof className === "string"
      ? className.split(/\s+/)
      : [];
  return (
    classes.includes("data-footnote-backref") ||
    node.properties?.dataFootnoteBackref !== undefined
  );
};

const rehypeFootnoteBackrefIcon = () => {
  return (tree) => {
    const walk = (node) => {
      if (!node || !Array.isArray(node.children)) return;

      if (isBackref(node)) {
        node.children = node.children.map((child) =>
          child.type === "text" && child.value.trim() === BACKREF_GLYPH
            ? buildIcon()
            : child,
        );
        return;
      }

      node.children.forEach(walk);
    };

    walk(tree);
  };
};

export default rehypeFootnoteBackrefIcon;
