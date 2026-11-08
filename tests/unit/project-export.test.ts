import { describe, expect, it } from "vitest";

import { exportInternals } from "../../src/client/export/project-export";
import { createZip } from "../../src/client/export/zip";
import { projectDetailSchema } from "../../src/shared/contracts";

const now = "2026-10-23T12:00:00.000Z";
const project = projectDetailSchema.parse({
  id: "project-1",
  name: "Libro <demo>",
  accessLevel: "private",
  ownerId: "user-1",
  ownerName: "Autora Demo",
  isOwner: true,
  canEdit: true,
  description: "Contenido educativo",
  revision: 1,
  createdAt: now,
  updatedAt: now,
  settings: { viewerTemplate: "outline" },
  nodes: [
    {
      id: "node-1",
      projectId: "project-1",
      parentId: null,
      kind: "canvas",
      title: "Introducción",
      position: 0,
      canvasId: "canvas-1",
      createdAt: now,
      updatedAt: now,
    },
  ],
  canvases: [
    {
      id: "canvas-1",
      projectId: "project-1",
      title: "Introducción",
      description: "Primera página",
      schemaVersion: 2,
      revision: 1,
      createdAt: now,
      updatedAt: now,
      composition: {
        version: 2,
        rootIds: ["text-1", "quiz-1", "image-1"],
        objects: {
          "text-1": {
            id: "text-1",
            type: "richText",
            schemaVersion: 2,
            parentId: null,
            slotId: null,
            order: 0,
            data: {
              document: {
                type: "doc",
                content: [{ type: "paragraph", content: [{ type: "text", text: "Hola" }] }],
              },
            },
          },
          "quiz-1": {
            id: "quiz-1",
            type: "quiz",
            schemaVersion: 1,
            parentId: null,
            slotId: null,
            order: 1,
            data: {
              question: "¿Respuesta?",
              options: [
                { id: "a", label: "Sí", correct: true },
                { id: "b", label: "No", correct: false },
              ],
              explanation: "Correcto",
              allowRetry: true,
              showExplanation: true,
            },
          },
          "image-1": {
            id: "image-1",
            type: "image",
            schemaVersion: 1,
            parentId: null,
            slotId: null,
            order: 2,
            data: {
              resourceId: null,
              url: "https://example.com/celula.png",
              alt: "Célula animal",
              caption: "Diagrama",
              fit: "cover",
            },
          },
        },
      },
    },
  ],
});

describe("project export", () => {
  it("renders a standalone reader with escaped metadata and interactive content", () => {
    const html = exportInternals.renderHtml(project, false);
    expect(html).toContain("Libro &lt;demo&gt;");
    expect(html).toContain('id="page-canvas-1"');
    expect(html).toContain('class="quiz"');
    expect(html).toContain("theme-minimal");
    expect(html).not.toContain("imsmanifest");
    const script = /<script>([\s\S]*)<\/script>/u.exec(html)?.[1] ?? "";
    expect(() => new Function(script)).not.toThrow();
  });

  it("embeds the selected project theme in HTML and SCORM-compatible output", () => {
    const themed = structuredClone(project);
    themed.settings.theme = "night";
    const html = exportInternals.renderHtml(themed, false);
    expect(html).toContain("theme-night");
    expect(html).toContain("body.theme-night");
    expect(html).toContain("--theme-accent:#8ea7ff");
  });

  it("preserves the selected image fit without adding an internal scroll area", () => {
    const html = exportInternals.renderHtml(project, false);

    expect(html).toContain('class="image-fit-cover"');
    expect(html).toContain(".widget-image .image-fit-cover img{object-fit:cover}");
    expect(html).toContain(".widget-image figure{display:grid");
    expect(html).not.toContain(".widget-image{overflow:auto}");
  });

  it("exports multiple-response quizzes as checkboxes with the complete answer key", () => {
    const multiple = structuredClone(project);
    const quiz = multiple.canvases[0]?.composition.objects["quiz-1"];
    if (!quiz || quiz.type !== "quiz") throw new Error("Missing quiz fixture");
    quiz.data.selectionMode = "multiple";
    quiz.data.options[1] = { ...quiz.data.options[1], correct: true };

    const html = exportInternals.renderHtml(multiple, false);
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('data-correct="a,b"');
    expect(html).toContain("getAll(name)");
  });

  it("exports keyboard-operable sorting activities to HTML and SCORM", () => {
    const withActivity = structuredClone(project);
    const composition = withActivity.canvases[0]?.composition;
    if (!composition) throw new Error("Missing canvas fixture");
    composition.rootIds.push("sorting-1");
    composition.objects["sorting-1"] = {
      id: "sorting-1",
      type: "sorting",
      schemaVersion: 1,
      parentId: null,
      slotId: null,
      order: 3,
      data: {
        title: "Ordena el proceso",
        prompt: "Coloca los pasos en orden.",
        mode: "order",
        targets: [],
        items: [
          { id: "step-a", label: "Primero", targetId: null },
          { id: "step-b", label: "Después", targetId: null },
        ],
        allowRetry: true,
      },
    };

    const html = exportInternals.renderHtml(withActivity, true);
    expect(html).toContain('data-sorting data-mode="order"');
    expect(html).toContain('aria-label="Subir Primero"');
    expect(html).toContain("Actividad completada.");
    const script = /<script>([\s\S]*)<\/script>/u.exec(html)?.[1] ?? "";
    expect(() => new Function(script)).not.toThrow();
  });

  it("exports placed indexes and previous/next navigation bars", () => {
    const withNavigation = structuredClone(project);
    const composition = withNavigation.canvases[0]?.composition;
    if (!composition) throw new Error("Missing canvas fixture");
    const items = [
      { id: "nav-a", label: "Introducción", canvasId: "canvas-1" },
      { id: "nav-b", label: "Siguiente tema", canvasId: "canvas-2" },
    ];
    composition.rootIds.push("index-1", "bar-1");
    composition.objects["index-1"] = {
      id: "index-1",
      type: "navigation",
      schemaVersion: 1,
      parentId: null,
      slotId: null,
      order: 3,
      data: {
        label: "Continuar",
        destination: { kind: "canvas", canvasId: "canvas-2" },
        style: "primary",
        openInNewTab: false,
        variant: "index",
        title: "Contenido",
        items,
        showCurrent: true,
      },
    };
    composition.objects["bar-1"] = {
      ...composition.objects["index-1"],
      id: "bar-1",
      order: 4,
      data: { ...composition.objects["index-1"].data, variant: "bar" },
    };

    const html = exportInternals.renderHtml(withNavigation, false);
    expect(html).toContain('class="embedded-index"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('class="embedded-navigation-bar"');
    expect(html).toContain('href="#page-canvas-2"');
  });

  it("builds a SCORM 1.2 manifest with one launchable SCO", () => {
    const manifest = exportInternals.scormManifest(project);
    expect(manifest).toContain("<schemaversion>1.2</schemaversion>");
    expect(manifest).toContain('adlcp:scormtype="sco"');
    expect(manifest).toContain('href="index.html"');
  });

  it("keeps SCORM completion and restores the learner location", () => {
    const html = exportInternals.renderHtml(project, true);
    expect(html).toContain('status==="not attempted"');
    expect(html).toContain("cmi.core.lesson_location");
    expect(html).toContain("LMSFinish");
  });

  it("creates a valid uncompressed zip central directory", async () => {
    const blob = createZip([
      { name: "index.html", content: "<!doctype html>" },
      { name: "imsmanifest.xml", content: "<manifest/>" },
    ]);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect([...bytes.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(new TextDecoder().decode(bytes)).toContain("imsmanifest.xml");
    expect(blob.type).toBe("application/zip");
  });
});
