import { Excalidraw } from "@excalidraw/excalidraw";

import type { DiagramWidget } from "../../shared/contracts";

type Scene = DiagramWidget["data"];

export function ExcalidrawSurface({
  scene,
  readOnly,
  onChange,
}: {
  scene: Scene;
  readOnly: boolean;
  onChange?: (scene: Scene) => void;
}) {
  return (
    <Excalidraw
      initialData={scene as never}
      viewModeEnabled={readOnly}
      zenModeEnabled={readOnly}
      gridModeEnabled={false}
      onChange={(elements, appState, files) =>
        onChange?.({
          elements: elements as unknown as Scene["elements"],
          appState: appState as unknown as Scene["appState"],
          files: files as unknown as Scene["files"],
        })
      }
      UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false } }}
      langCode="es-ES"
    />
  );
}
