import { describe, expect, it } from "vitest";

import {
  canvasCompositionV2Schema,
  createEmptyCanvasComposition,
  normalizeCanvasComposition,
  parseStoredCanvasComposition,
} from "../../src/domain/canvas-composition";
import type { LegacyCanvasComposition } from "../../src/shared/contracts";

const legacyComposition: LegacyCanvasComposition = {
  version: 1,
  sections: [
    {
      id: "section-1",
      columns: [
        {
          id: "column-1",
          width: 12,
          widgets: [
            {
              id: "text-1",
              type: "richText",
              schemaVersion: 1,
              data: { markdown: "## Idea" },
              frame: { x: 40, y: 60, width: 520, height: 340, z: 0 },
            },
            {
              id: "table-1",
              type: "table",
              schemaVersion: 1,
              data: { rows: 1, columns: 2, cells: ["A", "B"] },
              frame: { x: 600, y: 60, width: 620, height: 300, z: 1 },
            },
          ],
        },
      ],
    },
  ],
};

describe("canvas composition v2", () => {
  it("normalizes legacy sections into an indexed object store without losing widgets", () => {
    const normalized = normalizeCanvasComposition(legacyComposition);

    expect(normalized.version).toBe(2);
    expect(normalized.rootIds).toEqual(["text-1", "table-1"]);
    expect(normalized.objects["text-1"]).toMatchObject({
      id: "text-1",
      parentId: null,
      slotId: null,
      order: 0,
    });
    expect(normalized.objects["text-1"]).toMatchObject({
      schemaVersion: 2,
      data: { document: { type: "doc" } },
    });
    expect(normalized.objects["table-1"]).toMatchObject({
      schemaVersion: 2,
      data: {
        cells: [
          { id: "table-1:cell:0", text: "A" },
          { id: "table-1:cell:1", text: "B" },
        ],
      },
    });
  });

  it("reads both legacy and normalized persisted compositions", () => {
    const normalized = normalizeCanvasComposition(legacyComposition);
    expect(parseStoredCanvasComposition(legacyComposition)).toEqual(normalized);
    expect(parseStoredCanvasComposition(normalized)).toEqual(normalized);
  });

  it("defaults historical standalone images to showing the complete image", () => {
    const composition = createEmptyCanvasComposition();
    composition.rootIds = ["image-1"];
    composition.objects = {
      "image-1": {
        id: "image-1",
        type: "image",
        schemaVersion: 1,
        parentId: null,
        slotId: null,
        order: 0,
        data: {
          resourceId: null,
          url: "https://example.com/image.png",
          alt: "Ejemplo",
          caption: "",
        },
      },
    };

    const parsed = parseStoredCanvasComposition(composition);
    const image = parsed.objects["image-1"];
    expect(image?.type).toBe("image");
    if (!image || image.type !== "image") throw new Error("Fixture inválida");
    expect(image.data.fit).toBe("contain");
  });

  it("persists optional object groups without changing containment", () => {
    const normalized = normalizeCanvasComposition(legacyComposition);
    const text = normalized.objects["text-1"];
    const table = normalized.objects["table-1"];
    if (!text || !table) throw new Error("Fixture inválida");
    text.groupId = "group-1";
    table.groupId = "group-1";

    const parsed = parseStoredCanvasComposition(normalized);

    expect(parsed.objects["text-1"]?.groupId).toBe("group-1");
    expect(parsed.objects["table-1"]?.groupId).toBe("group-1");
  });

  it("rejects missing parents and containment cycles", () => {
    const normalized = normalizeCanvasComposition(legacyComposition);
    const invalidParent = structuredClone(normalized);
    const text = invalidParent.objects["text-1"];
    if (!text) throw new Error("Fixture inválida");
    text.parentId = "missing";
    text.slotId = "cell-1";
    invalidParent.rootIds = ["table-1"];
    expect(canvasCompositionV2Schema.safeParse(invalidParent).success).toBe(false);

    const cycle = structuredClone(normalized);
    const cycleText = cycle.objects["text-1"];
    const cycleTable = cycle.objects["table-1"];
    if (!cycleText || !cycleTable) throw new Error("Fixture inválida");
    cycleText.parentId = "table-1";
    cycleText.slotId = "table-1:cell:0";
    cycleTable.parentId = "text-1";
    cycleTable.slotId = "cell-1";
    cycle.rootIds = [];
    expect(canvasCompositionV2Schema.safeParse(cycle).success).toBe(false);
  });

  it("accepts children only in real table cells", () => {
    const normalized = normalizeCanvasComposition(legacyComposition);
    const text = normalized.objects["text-1"];
    if (!text) throw new Error("Fixture inválida");
    text.parentId = "table-1";
    text.slotId = "table-1:cell:0";
    normalized.rootIds = ["table-1"];
    expect(canvasCompositionV2Schema.safeParse(normalized).success).toBe(true);
    text.slotId = "missing-cell";
    expect(canvasCompositionV2Schema.safeParse(normalized).success).toBe(false);
  });

  it("persists educational widgets in the normalized composition", () => {
    const composition = createEmptyCanvasComposition();
    composition.rootIds = ["navigation-1", "quiz-1", "accordion-1"];
    composition.objects = {
      "navigation-1": {
        id: "navigation-1",
        type: "navigation",
        schemaVersion: 1,
        data: {
          label: "Continuar",
          destination: { kind: "canvas", canvasId: "canvas-2" },
          style: "primary",
          openInNewTab: false,
        },
        appearance: {
          backgroundColor: "#ffffff",
          textColor: "#1d1d1f",
          accentColor: "#8a3ffc",
          border: "subtle",
          borderRadius: 16,
          padding: 12,
        },
        parentId: null,
        slotId: null,
        order: 0,
      },
      "quiz-1": {
        id: "quiz-1",
        type: "quiz",
        schemaVersion: 1,
        data: {
          question: "¿Cuál es correcta?",
          options: [
            { id: "answer-1", label: "A", correct: true },
            { id: "answer-2", label: "B", correct: false },
          ],
          explanation: "A es correcta.",
          selectionMode: "single",
          allowRetry: true,
          showExplanation: true,
        },
        parentId: null,
        slotId: null,
        order: 1,
      },
      "accordion-1": {
        id: "accordion-1",
        type: "accordion",
        schemaVersion: 2,
        data: {
          title: "Conceptos clave",
          items: [
            {
              id: "item-1",
              title: "Primero",
              content: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Contenido del primer apartado." }],
                  },
                ],
              },
            },
            {
              id: "item-2",
              title: "Segundo",
              content: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Contenido del segundo apartado." }],
                  },
                ],
              },
            },
          ],
          allowMultiple: false,
        },
        parentId: null,
        slotId: null,
        order: 2,
      },
    };

    expect(canvasCompositionV2Schema.parse(composition)).toEqual(composition);
  });

  it("upgrades legacy accordion text to a rich document", () => {
    const composition = parseStoredCanvasComposition({
      version: 2,
      rootIds: ["accordion-legacy"],
      objects: {
        "accordion-legacy": {
          id: "accordion-legacy",
          type: "accordion",
          schemaVersion: 1,
          data: {
            title: "Conceptos",
            items: [{ id: "item-1", title: "Idea", content: "Texto **importante**" }],
            allowMultiple: false,
          },
          parentId: null,
          slotId: null,
          order: 0,
        },
      },
    });

    const accordion = composition.objects["accordion-legacy"];
    expect(accordion?.type).toBe("accordion");
    if (accordion?.type !== "accordion") throw new Error("No se migró el acordeón");
    expect(accordion.schemaVersion).toBe(2);
    expect(accordion.data.items[0]?.content.type).toBe("doc");
  });
});
