import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import type { SortingWidget } from "../../shared/contracts";

type SortingData = SortingWidget["data"];

export function SortingPropertiesEditor({
  value,
  onChange,
}: {
  value: SortingData;
  onChange: (value: SortingData) => void;
}) {
  function updateMode(mode: SortingData["mode"]) {
    const targets =
      mode !== "order" && value.targets.length < 2
        ? [
            { id: crypto.randomUUID(), label: "Grupo A" },
            { id: crypto.randomUUID(), label: "Grupo B" },
          ]
        : value.targets;
    onChange({
      ...value,
      mode,
      targets,
      items: value.items.map((item, index) => ({
        ...item,
        targetId:
          mode === "order" ? null : (targets[index % Math.max(1, targets.length)]?.id ?? null),
      })),
    });
  }

  function moveItem(index: number, offset: -1 | 1) {
    const nextIndex = Math.max(0, Math.min(value.items.length - 1, index + offset));
    if (index === nextIndex) return;
    const items = [...value.items];
    const [item] = items.splice(index, 1);
    if (!item) return;
    items.splice(nextIndex, 0, item);
    onChange({ ...value, items });
  }

  return (
    <div className="sorting-properties-editor">
      <label className="property-field">
        Tipo de actividad
        <select
          value={value.mode}
          onChange={(event) => updateMode(event.target.value as SortingData["mode"])}
        >
          <option value="classify">Clasificar</option>
          <option value="order">Ordenar</option>
          <option value="match">Relacionar</option>
        </select>
      </label>
      <label className="property-field">
        Título
        <input
          value={value.title}
          maxLength={500}
          onChange={(event) => onChange({ ...value, title: event.target.value })}
        />
      </label>
      <label className="property-field">
        Instrucción
        <textarea
          value={value.prompt}
          maxLength={1_000}
          onChange={(event) => onChange({ ...value, prompt: event.target.value })}
        />
      </label>

      {value.mode !== "order" ? (
        <section className="property-collection" aria-label="Destinos de la actividad">
          <div className="property-collection-heading">
            <span className="property-grid-label">
              {value.mode === "classify" ? "Categorías" : "Parejas"}
            </span>
            <button
              className="icon-button"
              type="button"
              aria-label="Añadir destino"
              disabled={value.targets.length >= 8}
              onClick={() =>
                onChange({
                  ...value,
                  targets: [
                    ...value.targets,
                    {
                      id: crypto.randomUUID(),
                      label: value.mode === "classify" ? "Nueva categoría" : "Nueva pareja",
                    },
                  ],
                })
              }
            >
              <Plus size={14} aria-hidden="true" />
            </button>
          </div>
          {value.targets.map((target, index) => (
            <div className="property-inline-row" key={target.id}>
              <input
                aria-label={`Destino ${index + 1}`}
                value={target.label}
                maxLength={500}
                onChange={(event) =>
                  onChange({
                    ...value,
                    targets: value.targets.map((candidate) =>
                      candidate.id === target.id
                        ? { ...candidate, label: event.target.value }
                        : candidate,
                    ),
                  })
                }
              />
              <button
                className="icon-button danger"
                type="button"
                aria-label={`Eliminar destino ${index + 1}`}
                disabled={value.targets.length <= 2}
                onClick={() =>
                  onChange({
                    ...value,
                    targets: value.targets.filter((candidate) => candidate.id !== target.id),
                    items: value.items.map((item) => ({
                      ...item,
                      targetId: item.targetId === target.id ? null : item.targetId,
                    })),
                  })
                }
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </section>
      ) : null}

      <section className="property-collection" aria-label="Elementos de la actividad">
        <div className="property-collection-heading">
          <span className="property-grid-label">
            {value.mode === "order" ? "Orden correcto" : "Elementos"}
          </span>
          <button
            className="icon-button"
            type="button"
            aria-label="Añadir elemento"
            disabled={value.items.length >= 12}
            onClick={() =>
              onChange({
                ...value,
                items: [
                  ...value.items,
                  {
                    id: crypto.randomUUID(),
                    label: "Nuevo elemento",
                    targetId: value.mode === "order" ? null : (value.targets[0]?.id ?? null),
                  },
                ],
              })
            }
          >
            <Plus size={14} aria-hidden="true" />
          </button>
        </div>
        {value.items.map((item, index) => (
          <div className="sorting-property-item" key={item.id}>
            <input
              aria-label={`Elemento ${index + 1}`}
              value={item.label}
              maxLength={500}
              onChange={(event) =>
                onChange({
                  ...value,
                  items: value.items.map((candidate) =>
                    candidate.id === item.id
                      ? { ...candidate, label: event.target.value }
                      : candidate,
                  ),
                })
              }
            />
            {value.mode === "order" ? (
              <div className="property-order-actions">
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Subir elemento ${index + 1}`}
                  disabled={index === 0}
                  onClick={() => moveItem(index, -1)}
                >
                  <ArrowUp size={14} aria-hidden="true" />
                </button>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Bajar elemento ${index + 1}`}
                  disabled={index === value.items.length - 1}
                  onClick={() => moveItem(index, 1)}
                >
                  <ArrowDown size={14} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <select
                aria-label={`Destino del elemento ${index + 1}`}
                value={item.targetId ?? ""}
                onChange={(event) =>
                  onChange({
                    ...value,
                    items: value.items.map((candidate) =>
                      candidate.id === item.id
                        ? { ...candidate, targetId: event.target.value || null }
                        : candidate,
                    ),
                  })
                }
              >
                <option value="">Sin destino</option>
                {value.targets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.label}
                  </option>
                ))}
              </select>
            )}
            <button
              className="icon-button danger"
              type="button"
              aria-label={`Eliminar elemento ${index + 1}`}
              disabled={value.items.length <= 2}
              onClick={() =>
                onChange({
                  ...value,
                  items: value.items.filter((candidate) => candidate.id !== item.id),
                })
              }
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
