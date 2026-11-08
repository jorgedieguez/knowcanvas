import type { NodeItem } from "../shared/contracts";

export type StudyPage = {
  canvasId: string;
  nodeId: string;
  parentId: string | null;
  title: string;
  depth: number;
};

export function buildStudyPages(nodes: readonly NodeItem[]): StudyPage[] {
  const byParent = new Map<string | null, NodeItem[]>();
  for (const node of nodes) {
    const siblings = byParent.get(node.parentId) ?? [];
    siblings.push(node);
    byParent.set(node.parentId, siblings);
  }
  for (const siblings of byParent.values()) {
    siblings.sort((left, right) => left.position - right.position);
  }

  const pages: StudyPage[] = [];
  const visited = new Set<string>();
  const visit = (parentId: string | null, depth: number) => {
    for (const node of byParent.get(parentId) ?? []) {
      if (visited.has(node.id)) continue;
      visited.add(node.id);
      if (node.kind === "canvas" && node.canvasId) {
        pages.push({
          canvasId: node.canvasId,
          nodeId: node.id,
          parentId: node.parentId,
          title: node.title,
          depth,
        });
      }
      visit(node.id, depth + 1);
    }
  };
  visit(null, 0);
  return pages;
}
