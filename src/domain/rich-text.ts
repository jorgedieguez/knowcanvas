import type { RichTextMark, RichTextNode } from "../shared/contracts";

export type EmbeddedImageData = {
  id: string;
  resourceId: string | null;
  url: string;
  alt: string;
  caption: string;
  width: number;
  alignment: "left" | "center" | "right";
};

function createNodeId() {
  return `image-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createEmbeddedImageNode(
  image: Pick<EmbeddedImageData, "resourceId" | "url" | "alt"> &
    Partial<Pick<EmbeddedImageData, "id" | "caption" | "width" | "alignment">>,
): RichTextNode {
  return {
    type: "image",
    attrs: {
      id: image.id ?? createNodeId(),
      ...(image.resourceId ? { resourceId: image.resourceId } : {}),
      url: image.url,
      alt: image.alt,
      caption: image.caption ?? "",
      width: image.width ?? 480,
      alignment: image.alignment ?? "center",
    },
  };
}

export function embeddedImageData(node: RichTextNode): EmbeddedImageData | null {
  if (node.type !== "image") return null;
  const attrs = node.attrs ?? {};
  const url = typeof attrs.url === "string" ? attrs.url : "";
  if (!url) return null;
  const alignment = attrs.alignment;
  return {
    id: typeof attrs.id === "string" && attrs.id ? attrs.id : createNodeId(),
    resourceId: typeof attrs.resourceId === "string" && attrs.resourceId ? attrs.resourceId : null,
    url,
    alt: typeof attrs.alt === "string" ? attrs.alt : "",
    caption: typeof attrs.caption === "string" ? attrs.caption : "",
    width: typeof attrs.width === "number" ? attrs.width : 480,
    alignment: alignment === "left" || alignment === "right" ? alignment : "center",
  };
}

export function updateEmbeddedImage(
  document: RichTextNode,
  id: string,
  transform: (image: EmbeddedImageData) => EmbeddedImageData,
) {
  const updated = structuredClone(document);
  let replaced = false;
  const visit = (node: RichTextNode) => {
    const image = embeddedImageData(node);
    if (image?.id === id) {
      node.attrs = createEmbeddedImageNode(transform(image)).attrs;
      replaced = true;
      return;
    }
    for (const child of node.content ?? []) visit(child);
  };
  visit(updated);
  return { document: updated, replaced };
}

function inlineNodes(value: string): RichTextNode[] {
  const nodes: RichTextNode[] = [];
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[(.+?)\]\(([^)]+)\))/gu;
  let cursor = 0;
  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push({ type: "text", text: value.slice(cursor, index) });
    let text = match[0];
    let marks: RichTextMark[] = [];
    if (match[2]) {
      text = match[2];
      marks = [{ type: "bold" }];
    } else if (match[3]) {
      text = match[3];
      marks = [{ type: "italic" }];
    } else if (match[4]) {
      text = match[4];
      marks = [{ type: "code" }];
    } else if (match[5]) {
      text = match[5];
      marks = [{ type: "link", href: match[6] ?? "" }];
    }
    nodes.push({ type: "text", text, marks });
    cursor = index + match[0].length;
  }
  if (cursor < value.length) nodes.push({ type: "text", text: value.slice(cursor) });
  return nodes.length ? nodes : [{ type: "text", text: "" }];
}

export function markdownToDocument(markdown: string): RichTextNode {
  const content: RichTextNode[] = [];
  const lines = markdown.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const next = lines[index + 1] ?? "";
    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/u);
    if (image) {
      content.push(
        createEmbeddedImageNode({ resourceId: null, url: image[2] ?? "", alt: image[1] ?? "" }),
      );
      continue;
    }
    if (line.includes("|") && /^\s*\|?(?:\s*:?-+:?\s*\|)+\s*$/u.test(next)) {
      const split = (row: string) =>
        row
          .replace(/^\s*\|/u, "")
          .replace(/\|\s*$/u, "")
          .split("|")
          .map((cell) => cell.trim());
      const rows = [split(line)];
      index += 2;
      while (index < lines.length && (lines[index] ?? "").includes("|")) {
        rows.push(split(lines[index] ?? ""));
        index += 1;
      }
      index -= 1;
      content.push({
        type: "table",
        content: rows.map((row) => ({
          type: "tableRow",
          content: row.map((cell) => ({
            type: "tableCell",
            content: [{ type: "paragraph", content: inlineNodes(cell) }],
          })),
        })),
      });
      continue;
    }
    if (line.startsWith("- ")) {
      const items: RichTextNode[] = [];
      while (index < lines.length && (lines[index] ?? "").startsWith("- ")) {
        items.push({
          type: "listItem",
          content: [{ type: "paragraph", content: inlineNodes((lines[index] ?? "").slice(2)) }],
        });
        index += 1;
      }
      index -= 1;
      content.push({ type: "bulletList", content: items });
    } else if (line.startsWith("### "))
      content.push({ type: "heading", attrs: { level: 3 }, content: inlineNodes(line.slice(4)) });
    else if (line.startsWith("## "))
      content.push({ type: "heading", attrs: { level: 2 }, content: inlineNodes(line.slice(3)) });
    else if (line.startsWith("> "))
      content.push({
        type: "blockquote",
        content: [{ type: "paragraph", content: inlineNodes(line.slice(2)) }],
      });
    else content.push({ type: "paragraph", content: inlineNodes(line) });
  }
  return { type: "doc", content };
}

function inlineMarkdown(nodes: RichTextNode[] = []) {
  return nodes
    .map((node) => {
      let value = node.text ?? "";
      for (const mark of node.marks ?? []) {
        if (mark.type === "bold") value = `**${value}**`;
        if (mark.type === "italic") value = `*${value}*`;
        if (mark.type === "code") value = `\`${value}\``;
        if (mark.type === "link") value = `[${value}](${mark.href ?? ""})`;
      }
      return value;
    })
    .join("");
}

export function documentToMarkdown(document: RichTextNode) {
  return (document.content ?? [])
    .map((node) => {
      if (node.type === "image") {
        const image = embeddedImageData(node);
        return image ? `![${image.alt}](${image.url})` : "";
      }
      if (node.type === "heading")
        return `${"#".repeat(Number(node.attrs?.level ?? 2))} ${inlineMarkdown(node.content)}`;
      if (node.type === "blockquote") return `> ${inlineMarkdown(node.content?.[0]?.content)}`;
      if (node.type === "bulletList")
        return (node.content ?? [])
          .map((item) => `- ${inlineMarkdown(item.content?.[0]?.content)}`)
          .join("\n");
      if (node.type === "table") {
        const rows = (node.content ?? []).map((row) =>
          (row.content ?? []).map((cell) => inlineMarkdown(cell.content?.[0]?.content)),
        );
        const [header = [], ...body] = rows;
        return [
          `| ${header.join(" | ")} |`,
          `| ${header.map(() => "---").join(" | ")} |`,
          ...body.map((row) => `| ${row.join(" | ")} |`),
        ].join("\n");
      }
      return inlineMarkdown(node.content);
    })
    .join("\n\n")
    .replace(/\n{3,}/gu, "\n\n");
}

export function updateDocumentLink(
  document: RichTextNode,
  previous: { text: string; url: string },
  next: { text: string; url: string } | null,
) {
  const updated = structuredClone(document);
  let replaced = false;

  const visit = (node: RichTextNode) => {
    if (replaced) return;
    const linkIndex = node.marks?.findIndex(
      (mark) => mark.type === "link" && (mark.href ?? "") === previous.url,
    );
    if (
      node.type === "text" &&
      node.text === previous.text &&
      linkIndex !== undefined &&
      linkIndex >= 0
    ) {
      if (next) {
        node.text = next.text;
        const marks = [...(node.marks ?? [])];
        marks[linkIndex] = { type: "link", href: next.url };
        node.marks = marks;
      } else {
        node.marks = (node.marks ?? []).filter((_, index) => index !== linkIndex);
      }
      replaced = true;
      return;
    }
    for (const child of node.content ?? []) visit(child);
  };

  visit(updated);
  return { document: updated, replaced };
}
