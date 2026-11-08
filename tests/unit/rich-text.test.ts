import { describe, expect, it } from "vitest";

import {
  createEmbeddedImageNode,
  documentToMarkdown,
  embeddedImageData,
  markdownToDocument,
  updateEmbeddedImage,
  updateDocumentLink,
} from "../../src/domain/rich-text";
import { richTextDocumentSchema } from "../../src/shared/contracts";

describe("structured rich text", () => {
  it("accepts persistent typography marks", () => {
    const document = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Texto con estilo",
              marks: [
                {
                  type: "textStyle",
                  color: "#c2410c",
                  fontFamily: "serif",
                  fontSize: 24,
                },
              ],
            },
          ],
        },
      ],
    };

    expect(richTextDocumentSchema.safeParse(document).success).toBe(true);
  });

  it("migrates common markdown blocks and inline marks to JSON", () => {
    const markdown = "## Título\n\nUn **texto** con [fuente](https://example.com).\n\n- Uno\n- Dos";
    const document = markdownToDocument(markdown);

    expect(richTextDocumentSchema.safeParse(document).success).toBe(true);
    expect(document.content?.map((node) => node.type)).toEqual([
      "heading",
      "paragraph",
      "paragraph",
      "paragraph",
      "bulletList",
    ]);
    expect(documentToMarkdown(document)).toContain("**texto**");
    expect(documentToMarkdown(document)).toContain("[fuente](https://example.com)");
  });

  it("stores embedded tables as semantic rows and cells", () => {
    const document = markdownToDocument("| A | B |\n| --- | --- |\n| 1 | 2 |");
    const table = document.content?.[0];
    expect(table?.type).toBe("table");
    expect(table?.content?.[1]?.content?.[1]?.type).toBe("tableCell");
    expect(documentToMarkdown(document)).toBe("| A | B |\n| --- | --- |\n| 1 | 2 |");
  });

  it("stores embedded images as identifiable first-class nodes", () => {
    const image = createEmbeddedImageNode({
      id: "image-1",
      resourceId: "resource-1",
      url: "https://example.com/image.jpg",
      alt: "Descripción",
      width: 420,
      alignment: "right",
    });
    const document = { type: "doc", content: [{ type: "paragraph", content: [] }, image] };
    const stored = embeddedImageData(document.content[1] ?? { type: "paragraph" });
    expect(stored).toMatchObject({ id: "image-1", width: 420, alignment: "right" });

    const updated = updateEmbeddedImage(document, "image-1", (current) => ({
      ...current,
      alt: "Nueva descripción",
      width: 560,
    }));
    expect(updated.replaced).toBe(true);
    expect(embeddedImageData(updated.document.content?.[1] ?? { type: "paragraph" })).toMatchObject(
      { id: "image-1", alt: "Nueva descripción", width: 560 },
    );
    expect(documentToMarkdown(updated.document)).toContain(
      "![Nueva descripción](https://example.com/image.jpg)",
    );
  });

  it("updates and removes links without fragile Markdown replacement", () => {
    const document = markdownToDocument("Consulta [la fuente](https://old.example).");
    const updated = updateDocumentLink(
      document,
      { text: "la fuente", url: "https://old.example" },
      { text: "el documento", url: "https://new.example/docs" },
    );
    expect(updated.replaced).toBe(true);
    expect(documentToMarkdown(updated.document)).toBe(
      "Consulta [el documento](https://new.example/docs).",
    );

    const removed = updateDocumentLink(
      updated.document,
      { text: "el documento", url: "https://new.example/docs" },
      null,
    );
    expect(documentToMarkdown(removed.document)).toBe("Consulta el documento.");
  });
});
