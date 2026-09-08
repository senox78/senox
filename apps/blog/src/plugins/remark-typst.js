import { visit } from "unist-util-visit";

const FOOTNOTE_OPEN = "#footnote[";
const HEADING_MARKER = /^(={1,5})[ \t]+/;
// `#quote[...]` / `#quote(attribution: "...", url: "...")[...]` at the start
// of a block. Arguments must not contain `)`.
const QUOTE_OPEN = /^#quote(?:\(([^)]*)\))?[ \t]*\[/;

// Typst-style syntax on top of markdown:
//   *strong* / _emphasis_  (CommonMark parses both as emphasis; the
//   original delimiter is recovered from the source via position offsets)
//   #footnote[content]     (inline footnote, auto-numbered)
//   #quote(...)[content]   (blockquote with an optional source line)
//   = heading              (`=` is h2 ... `=====` is h6; h1 is the title)
export default function remarkTypst() {
  return (tree, file) => {
    const src = typeof file?.value === "string" ? file.value : String(file);

    typstQuotes(tree, src);
    typstHeadings(tree);

    visit(tree, "emphasis", (node) => {
      const offset = node.position?.start?.offset;
      if (offset != null && src[offset] === "*") {
        node.type = "strong";
      }
    });

    const definitions = [];
    let counter = 0;

    visit(tree, (node) => {
      if (!Array.isArray(node.children)) return;
      if (node.type === "footnoteDefinition") return;

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child.type !== "text") continue;

        const open = child.value.indexOf(FOOTNOTE_OPEN);
        if (open === -1) continue;

        const match = findClosing(
          node.children,
          i,
          open + FOOTNOTE_OPEN.length,
        );
        if (!match) continue;

        const identifier = `fn-${++counter}`;
        const before = child.value.slice(0, open);
        const contentHead = child.value.slice(open + FOOTNOTE_OPEN.length);

        // Inline nodes making up the footnote content: the tail of the
        // opening text node, any whole siblings in between, and the head
        // of the closing text node.
        const content = [];
        if (match.endIndex === i) {
          const inner = child.value.slice(
            open + FOOTNOTE_OPEN.length,
            match.endOffset,
          );
          if (inner) content.push({ type: "text", value: inner });
        } else {
          if (contentHead) content.push({ type: "text", value: contentHead });
          content.push(...node.children.slice(i + 1, match.endIndex));
          const closing = node.children[match.endIndex];
          const closingHead = closing.value.slice(0, match.endOffset);
          if (closingHead) content.push({ type: "text", value: closingHead });
        }

        definitions.push({
          type: "footnoteDefinition",
          identifier,
          label: identifier,
          children: [{ type: "paragraph", children: content }],
        });

        const closingTail = node.children[match.endIndex].value.slice(
          match.endOffset + 1,
        );
        const replacement = [];
        if (before) replacement.push({ type: "text", value: before });
        replacement.push({
          type: "footnoteReference",
          identifier,
          label: identifier,
        });
        if (closingTail) replacement.push({ type: "text", value: closingTail });

        node.children.splice(i, match.endIndex - i + 1, ...replacement);
        // Re-scan from the node after the reference (closingTail may hold
        // another #footnote[).
        i = i + replacement.length - (closingTail ? 2 : 1);
      }
    });

    if (definitions.length > 0) {
      tree.children.push(...definitions);
    }
  };
}

// CommonMark parses a `= heading` line as a plain paragraph, so headings are
// recovered from those paragraphs here. A marker line must form a paragraph of
// its own (i.e. have a blank line before it): otherwise it is a lazy
// continuation of the preceding paragraph and stays body text.
function typstHeadings(tree) {
  visit(tree, "paragraph", (node, _index, parent) => {
    // A list item never holds a heading, and `- = ...` is ordinary text.
    if (parent?.type === "listItem") return;

    const first = node.children[0];
    if (first?.type !== "text") return;

    const match = HEADING_MARKER.exec(first.value);
    if (!match) return;

    // Multi-line paragraphs are left alone: the marker line cannot be split
    // off without cutting through inline nodes.
    if (
      node.children.some(
        (child) => child.type === "text" && child.value.includes("\n"),
      )
    )
      return;

    const head = first.value.slice(match[0].length);
    if (!head && node.children.length === 1) return;

    if (head) first.value = head;
    else node.children.shift();

    node.type = "heading";
    node.depth = match[1].length + 1;
  });
}

// `#quote(attribution: "...", url: "...")[ ... ]` becomes a <figure> holding a
// <blockquote> and a <figcaption><cite> source line (a bare <blockquote> when
// no argument is given). The opener must start a block; the body may span
// several blocks (paragraphs, lists, ...) up to the matching `]`, so the
// closing bracket can sit on a line of its own.
function typstQuotes(tree, src) {
  visit(tree, (node) => {
    if (!Array.isArray(node.children)) return;

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.type !== "paragraph" || !child.position) continue;

      const start = child.position.start.offset;
      const match = QUOTE_OPEN.exec(
        src.slice(start, child.position.end.offset),
      );
      if (!match) continue;

      // Content spans from just past `[` to the matching `]`.
      const from = start + match[0].length;
      const to = findClosingInSource(src, from);
      if (to == null) continue;

      // The blocks holding the body: from this paragraph up to the one the
      // closing bracket falls in (a `]` on a line of its own is a block that
      // starts exactly at `to`).
      let last = i;
      while (
        last + 1 < node.children.length &&
        node.children[last + 1].position?.start?.offset <= to
      ) {
        last++;
      }
      if (!(node.children[last].position?.end?.offset >= to)) continue;

      const body = node.children
        .slice(i, last + 1)
        .map((block) => sliceBlock(block, from, to))
        .filter(Boolean);

      node.children.splice(
        i,
        last - i + 1,
        buildQuote(parseArgs(match[1]), body),
      );
    }
  });
}

// Splits `key: "value"` pairs. Unquoted values run to the next comma.
function parseArgs(str) {
  const args = {};
  if (!str) return args;

  const pair = /(\w+)[ \t]*:[ \t]*(?:"([^"]*)"|'([^']*)'|([^,]+))/g;
  let match;
  while ((match = pair.exec(str))) {
    args[match[1]] = (match[2] ?? match[3] ?? match[4] ?? "").trim();
  }
  return args;
}

function buildQuote({ attribution, url }, body) {
  const blockquote = { type: "blockquote", children: body };
  if (url) blockquote.data = { hProperties: { cite: url } };
  if (!attribution && !url) return blockquote;

  const label = attribution || url;
  const source = url
    ? { type: "link", url, children: [{ type: "text", value: label }] }
    : { type: "text", value: label };

  return {
    type: "quoteFigure",
    data: { hName: "figure", hProperties: { class: "quote" } },
    children: [
      blockquote,
      {
        type: "quoteCaption",
        data: { hName: "figcaption" },
        children: [
          { type: "quoteCite", data: { hName: "cite" }, children: [source] },
        ],
      },
    ],
  };
}

// Trims a block down to the part of it inside [from, to) of the source,
// dropping inline nodes that fall outside. Returns null once nothing is left.
function sliceBlock(node, from, to) {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;
  if (start == null || end == null) return node;
  if (start >= from && end <= to) return node;
  if (!Array.isArray(node.children)) return node;

  const kept = [];
  for (const child of node.children) {
    const childStart = child.position?.start?.offset;
    const childEnd = child.position?.end?.offset;
    if (childStart == null || childEnd == null) {
      kept.push(child);
      continue;
    }
    if (childEnd <= from || childStart >= to) continue;
    if (child.type === "text" && (childStart < from || childEnd > to)) {
      const value = child.value.slice(
        Math.max(from - childStart, 0),
        Math.min(to - childStart, child.value.length),
      );
      if (value) kept.push({ ...child, value });
      continue;
    }
    kept.push(child);
  }

  if (kept.length === 0) return null;
  if (kept.every((child) => child.type === "text" && !child.value.trim()))
    return null;

  let contentStart = Math.max(kept[0].position?.start?.offset ?? from, from);
  let contentEnd = Math.min(
    kept[kept.length - 1].position?.end?.offset ?? to,
    to,
  );

  // The opener and the closing bracket sit on their own lines in the common
  // case, which leaves the body with a leading/trailing newline.
  const first = kept[0];
  if (first.type === "text") {
    const lead = /^[ \t]*\n/.exec(first.value);
    if (lead) {
      first.value = first.value.slice(lead[0].length);
      contentStart += lead[0].length;
    }
  }
  const tail = kept[kept.length - 1];
  if (tail.type === "text") {
    const trailing = /\s+$/.exec(tail.value);
    if (trailing) {
      tail.value = tail.value.slice(0, -trailing[0].length);
      contentEnd -= trailing[0].length;
    }
  }

  // Narrowed to the retained range so the block is not mistaken for another
  // `#quote(` opener when the tree is re-visited (and so a nested quote is
  // still found at its real offsets).
  return {
    ...node,
    children: kept,
    position: {
      start: { ...node.position.start, offset: contentStart },
      end: { ...node.position.end, offset: contentEnd },
    },
  };
}

// Finds the `]` matching an already-consumed `[` in the raw source, starting
// at `from`. Returns its offset, or null if unbalanced.
function findClosingInSource(src, from) {
  let depth = 1;
  for (let pos = from; pos < src.length; pos++) {
    const ch = src[pos];
    if (ch === "[") depth++;
    else if (ch === "]" && --depth === 0) return pos;
  }
  return null;
}

// Finds the `]` matching an already-consumed `[`, scanning text siblings
// from children[startIndex] at text offset startOffset. Non-text siblings
// (emphasis, links, ...) are treated as opaque content. Returns
// { endIndex, endOffset } of the closing bracket, or null if unbalanced.
function findClosing(children, startIndex, startOffset) {
  let depth = 1;
  for (let idx = startIndex; idx < children.length; idx++) {
    const sibling = children[idx];
    if (sibling.type !== "text") continue;
    const from = idx === startIndex ? startOffset : 0;
    for (let pos = from; pos < sibling.value.length; pos++) {
      const ch = sibling.value[pos];
      if (ch === "[") depth++;
      else if (ch === "]" && --depth === 0) {
        return { endIndex: idx, endOffset: pos };
      }
    }
  }
  return null;
}
