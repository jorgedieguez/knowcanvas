import { describe, expect, it } from "vitest";

import {
  buildDemoBookPages,
  buildKnowCanvasDemoPages,
  DEMO_SEED_VERSION,
  KNOWCANVAS_DEMO_SEED_VERSION,
} from "../../src/domain/demo-project";

describe("demo project", () => {
  it("builds a coherent five-page learning path with the supported educational widgets", () => {
    const pages = buildDemoBookPages("project-demo");
    expect(DEMO_SEED_VERSION).toBe(2);
    expect(pages).toHaveLength(5);
    expect(pages.map((page) => page.title)).toEqual([
      "1. La unidad de la vida",
      "2. Anatomía de una célula",
      "3. Una red de procesos",
      "4. Comparar para comprender",
      "5. Comprueba tu modelo",
    ]);

    const widgetTypes = new Set(
      pages.flatMap((page) => Object.values(page.composition.objects).map((object) => object.type)),
    );
    expect(widgetTypes).toEqual(
      new Set(["richText", "navigation", "image", "pele", "table", "quiz"]),
    );
  });

  it("links the opening and closing navigation widgets to valid pages", () => {
    const pages = buildDemoBookPages("project-demo");
    const canvasIds = new Set(pages.map((page) => page.canvasId));
    const navigationWidgets = pages.flatMap((page) =>
      Object.values(page.composition.objects).filter((object) => object.type === "navigation"),
    );
    expect(navigationWidgets).toHaveLength(2);
    for (const widget of navigationWidgets) {
      if (widget.type !== "navigation" || widget.data.destination.kind !== "canvas") continue;
      expect(canvasIds.has(widget.data.destination.canvasId)).toBe(true);
    }
  });
});

describe("KnowCanvas product demo", () => {
  it("builds a five-page guided tour with representative widgets", () => {
    const pages = buildKnowCanvasDemoPages("project-product-demo");
    expect(KNOWCANVAS_DEMO_SEED_VERSION).toBe(1);
    expect(pages).toHaveLength(5);
    expect(pages.map((page) => page.title)).toEqual([
      "1. Bienvenido a KnowCanvas",
      "2. Crea en un lienzo flexible",
      "3. Organiza y da identidad",
      "4. Convierte contenido en aprendizaje",
      "5. Estudia, comparte y evoluciona",
    ]);

    const widgetTypes = new Set(
      pages.flatMap((page) => Object.values(page.composition.objects).map((object) => object.type)),
    );
    expect(widgetTypes).toEqual(
      new Set([
        "richText",
        "pele",
        "navigation",
        "image",
        "table",
        "tabs",
        "accordion",
        "flashcards",
        "timeline",
        "quiz",
      ]),
    );
  });

  it("keeps every navigation destination inside the guided tour", () => {
    const pages = buildKnowCanvasDemoPages("project-product-demo");
    const canvasIds = new Set(pages.map((page) => page.canvasId));
    const navigationWidgets = pages.flatMap((page) =>
      Object.values(page.composition.objects).filter((object) => object.type === "navigation"),
    );
    expect(navigationWidgets).toHaveLength(3);
    for (const widget of navigationWidgets) {
      if (widget.type !== "navigation" || widget.data.destination.kind !== "canvas") continue;
      expect(canvasIds.has(widget.data.destination.canvasId)).toBe(true);
    }
  });
});
