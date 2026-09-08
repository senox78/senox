import { visit } from "unist-util-visit";

function isAnonymousRowDelimiter(node) {
  return (
    node.type === "paragraph" &&
    node.children?.length === 1 &&
    node.children[0].type === "text" &&
    node.children[0].value === ":::"
  );
}

function groupAnonymousRowItems(node) {
  const children = [];
  let itemChildren = null;
  let openingDelimiter = null;

  for (const child of node.children || []) {
    if (isAnonymousRowDelimiter(child)) {
      if (itemChildren === null) {
        itemChildren = [];
        openingDelimiter = child;
      } else {
        children.push({
          type: "containerDirective",
          name: "row-item",
          attributes: {},
          children: itemChildren,
        });
        itemChildren = null;
        openingDelimiter = null;
      }
    } else if (itemChildren === null) {
      children.push(child);
    } else {
      itemChildren.push(child);
    }
  }

  // Preserve malformed/unclosed input instead of silently swallowing it.
  if (itemChildren !== null) {
    children.push(openingDelimiter, ...itemChildren);
  }

  node.children = children;
}

export default function remarkDirectiveHandler() {
  return (tree, file) => {
    visit(tree, (node) => {
      if (
        node.type === "containerDirective" ||
        node.type === "leafDirective" ||
        node.type === "textDirective"
      ) {
        // Direct child containers in a row are layout items. Keeping this in
        // the AST (rather than relying on a particular child name) lets
        // authors use any `:::` block as a figure/card-like unit.
        if (node.type === "containerDirective" && node.name === "row") {
          groupAnonymousRowItems(node);

          const blockChildren = node.children?.filter(
            (child) => child.type === "containerDirective",
          );

          if (blockChildren?.length) {
            node.attributes = {
              ...node.attributes,
              class: [node.attributes?.class, "row--blocks"]
                .filter(Boolean)
                .join(" "),
            };

            for (const child of blockChildren) {
              child.attributes = {
                ...child.attributes,
                class: [child.attributes?.class, "row__item"]
                  .filter(Boolean)
                  .join(" "),
              };
            }
          }
        }

        const data = node.data || (node.data = {});

        if (node.name === "details") {
          data.hName = "details";
          data.hProperties = {
            ...node.attributes,
            class:
              "details" +
              (node.attributes?.class ? ` ${node.attributes.class}` : ""),
          };

          // Try to find the label and convert it to <summary>
          if (node.children && node.children.length > 0) {
            const firstChild = node.children[0];
            if (firstChild.data?.directiveLabel) {
              firstChild.data.hName = "summary";
            }
          }
        } else {
          const tagName = node.type === "textDirective" ? "span" : "div";
          data.hName = tagName;
          data.hProperties = {
            ...node.attributes,
            class:
              node.name +
              (node.attributes?.class ? ` ${node.attributes.class}` : ""),
          };
        }
      }

      // Support inline pros/cons list items: `- :+ item` and `- :- item`
      if (node.type === "listItem") {
        const firstPara = node.children?.[0];
        if (firstPara?.type === "paragraph") {
          const firstChild = firstPara.children?.[0];
          if (firstChild?.type === "text") {
            const val = firstChild.value;
            const t = val.trimStart();
            if (t.startsWith(":+ ")) {
              const prefix = val.length - t.length;
              firstChild.value = val.slice(prefix + 3);
              const data = node.data || (node.data = {});
              const prevClass = data.hProperties?.class || "";
              data.hProperties = {
                ...data.hProperties,
                class: ("pros" + (prevClass ? ` ${prevClass}` : "")).trim(),
              };
            } else if (t.startsWith(":- ")) {
              const prefix = val.length - t.length;
              firstChild.value = val.slice(prefix + 3);
              const data = node.data || (node.data = {});
              const prevClass = data.hProperties?.class || "";
              data.hProperties = {
                ...data.hProperties,
                class: ("cons" + (prevClass ? ` ${prevClass}` : "")).trim(),
              };
            }
          }
        }
      }

      // Support + bullet lists as pros lists (for top-level individual pros lists)
      if (node.type === "list" && !node.ordered) {
        const start = node.position?.start;
        const src = typeof file?.value === "string" ? file.value : "";
        if (start && src[start.offset] === "+") {
          const data = node.data || (node.data = {});
          const prevClass = data.hProperties?.class || "";
          data.hProperties = {
            ...(data.hProperties || {}),
            class: ("pros" + (prevClass ? ` ${prevClass}` : "")).trim(),
          };
        }
      }
    });
  };
}
