import { describe, expect, it } from "vitest";

import { assertValidMove, assertValidParent, normalizePosition } from "../../src/domain/tree";

const nodes = [
  { id: "chapter", parentId: null, kind: "container" as const },
  { id: "section", parentId: "chapter", kind: "container" as const },
  { id: "canvas", parentId: "section", kind: "canvas" as const },
];

describe("tree invariants", () => {
  it("allows every node and root as parents", () => {
    expect(() => assertValidParent(nodes, null)).not.toThrow();
    expect(() => assertValidParent(nodes, "chapter")).not.toThrow();
    expect(() => assertValidParent(nodes, "canvas")).not.toThrow();
  });

  it("rejects moving a container into its descendants", () => {
    expect(() => assertValidMove(nodes, "chapter", "section")).toThrow(/descendientes/i);
  });

  it("clamps positions to the sibling range", () => {
    expect(normalizePosition(-4, 3)).toBe(0);
    expect(normalizePosition(8, 3)).toBe(3);
    expect(normalizePosition(2, 3)).toBe(2);
  });
});
