import { ChevronDown } from "lucide-react";
import { useState } from "react";

import type { AccordionWidget as AccordionWidgetData } from "../../shared/contracts";
import { RichTextEditor, RichTextPreview } from "./RichTextEditor";

export function AccordionWidget({
  value,
  interactive,
  editing = false,
  onChange,
  internalPages = [],
}: {
  value: AccordionWidgetData["data"];
  interactive: boolean;
  editing?: boolean;
  onChange?: (value: AccordionWidgetData["data"]) => void;
  internalPages?: { id: string; title: string }[];
}) {
  const [openIds, setOpenIds] = useState<string[]>([]);

  function toggle(itemId: string) {
    if (!interactive) return;
    setOpenIds((current) =>
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : value.allowMultiple
          ? [...current, itemId]
          : [itemId],
    );
  }

  return (
    <section className="accordion-widget" aria-label={value.title || "Contenido desplegable"}>
      {editing ? (
        <input
          className="accordion-title-input"
          aria-label="Título del acordeón"
          value={value.title}
          maxLength={500}
          onChange={(event) => onChange?.({ ...value, title: event.target.value })}
        />
      ) : value.title ? (
        <h3>{value.title}</h3>
      ) : null}
      <div className="accordion-items">
        {value.items.map((item, index) => {
          const expanded = interactive && openIds.includes(item.id);
          const panelId = `accordion-panel-${item.id}`;
          return (
            <div className="accordion-item" key={item.id}>
              {editing ? (
                <div className="accordion-inline-editor">
                  <input
                    aria-label={`Título del apartado ${index + 1}`}
                    value={item.title}
                    maxLength={500}
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
                  <RichTextEditor
                    ariaLabel={`Contenido del apartado ${index + 1}`}
                    autoFocus={false}
                    value={item.content}
                    internalPages={internalPages}
                    onChange={(content) =>
                      onChange?.({
                        ...value,
                        items: value.items.map((candidate) =>
                          candidate.id === item.id ? { ...candidate, content } : candidate,
                        ),
                      })
                    }
                  />
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    disabled={!interactive}
                    onClick={() => toggle(item.id)}
                  >
                    <span>{item.title || `Apartado ${index + 1}`}</span>
                    <ChevronDown size={18} aria-hidden="true" />
                  </button>
                  <div id={panelId} className="accordion-panel" hidden={!expanded}>
                    <RichTextPreview value={item.content} />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
      {!interactive && !editing ? (
        <p className="widget-author-hint">Vista previa · se despliega en Estudiar</p>
      ) : null}
    </section>
  );
}
