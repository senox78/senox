const extractTitleFromCode = (node) => {
  if (!node || typeof node.lang !== "string") return null;

  const hasSuffix = node.lang.endsWith(":");
  if (hasSuffix) {
    node.lang = node.lang.slice(0, -1) || undefined;
  }

  if (!hasSuffix || typeof node.meta !== "string") return null;

  const title = node.meta.trim();
  return title.length > 0 ? title : null;
};

const createTitleNode = (title) => ({
  type: "paragraph",
  data: {
    hProperties: {
      className: ["code-title"],
    },
  },
  children: [{ type: "text", value: title }],
});

const remarkCodeTitle = () => {
  return (tree) => {
    const walk = (node) => {
      if (!node || !Array.isArray(node.children)) return;

      const nextChildren = [];
      for (const child of node.children) {
        if (child?.type === "code") {
          const title = extractTitleFromCode(child);
          if (title) {
            nextChildren.push(createTitleNode(title));
          }
          nextChildren.push(child);
          continue;
        }

        walk(child);
        nextChildren.push(child);
      }

      node.children = nextChildren;
    };

    walk(tree);
  };
};

export default remarkCodeTitle;
