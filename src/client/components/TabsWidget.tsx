import { useEffect, useState } from "react";

import type { TabsWidget as TabsWidgetData } from "../../shared/contracts";
import { RichTextEditor, RichTextPreview } from "./RichTextEditor";

export function TabsWidget({
  value,
  interactive,
  editing = false,
  onChange,
  internalPages = [],
}: {
  value: TabsWidgetData["data"];
  interactive: boolean;
  editing?: boolean;
  onChange?: (value: TabsWidgetData["data"]) => void;
  internalPages?: { id: string; title: string }[];
}) {
  const [activeId, setActiveId] = useState(value.items[0]?.id ?? "");
  useEffect(() => {
    if (!value.items.some((item) => item.id === activeId)) setActiveId(value.items[0]?.id ?? "");
  }, [activeId, value.items]);
  const activeItem = value.items.find((item) => item.id === activeId) ?? value.items[0];

  return (
    <section className="tabs-widget" aria-label={value.title || "Contenido por pestañas"}>
      {editing ? (
        <input
          className="tabs-title-input"
          aria-label="Título de las pestañas"
          value={value.title}
          maxLength={500}
          onChange={(event) => onChange?.({ ...value, title: event.target.value })}
        />
      ) : value.title ? (
        <h3>{value.title}</h3>
      ) : null}
      <div
        className="tabs-widget-list"
        role={editing ? "group" : "tablist"}
        aria-label={value.title || "Apartados"}
      >
        {value.items.map((item, index) =>
          editing ? (
            <label className={item.id === activeItem?.id ? "is-active" : ""} key={item.id}>
              <span className="sr-only">Pestaña {index + 1}</span>
              <input
                aria-label={`Título de la pestaña ${index + 1}`}
                value={item.title}
                maxLength={500}
                onFocus={() => setActiveId(item.id)}
                onChange={(event) =>
                  onChange?.({
                    ...value,
                    items: value.items.map((candidate) =>
                      candidate.id === item.id
                        ? { ...candidate, title: event.target.value }
                        : candidate,
                    ),
                  })
                }
              />
            </label>
          ) : (
            <button
              key={item.id}
              id={`tabs-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={item.id === activeItem?.id}
              aria-controls={`tabs-panel-${item.id}`}
              tabIndex={item.id === activeItem?.id ? 0 : -1}
              onClick={() => setActiveId(item.id)}
              onKeyDown={(event) => {
                if (!interactive || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
                  return;
                event.preventDefault();
                const current = value.items.findIndex((candidate) => candidate.id === item.id);
                const next =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? value.items.length - 1
                      : (current + (event.key === "ArrowRight" ? 1 : -1) + value.items.length) %
                        value.items.length;
                const nextItem = value.items[next];
                if (!nextItem) return;
                setActiveId(nextItem.id);
                document.getElementById(`tabs-tab-${nextItem.id}`)?.focus();
              }}
            >
              {item.title || `Pestaña ${index + 1}`}
            </button>
          ),
        )}
      </div>
      {activeItem ? (
        <div
          id={`tabs-panel-${activeItem.id}`}
          className="tabs-widget-panel"
          role={editing ? "group" : "tabpanel"}
          aria-label={editing ? `Contenido de ${activeItem.title}` : undefined}
          {...(!editing ? { "aria-labelledby": `tabs-tab-${activeItem.id}` } : {})}
        >
          {editing ? (
            <RichTextEditor
              ariaLabel={`Contenido de la pestaña ${value.items.indexOf(activeItem) + 1}`}
              autoFocus={false}
              value={activeItem.content}
              internalPages={internalPages}
              onChange={(content) =>
                onChange?.({
                  ...value,
                  items: value.items.map((candidate) =>
                    candidate.id === activeItem.id ? { ...candidate, content } : candidate,
                  ),
                })
              }
            />
          ) : (
            <RichTextPreview value={activeItem.content} />
          )}
        </div>
      ) : null}
    </section>
  );
}
