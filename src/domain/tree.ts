import { DomainError } from "./errors";

export type TreeNode = {
  id: string;
  parentId: string | null;
  kind: "container" | "canvas";
};

export function assertValidParent(nodes: readonly TreeNode[], parentId: string | null): void {
  if (parentId === null) return;

  const parent = nodes.find((node) => node.id === parentId);
  if (!parent) {
    throw new DomainError("NOT_FOUND", "El elemento de destino no existe.", 404);
  }
}

export function assertValidMove(
  nodes: readonly TreeNode[],
  nodeId: string,
  targetParentId: string | null,
): void {
  const node = nodes.find((candidate) => candidate.id === nodeId);
  if (!node) {
    throw new DomainError("NOT_FOUND", "El elemento no existe.", 404);
  }

  assertValidParent(nodes, targetParentId);

  if (nodeId === targetParentId) {
    throw new DomainError("TREE_CYCLE", "Un elemento no puede contenerse a sí mismo.", 409);
  }

  let cursor = targetParentId;
  const visited = new Set<string>();

  while (cursor !== null) {
    if (cursor === nodeId) {
      throw new DomainError(
        "TREE_CYCLE",
        "No se puede mover una carpeta dentro de uno de sus descendientes.",
        409,
      );
    }

    if (visited.has(cursor)) {
      throw new DomainError("TREE_CYCLE", "El árbol contiene un ciclo previo.", 409);
    }

    visited.add(cursor);
    cursor = nodes.find((candidate) => candidate.id === cursor)?.parentId ?? null;
  }
}

export function normalizePosition(position: number, siblingCount: number): number {
  if (!Number.isInteger(position)) {
    throw new DomainError("VALIDATION_ERROR", "La posición debe ser un entero.", 400);
  }

  return Math.min(Math.max(position, 0), siblingCount);
}
