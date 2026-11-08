import {
  canvasCompositionSchema,
  legacyCanvasCompositionSchema,
  type CanvasComposition,
  type LegacyCanvasComposition,
  type Widget,
} from "../shared/contracts";
import { markdownToDocument } from "./rich-text";

export const canvasCompositionV2Schema = canvasCompositionSchema.superRefine(
  (composition, context) => {
    const rootIds = new Set(composition.rootIds);
    if (rootIds.size !== composition.rootIds.length) {
      context.addIssue({ code: "custom", message: "rootIds contiene identificadores duplicados." });
    }

    for (const [key, object] of Object.entries(composition.objects)) {
      if (key !== object.id) {
        context.addIssue({
          code: "custom",
          path: ["objects", key, "id"],
          message: "La clave del objeto debe coincidir con su id.",
        });
      }
      if (object.parentId === null && !rootIds.has(object.id)) {
        context.addIssue({ code: "custom", message: `Falta ${object.id} en rootIds.` });
      }
      if (object.parentId !== null) {
        const parent = composition.objects[object.parentId];
        if (!parent) context.addIssue({ code: "custom", message: `No existe ${object.parentId}.` });
        else if (parent.type !== "table") {
          context.addIssue({ code: "custom", message: "Solo una tabla puede contener objetos." });
        } else if (!parent.data.cells.some((cell) => cell.id === object.slotId)) {
          context.addIssue({
            code: "custom",
            message: `La celda ${object.slotId ?? ""} no existe.`,
          });
        }
        if (!object.slotId) context.addIssue({ code: "custom", message: "Falta slotId." });
      } else if (object.slotId !== null) {
        context.addIssue({ code: "custom", message: "Un objeto raíz no puede tener slotId." });
      }
    }

    for (const rootId of rootIds) {
      const root = composition.objects[rootId];
      if (!root) context.addIssue({ code: "custom", message: `No existe la raíz ${rootId}.` });
      else if (root.parentId !== null) {
        context.addIssue({ code: "custom", message: `${rootId} tiene padre y no puede ser raíz.` });
      }
    }

    for (const object of Object.values(composition.objects)) {
      const visited = new Set([object.id]);
      let parentId = object.parentId;
      while (parentId) {
        if (visited.has(parentId)) {
          context.addIssue({ code: "custom", message: `Ciclo detectado en ${object.id}.` });
          break;
        }
        visited.add(parentId);
        parentId = composition.objects[parentId]?.parentId ?? null;
      }
    }
  },
);

export function normalizeCanvasComposition(
  composition: LegacyCanvasComposition,
): CanvasComposition {
  const widgets = composition.sections.flatMap((section) =>
    section.columns.flatMap((column) => column.widgets),
  );
  return canvasCompositionV2Schema.parse({
    version: 2,
    rootIds: widgets.map((widget) => widget.id),
    objects: Object.fromEntries(
      widgets.map((widget, order) => [
        widget.id,
        { ...upgradeWidget(widget), parentId: null, slotId: null, order },
      ]),
    ),
  });
}

export function parseStoredCanvasComposition(value: unknown): CanvasComposition {
  const legacy = legacyCanvasCompositionSchema.safeParse(value);
  if (legacy.success) return normalizeCanvasComposition(legacy.data);
  if (!value || typeof value !== "object" || !("version" in value) || value.version !== 2) {
    return canvasCompositionV2Schema.parse(value);
  }
  const raw = value as { version: 2; rootIds?: unknown; objects?: unknown };
  if (!raw.objects || typeof raw.objects !== "object")
    return canvasCompositionV2Schema.parse(value);
  const objects = Object.fromEntries(
    Object.entries(raw.objects).map(([id, object]) => {
      if (!object || typeof object !== "object") return [id, object];
      const record = object as Record<string, unknown>;
      return [
        id,
        {
          ...record,
          ...upgradeWidget(record),
          parentId: record.parentId ?? null,
          slotId: record.slotId ?? null,
        },
      ];
    }),
  );
  return canvasCompositionV2Schema.parse({ ...raw, objects });
}

function upgradeWidget(
  widget:
    | Record<string, unknown>
    | LegacyCanvasComposition["sections"][number]["columns"][number]["widgets"][number],
): Widget {
  if (widget.type === "richText" && widget.schemaVersion === 1) {
    const data = widget.data as { markdown: string };
    return {
      ...widget,
      type: "richText",
      schemaVersion: 2,
      data: { document: markdownToDocument(data.markdown) },
    } as Widget;
  }
  if (widget.type === "table" && widget.schemaVersion === 1) {
    const data = widget.data as { rows: number; columns: number; cells: string[] };
    return {
      ...widget,
      type: "table",
      schemaVersion: 2,
      data: {
        ...data,
        cells: data.cells.map((text, index) => ({
          id: `${String(widget.id)}:cell:${index}`,
          text,
        })),
      },
    } as Widget;
  }
  if (widget.type === "accordion" && widget.schemaVersion === 1) {
    const data = widget.data as {
      title: string;
      items: { id: string; title: string; content: string }[];
      allowMultiple: boolean;
    };
    return {
      ...widget,
      type: "accordion",
      schemaVersion: 2,
      data: {
        ...data,
        items: data.items.map((item) => ({
          ...item,
          content: markdownToDocument(item.content),
        })),
      },
    } as Widget;
  }
  return structuredClone(widget) as Widget;
}

export function createEmptyCanvasComposition(): CanvasComposition {
  return { version: 2, rootIds: [], objects: {} };
}

export { legacyCanvasCompositionSchema };
