import { Expand, Loader2, Network, X } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";

import type { DiagramWidget as DiagramWidgetData } from "../../shared/contracts";
import { Dialog } from "./ui/Dialog";

const ExcalidrawSurface = lazy(() =>
  import("./ExcalidrawSurface").then((module) => ({ default: module.ExcalidrawSurface })),
);

export function DiagramWidget({
  value,
  readOnly,
  activeEdit = false,
  onExitEdit,
  onChange,
}: {
  value: DiagramWidgetData["data"];
  readOnly: boolean;
  activeEdit?: boolean;
  onExitEdit?: () => void;
  onChange: (value: DiagramWidgetData["data"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(value);

  useEffect(() => {
    if (!activeEdit || readOnly) return;
    setWorking(value);
    setOpen(true);
  }, [activeEdit, readOnly, value]);

  if (readOnly)
    return (
      <div className="diagram-readonly">
        <Suspense fallback={<DiagramLoading />}>
          <ExcalidrawSurface scene={value} readOnly />
        </Suspense>
      </div>
    );

  return (
    <>
      <button
        className="diagram-summary"
        type="button"
        onClick={() => {
          setWorking(value);
          setOpen(true);
        }}
      >
        <Network size={28} />
        <span>
          <strong>{value.elements.length ? "Editar diagrama" : "Crear diagrama"}</strong>
          <small>{value.elements.length} elementos · Excalidraw</small>
        </span>
        <Expand size={18} />
      </button>
      {open ? (
        <Dialog
          className="diagram-modal"
          ariaLabel="Editor de diagrama"
          variant="fullscreen"
          onDismiss={() => {
            setOpen(false);
            onExitEdit?.();
          }}
        >
          <header>
            <div>
              <span>DIAGRAMA</span>
              <strong>Editor Excalidraw</strong>
            </div>
            <div>
              <button
                type="button"
                data-autofocus
                onClick={() => {
                  setOpen(false);
                  onExitEdit?.();
                }}
              >
                <X size={17} /> Cancelar
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={() => {
                  onChange(working);
                  setOpen(false);
                  onExitEdit?.();
                }}
              >
                Aplicar
              </button>
            </div>
          </header>
          <div className="diagram-surface">
            <Suspense fallback={<DiagramLoading />}>
              <ExcalidrawSurface scene={working} readOnly={false} onChange={setWorking} />
            </Suspense>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}

function DiagramLoading() {
  return (
    <div className="diagram-loading">
      <Loader2 className="spin" size={22} /> Cargando editor…
    </div>
  );
}
