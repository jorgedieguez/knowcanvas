import type { TimelineWidget as TimelineWidgetData } from "../../shared/contracts";
import { RichTextPreview } from "./RichTextEditor";

export function TimelineWidget({ value }: { value: TimelineWidgetData["data"] }) {
  return (
    <section className="timeline-widget" aria-label={value.title || "Línea temporal"}>
      {value.title ? <h3>{value.title}</h3> : null}
      <ol>
        {value.items.map((item) => (
          <li key={item.id}>
            <span className="timeline-marker" aria-hidden="true" />
            <div className="timeline-entry">
              {item.date ? <time>{item.date}</time> : null}
              <h4>{item.title}</h4>
              <RichTextPreview value={item.content} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
