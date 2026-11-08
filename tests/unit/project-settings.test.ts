import { describe, expect, it } from "vitest";

import { projectSettingsSchema, updateProjectInputSchema } from "../../src/shared/contracts";

describe("project settings", () => {
  it("aplica árbol + hoja a proyectos anteriores sin configuración", () => {
    expect(projectSettingsSchema.parse({})).toEqual({
      viewerTemplate: "outline",
      theme: "minimal",
    });
  });

  it("acepta una actualización formada únicamente por las propiedades del visor", () => {
    expect(
      updateProjectInputSchema.parse({
        revision: 3,
        settings: { viewerTemplate: "presentation" },
      }),
    ).toEqual({
      revision: 3,
      settings: { viewerTemplate: "presentation", theme: "minimal" },
    });
  });

  it("acepta temas visuales accesibles y tipados", () => {
    expect(projectSettingsSchema.parse({ theme: "night" })).toEqual({
      viewerTemplate: "outline",
      theme: "night",
    });
  });
});
