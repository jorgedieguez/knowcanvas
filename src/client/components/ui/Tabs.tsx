import { useRef } from "react";

export function Tabs<TabId extends string>({
  idPrefix,
  label,
  options,
  value,
  onChange,
  className = "",
}: {
  idPrefix: string;
  label: string;
  options: readonly { id: TabId; label: string }[];
  value: TabId;
  onChange: (value: TabId) => void;
  className?: string;
}) {
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);

  function selectByIndex(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.id);
    tabs.current[index]?.focus();
  }

  return (
    <div className={`property-tabs ${className}`} role="tablist" aria-label={label}>
      {options.map((option, index) => (
        <button
          ref={(element) => {
            tabs.current[index] = element;
          }}
          id={`${idPrefix}-tab-${option.id}`}
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          aria-controls={`${idPrefix}-panel-${option.id}`}
          tabIndex={value === option.id ? 0 : -1}
          className={value === option.id ? "active" : ""}
          onClick={() => onChange(option.id)}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            if (event.key === "Home") selectByIndex(0);
            else if (event.key === "End") selectByIndex(options.length - 1);
            else {
              const offset = event.key === "ArrowRight" ? 1 : -1;
              selectByIndex((index + offset + options.length) % options.length);
            }
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
