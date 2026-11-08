import { describe, expect, it } from "vitest";

import { buildStudyPages } from "../../src/domain/study-navigation";
import type { NodeItem } from "../../src/shared/contracts";

function node(
  id: string,
  kind: "container" | "canvas",
  parentId: string | null,
  position: number,
): NodeItem {
  return {
    id,
    projectId: "project-1",
    parentId,
    kind,
    title: id,
    position,
    canvasId: kind === "canvas" ? `canvas-${id}` : null,
    createdAt: "2026-10-23T10:00:00.000Z",
    updatedAt: "2026-10-23T10:00:00.000Z",
  };
}

describe("buildStudyPages", () => {
  it("crea una secuencia en profundidad respetando el orden entre hermanos", () => {
    const pages = buildStudyPages([
      node("closing", "canvas", null, 2),
      node("chapter", "container", null, 0),
      node("second", "canvas", "chapter", 1),
      node("first", "canvas", "chapter", 0),
      node("nested", "canvas", "first", 0),
    ]);

    expect(pages.map((page) => page.nodeId)).toEqual(["first", "nested", "second", "closing"]);
    expect(pages.map((page) => page.depth)).toEqual([1, 2, 1, 0]);
  });

  it("ignora nodos desconectados en vez de inventar una posición de lectura", () => {
    const pages = buildStudyPages([
      node("visible", "canvas", null, 0),
      node("lost", "canvas", "missing", 0),
    ]);

    expect(pages.map((page) => page.nodeId)).toEqual(["visible"]);
  });
});
