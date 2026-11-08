import { Image as ImageIcon, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { MouseEvent } from "react";

import type { HotspotsWidget as HotspotsWidgetData } from "../../shared/contracts";
import { RichTextPreview } from "./RichTextEditor";

export function HotspotsWidget({
  value,
  editing,
  onChange,
}: {
  value: HotspotsWidgetData["data"];
  editing: boolean;
  onChange?: (value: HotspotsWidgetData["data"]) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(value.hotspots[0]?.id ?? null);
  useEffect(() => {
    if (!activeId || !value.hotspots.some((hotspot) => hotspot.id === activeId))
      setActiveId(value.hotspots[0]?.id ?? null);
  }, [activeId, value.hotspots]);
  const active = value.hotspots.find((hotspot) => hotspot.id === activeId) ?? null;

  function addAt(event: MouseEvent<HTMLDivElement>) {
    if (!editing || !value.image.url || value.hotspots.length >= 30) return;
    event.stopPropagation();
    const bounds = event.currentTarget.getBoundingClientRect();
    const xPercent = Math.max(
      0,
      Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100),
    );
    const yPercent = Math.max(
      0,
      Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100),
    );
    const hotspot = {
      id: crypto.randomUUID(),
      xPercent,
      yPercent,
      title: `Punto ${value.hotspots.length + 1}`,
      content: { type: "doc", content: [{ type: "paragraph", content: [] }] },
    };
    onChange?.({ ...value, hotspots: [...value.hotspots, hotspot] });
    setActiveId(hotspot.id);
  }

  return (
    <section className="hotspots-widget" aria-label={value.title || "Imagen interactiva"}>
      {value.title ? <h3>{value.title}</h3> : null}
      {value.image.url ? (
        <div
          className={`hotspots-stage ${editing ? "is-editing" : ""}`}
          onDoubleClick={addAt}
          aria-label={editing ? "Doble clic para añadir un punto" : undefined}
        >
          <img src={value.image.url} alt={value.image.alt} />
          {value.hotspots.map((hotspot, index) => (
            <button
              key={hotspot.id}
              type="button"
              className={hotspot.id === activeId ? "is-active" : ""}
              style={{ left: `${hotspot.xPercent}%`, top: `${hotspot.yPercent}%` }}
              aria-label={`Punto ${index + 1}: ${hotspot.title}`}
              aria-pressed={hotspot.id === activeId}
              onDoubleClick={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                setActiveId(hotspot.id);
              }}
            >
              {index + 1}
            </button>
          ))}
        </div>
      ) : (
        <div className="hotspots-empty">
          <ImageIcon size={28} />
          <strong>Selecciona una imagen en Propiedades</strong>
        </div>
      )}
      {editing && value.image.url ? (
        <p className="widget-author-hint">
          <Plus size={13} /> Doble clic sobre la imagen para añadir un punto.
        </p>
      ) : null}
      {active ? (
        <article className="hotspot-detail" aria-live="polite">
          <h4>{active.title}</h4>
          <RichTextPreview value={active.content} />
        </article>
      ) : null}
    </section>
  );
}
