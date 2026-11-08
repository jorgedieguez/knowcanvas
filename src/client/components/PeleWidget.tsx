import type { PeleWidget as PeleWidgetData } from "../../shared/contracts";
import { PeleSurface } from "./PeleSurface";

export function PeleWidget({
  value,
  editing,
  onChange,
}: {
  value: PeleWidgetData["data"];
  editing: boolean;
  onChange: (value: PeleWidgetData["data"]) => void;
}) {
  return (
    <div className={`pele-widget ${editing ? "editing" : ""}`}>
      {editing ? (
        <label className="pele-source-label">
          Código Mermaid
          <textarea
            aria-label="Código Mermaid"
            value={value.source}
            maxLength={50_000}
            onChange={(event) => onChange({ ...value, source: event.target.value })}
            spellCheck={false}
          />
        </label>
      ) : null}
      <div className="pele-preview">
        <PeleSurface source={value.source} />
      </div>
      {value.caption ? <p className="pele-caption">{value.caption}</p> : null}
    </div>
  );
}
