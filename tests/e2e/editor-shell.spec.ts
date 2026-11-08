import { expect, test, type Page } from "@playwright/test";

const now = "2026-10-09T12:00:00.000Z";
const user = {
  id: "user-1",
  email: "autora@example.com",
  displayName: "Autora Demo",
  avatarUrl: null,
};
const project = {
  id: "project-1",
  name: "Explorando la célula",
  description: "Biología interactiva",
  accessLevel: "private" as const,
  ownerId: user.id,
  ownerName: user.displayName,
  isOwner: true,
  canEdit: true,
  revision: 1,
  createdAt: now,
  updatedAt: now,
};
const detail = {
  ...project,
  settings: { viewerTemplate: "outline" as const, theme: "minimal" as const },
  nodes: [
    {
      id: "folder-1",
      projectId: project.id,
      parentId: null,
      kind: "container",
      title: "Introducción",
      position: 0,
      canvasId: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "node-1",
      projectId: project.id,
      parentId: "folder-1",
      kind: "canvas",
      title: "¿Qué es una célula?",
      position: 0,
      canvasId: "canvas-1",
      createdAt: now,
      updatedAt: now,
    },
  ],
  canvases: [
    {
      id: "canvas-1",
      projectId: project.id,
      title: "¿Qué es una célula?",
      description: "Una unidad de experiencia adaptable.",
      composition: { version: 2, rootIds: [], objects: {} },
      schemaVersion: 2,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    },
  ],
};

async function mockAuthenticatedApi(page: Page) {
  let currentDetail = structuredClone(detail);
  await page.route("**/api/me", (route) =>
    route.fulfill({ json: { data: { user, authConfigured: true } } }),
  );
  await page.route("**/api/projects", (route) => route.fulfill({ json: { data: [project] } }));
  await page.route("**/api/projects/project-1", async (route) => {
    if (route.request().method() === "PATCH") {
      const input = route.request().postDataJSON() as {
        name?: string;
        description?: string;
        settings?: typeof detail.settings;
        accessLevel?: typeof detail.accessLevel;
      };
      currentDetail = {
        ...currentDetail,
        name: input.name ?? currentDetail.name,
        description: input.description ?? currentDetail.description,
        settings: input.settings ?? currentDetail.settings,
        accessLevel: input.accessLevel ?? currentDetail.accessLevel,
        revision: currentDetail.revision + 1,
      };
    }
    await route.fulfill({ json: { data: currentDetail } });
  });
  await page.route("**/api/canvases/canvas-1", async (route) => {
    const body = route.request().postDataJSON() as {
      composition: (typeof detail.canvases)[0]["composition"];
    };
    await route.fulfill({
      delay: 120,
      json: { data: { ...detail.canvases[0], composition: body.composition, revision: 2 } },
    });
  });
}

async function insertWidget(
  page: Page,
  name:
    | "Texto enriquecido"
    | "Diagrama"
    | "Diagrama Mermaid"
    | "Tabla"
    | "Botón de navegación"
    | "Ejercicio tipo test"
    | "Acordeón"
    | "Pestañas"
    | "Tarjetas reversibles"
    | "Línea temporal"
    | "Imagen interactiva",
) {
  await page.getByRole("button", { name: "Insertar widget" }).click();
  await page
    .getByRole("dialog", { name: "Catálogo de widgets" })
    .getByRole("button", {
      name: name === "Diagrama" ? /^Diagrama Lienzo visual/u : new RegExp(`^${name}\\b`, "u"),
    })
    .click();
  await expect(page.getByText(/^Colocando .*Clic para situar/u)).toBeVisible();
  await page
    .getByRole("region", { name: "Contenido del lienzo" })
    .click({ position: { x: 400, y: 300 } });
}

test("configures a private OpenAI key from account settings without redisplaying it", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Account settings desktop regression");
  await mockAuthenticatedApi(page);
  let configured = false;
  await page.route("**/api/account/ai", async (route) => {
    const method = route.request().method();
    if (method === "PUT") configured = true;
    if (method === "DELETE") configured = false;
    await route.fulfill({
      status: method === "DELETE" ? 204 : 200,
      ...(method === "DELETE"
        ? {}
        : {
            json: {
              data: configured
                ? { configured: true, lastFour: "7890", updatedAt: now }
                : { configured: false, lastFour: null, updatedAt: null },
            },
          }),
    });
  });
  await page.goto("/");

  await page.getByRole("button", { name: "Abrir perfil" }).click();
  const dialog = page.getByRole("dialog", { name: "Perfil y configuración" });
  const key = "sk-test-key-1234567890";
  await dialog.getByLabel("Clave secreta de OpenAI").fill(key);
  await dialog.getByRole("button", { name: "Validar y guardar" }).click();

  await expect(dialog).toContainText("Conexión lista");
  await expect(dialog).toContainText("•••• •••• 7890");
  await expect(dialog).not.toContainText(key);
  await expect(dialog.getByLabel("Nueva clave secreta")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Cambiar clave" }).click();
  await expect(dialog.getByLabel("Nueva clave secreta")).toHaveValue("");
});

test("previews and applies an AI content proposal only after confirmation", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "AI authoring desktop regression");
  await mockAuthenticatedApi(page);
  await page.route("**/api/ai/proposals", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    await route.fulfill({
      json: {
        data: {
          summary: "Introducción y comprobación sobre la fotosíntesis",
          widgets: [
            {
              type: "richText",
              markdown: "## Fotosíntesis\n\nLas plantas transforman la energía luminosa.",
              layout: {
                row: 1,
                column: 1,
                columnSpan: 7,
                minHeight: 360,
                group: "contenido",
                emphasis: "primary",
              },
            },
            {
              type: "quiz",
              question: "¿Qué energía utilizan las plantas?",
              options: [
                { label: "Energía luminosa", correct: true },
                { label: "Energía sonora", correct: false },
              ],
              explanation: "La luz impulsa el proceso.",
              selectionMode: "single",
              layout: {
                row: 1,
                column: 8,
                columnSpan: 5,
                minHeight: 480,
                group: "contenido",
                emphasis: "normal",
              },
            },
          ],
        },
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  const assistantBubble = page.getByRole("button", { name: "Abrir Asistente IA" });
  await assistantBubble.click();

  const dialog = page.getByRole("dialog", { name: "Copiloto de contenido" });
  await expect(dialog.getByLabel("¿Qué quieres crear?")).toBeFocused();
  await dialog.getByLabel("¿Qué quieres crear?").fill("Crea una explicación y una pregunta");
  await dialog.getByLabel("¿Qué quieres crear?").press("Enter");
  await expect(dialog.getByRole("status")).toContainText(
    "El asistente está preparando una propuesta",
  );
  await expect(dialog).toContainText("Introducción y comprobación sobre la fotosíntesis");
  await expect(dialog).toContainText("Crea una explicación y una pregunta");
  const canvas = page.getByRole("region", { name: "Contenido del lienzo" });
  await expect(canvas.getByText("Las plantas transforman la energía luminosa.")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Colocar 2 en el lienzo" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.locator(".group-placement-preview")).toBeVisible();
  await expect(page.getByLabel("Nivel de zoom")).not.toHaveText("100%");
  await canvas.click({ position: { x: 420, y: 360 } });
  await expect(canvas).toContainText("Las plantas transforman la energía luminosa.");
  await expect(canvas).toContainText("¿Qué energía utilizan las plantas?");
  await expect(page.locator('.widget-window[data-selected="true"]')).toHaveCount(2);
  await expect(page.getByRole("toolbar", { name: "Organizar selección" })).toBeVisible();
  await assistantBubble.click();
  await expect(dialog).toContainText("Elementos preparados para colocarlos juntos");
  await expect(dialog).toContainText("Crea una explicación y una pregunta");
  await dialog.getByRole("button", { name: "Cerrar" }).click();
  await page.getByRole("button", { name: "Deshacer" }).click();
  await expect(canvas).not.toContainText("Las plantas transforman la energía luminosa.");
  await expect(canvas).not.toContainText("¿Qué energía utilizan las plantas?");
});

test("navigates from the library to the responsive editor", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Tus libros" })).toBeVisible();
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await expect(page.getByRole("heading", { name: "KnowCanvas" })).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();

  const viewport = page.viewportSize();
  const explorer = page.getByRole("complementary", { name: "Explorador" });
  const properties = page.getByRole("complementary", { name: "Propiedades" });
  if (viewport && viewport.width <= 820) {
    await page.getByRole("button", { name: "Abrir explorador" }).click();
    await expect(explorer).toBeVisible();
    await page.getByRole("button", { name: "Cerrar explorador" }).click();
    await page.getByRole("button", { name: "Abrir propiedades" }).click();
    await expect(properties).toBeVisible();
  } else {
    await expect(explorer).toBeVisible();
    await expect(properties).toBeHidden();
  }
});

test("offers distinct, read-only study layouts with sequential navigation", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await page.getByRole("button", { name: "Estudiar" }).click();

  await expect(page.getByRole("group", { name: "Diseño del modo estudio" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegación entre hojas" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Propiedades" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Deshacer" })).toHaveCount(0);

  await page.getByRole("button", { name: "Revista" }).click();
  await expect(page.locator(".canvas-document")).toHaveClass(/study-magazine/);
  await page.getByRole("button", { name: "Presentación" }).click();
  await expect(page.locator(".canvas-document")).toHaveClass(/study-presentation/);
});

test("persists the viewer template in project properties", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();

  await page.getByRole("button", { name: "Propiedades del libro" }).click();
  const dialog = page.getByRole("dialog", { name: "Propiedades" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("radio", { name: /Presentación/ }).check();
  await dialog.getByRole("button", { name: "Guardar propiedades" }).click();
  await expect(dialog).toHaveCount(0);

  await page.getByRole("button", { name: "Estudiar" }).click();
  await expect(page.locator(".canvas-document")).toHaveClass(/study-presentation/);
});

test("selects the project root to show page thumbnails and project properties", async ({
  page,
}) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();

  const viewport = page.viewportSize();
  if (viewport && viewport.width <= 820) {
    await page.getByRole("button", { name: "Abrir explorador" }).click();
  }
  await page
    .getByRole("navigation", { name: "Árbol del proyecto" })
    .getByRole("button", { name: "Explorando la célula" })
    .click();

  await expect(
    page.getByRole("main").getByRole("heading", { name: "Explorando la célula" }),
  ).toBeVisible();
  await expect(page.getByRole("list", { name: "Páginas del proyecto" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Propiedades" })).toContainText(
    "PROPIEDADES DEL PROYECTO",
  );
  const properties = page.getByRole("complementary", { name: "Propiedades" });
  const viewerTemplate = properties.getByRole("combobox", { name: "Plantilla del visor" });
  await expect(viewerTemplate).toHaveValue("outline");
  await expect(properties.getByRole("button", { name: "Guardar propiedades" })).toHaveCount(0);
  await viewerTemplate.selectOption("presentation");
  await expect(properties.getByRole("status")).toHaveText("Cambios guardados");
  await properties.getByRole("radio", { name: /Nocturno/ }).check();
  await expect(properties.getByRole("status")).toHaveText("Cambios pendientes");
  await expect(properties.getByRole("status")).toHaveText("Cambios guardados");
  await page.getByRole("button", { name: "Estudiar" }).click();
  await expect(page.locator(".study-workspace")).toHaveClass(/theme-night/);
});

test("uses Publish as the single entry point for HTML and SCORM packages", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await page.getByRole("button", { name: "Publicar" }).click();

  const dialog = page.getByRole("dialog", { name: "Publicar" });
  await expect(dialog.getByRole("button", { name: /Copiar enlace público/ })).toBeDisabled();
  const htmlDownload = page.waitForEvent("download");
  await dialog.getByRole("button", { name: /Descargar HTML/ }).click();
  await expect((await htmlDownload).suggestedFilename()).toBe("explorando-la-celula-html.zip");

  const scormDownload = page.waitForEvent("download");
  await dialog.getByRole("button", { name: /Descargar SCORM 1.2/ }).click();
  await expect((await scormDownload).suggestedFilename()).toBe(
    "explorando-la-celula-scorm-1-2.zip",
  );
});

test("opens a public book in study mode without requiring a session", async ({ page }) => {
  const publicDetail = {
    ...structuredClone(detail),
    accessLevel: "public_read" as const,
    isOwner: false,
    canEdit: false,
  };
  await page.route("**/api/public/projects/project-1", (route) =>
    route.fulfill({ json: { data: publicDetail } }),
  );
  await page.route("**/api/me", (route) =>
    route.fulfill({ json: { data: { user: null, authConfigured: true } } }),
  );

  await page.goto("/read/project-1");

  await expect(page.getByText("Explorando la célula").first()).toBeVisible();
  await expect(page.locator(".study-workspace")).toBeVisible();
  await expect(page.getByRole("button", { name: "Editar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Publicar" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Continuar con Google/ })).toHaveCount(0);
});

test("collapses the tree and opens a closable contextual inspector", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  const workspace = page.locator(".workspace");
  await page.getByRole("button", { name: "Contraer explorador" }).click();
  await expect(workspace).toHaveClass(/navigation-collapsed/);

  await insertWidget(page, "Texto enriquecido");
  await page.getByRole("button", { name: /Seleccionar widget/ }).click();
  await expect(workspace).toHaveClass(/properties-open/);
  await page.getByRole("button", { name: "Cerrar propiedades" }).last().click();
  await expect(workspace).toHaveClass(/properties-closed/);
});

test("explains Google setup when OAuth is not configured", async ({ page }) => {
  await page.route("**/api/me", (route) =>
    route.fulfill({ json: { data: { user: null, authConfigured: false } } }),
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Convierte ideas complejas/ })).toBeVisible();
  await expect(page.getByText("Falta configurar Google OAuth")).toBeVisible();
});

test("loads the Excalidraw diagram editor on demand", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Diagrama");
  await page.getByRole("button", { name: /Seleccionar widget/ }).dblclick();
  await expect(page.getByRole("dialog", { name: "Editor de diagrama" })).toBeVisible();
  await expect(page.getByText("Editor Excalidraw")).toBeVisible();
});

test("creates and edits a Mermaid diagram rendered by Pele", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Diagrama Mermaid");

  const widget = page.locator('.widget-window[data-widget-type="pele"]');
  await expect(widget.locator(".pele-surface svg")).toBeVisible();
  await widget.getByRole("button", { name: /Seleccionar widget/ }).dblclick();
  const source = widget.getByRole("textbox", { name: "Código Mermaid" });
  await expect(source).toBeVisible();
  await source.fill("sequenceDiagram\n  Alice->>Bob: Hola\n  Bob-->>Alice: Bienvenida");
  await expect(widget.locator(".pele-surface svg")).toBeVisible();
  await source.press("Escape");
  await expect(source).toHaveCount(0);
  await expect(widget.locator(".pele-surface svg")).toBeVisible();
});

test("inserts a new widget at the last canvas pointer position", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Desktop pointer-placement regression");
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  await page.getByRole("button", { name: /Seleccionar widget/ }).click();

  const canvas = page.getByRole("region", { name: "Contenido del lienzo" });
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) return;
  const pointer = { x: bounds.x + 620, y: bounds.y + 420 };
  await page.mouse.move(pointer.x, pointer.y);
  await page
    .getByRole("complementary", { name: "Propiedades" })
    .getByRole("button", { name: "Diagrama Mermaid" })
    .click();
  await page.mouse.move(pointer.x, pointer.y);
  const previewBounds = await page.locator(".widget-placement-preview").boundingBox();
  expect(previewBounds).not.toBeNull();
  if (!previewBounds) return;
  expect(Math.abs(previewBounds.x + previewBounds.width / 2 - pointer.x)).toBeLessThan(3);
  expect(Math.abs(previewBounds.y + previewBounds.height / 2 - pointer.y)).toBeLessThan(3);
  await page.mouse.click(pointer.x, pointer.y);
  await expect(page.locator('.widget-window[data-widget-type="pele"]')).toHaveCount(1);
});

test("inserts widgets into the current canvas from the properties sidebar", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  await page.getByRole("button", { name: /Seleccionar widget/ }).click();

  const properties = page.getByRole("complementary", { name: "Propiedades" });
  await expect(properties.getByRole("tab", { name: "Propiedades" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await properties.getByRole("tab", { name: "Herramientas" }).click();
  await properties.getByRole("button", { name: "Tabla" }).click();
  await page
    .getByRole("region", { name: "Contenido del lienzo" })
    .click({ position: { x: 760, y: 620 } });
  await expect(page.locator('.widget-window[data-widget-type="table"]')).toHaveCount(1);
  await properties.getByRole("tab", { name: "Herramientas" }).click();
  await properties.getByRole("button", { name: "Diagrama Mermaid" }).click();
  await page
    .getByRole("region", { name: "Contenido del lienzo" })
    .click({ position: { x: 760, y: 300 } });
  const mermaid = page.locator('.widget-window[data-widget-type="pele"]');
  await expect(mermaid).toHaveCount(1);
  await expect(mermaid).toHaveAttribute("data-selected", "true");
  await expect(page.locator('.widget-window[data-widget-type="richText"]')).toHaveCount(1);
  await properties.getByRole("tab", { name: "Herramientas" }).click();
  await expect(properties.getByRole("button", { name: "Ejercicio tipo test" })).toBeEnabled();
});

test("configures a navigation button and uses it in study mode", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Learning widget desktop regression");
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Botón de navegación");

  const properties = page.getByRole("complementary", { name: "Propiedades" });
  await properties.getByLabel("Texto del botón").fill("Abrir recurso");
  await properties.getByRole("tab", { name: "Apariencia" }).click();
  await properties.getByLabel("Estilo del botón").selectOption("secondary");
  await properties.getByLabel("Color de acento").fill("#8a3ffc");
  await properties.getByRole("tab", { name: "Comportamiento" }).click();
  await properties.getByLabel("Acción").selectOption("external");
  await properties.getByLabel("URL").fill("https://example.com/lesson");
  await page.getByRole("button", { name: "Estudiar" }).click();

  const link = page.getByRole("link", { name: "Abrir recurso" });
  await expect(link).toHaveAttribute("href", "https://example.com/lesson");
});

test("answers a quiz with accessible immediate feedback", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Learning widget desktop regression");
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Ejercicio tipo test");

  const properties = page.getByRole("complementary", { name: "Propiedades" });
  await expect(properties).toHaveAttribute("data-inspector-context", "quiz");
  const quizSurface = page.locator(
    '.widget-window[data-widget-type="quiz"] .widget-window-content',
  );
  await expect(quizSurface).toHaveCSS("background-color", "rgb(255, 248, 243)");
  expect(
    await quizSurface.evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--widget-accent").trim(),
    ),
  ).toBe("#c2410c");
  await properties.getByLabel("Pregunta").fill("¿Qué estructura contiene el ADN?");
  await properties.getByRole("textbox", { name: "Respuesta 1", exact: true }).fill("El núcleo");
  await properties.getByRole("textbox", { name: "Respuesta 2", exact: true }).fill("La membrana");
  await page.getByRole("button", { name: "Estudiar" }).click();
  await page.getByText("El núcleo", { exact: true }).click();
  const studyQuiz = page.locator(".widget-card:has(.quiz-widget)");
  await expect(studyQuiz).toHaveCSS("overflow", "visible");
  await page.getByRole("button", { name: "Comprobar respuesta" }).click();
  await expect(page.locator(".quiz-feedback")).toContainText("¡Correcto!");
  await expect(page.getByRole("button", { name: /Reintentar/ })).toBeVisible();
  await expect
    .poll(() => studyQuiz.evaluate((element) => element.scrollHeight <= element.clientHeight + 1))
    .toBe(true);
});

test("authors and answers a multiple-response quiz", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Learning widget desktop regression");
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Ejercicio tipo test");

  const properties = page.getByRole("complementary", { name: "Propiedades" });
  await properties.getByRole("tab", { name: "Comportamiento" }).click();
  await properties.getByLabel("Permitir varias respuestas").check();
  await properties.getByRole("tab", { name: "Contenido" }).click();
  await properties.getByRole("textbox", { name: "Respuesta 1", exact: true }).fill("Núcleo");
  await properties.getByRole("textbox", { name: "Respuesta 2", exact: true }).fill("Mitocondria");
  await properties.getByLabel("Marcar respuesta 2 como correcta").check();

  await page.getByRole("button", { name: "Estudiar" }).click();
  await page.getByText("Núcleo", { exact: true }).click();
  await page.getByText("Mitocondria", { exact: true }).click();
  await page.getByRole("button", { name: "Comprobar respuesta" }).click();
  await expect(page.locator(".quiz-feedback")).toContainText("¡Correcto!");
});

test("edits accordion sections from properties and opens them in study mode", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Learning widget desktop regression");
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Acordeón");

  const properties = page.getByRole("complementary", { name: "Propiedades" });
  const propertiesContent = page.locator("#inspector-panel-properties");
  const fixedToolbar = properties.getByRole("toolbar", {
    name: "Formato de contenido del apartado 1",
  });
  await expect(fixedToolbar).toBeVisible();
  await expect(fixedToolbar.getByRole("button", { name: "Negrita" })).toBeVisible();
  await expect(fixedToolbar.getByRole("button", { name: "Insertar tabla" })).toBeVisible();
  await expect(fixedToolbar.getByRole("button", { name: "Insertar imagen" })).toBeVisible();
  await expect(fixedToolbar.getByRole("combobox", { name: "Tipo de letra" })).toBeVisible();
  await expect(fixedToolbar.getByRole("combobox", { name: "Tamaño de letra" })).toBeVisible();
  await expect(fixedToolbar.getByLabel("Color del texto")).toBeVisible();
  const scrollMetrics = await propertiesContent.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight);
  await propertiesContent.evaluate((element) => element.scrollTo({ top: element.scrollHeight }));
  await expect
    .poll(() => propertiesContent.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  const propertyTitle = properties.getByLabel("Título del apartado 1");
  await expect(
    properties.getByRole("textbox", { name: "Contenido del apartado 1" }),
  ).not.toBeFocused();
  await expect(page.locator('.widget-window[data-widget-type="accordion"]')).toBeInViewport();
  await propertyTitle.fill("");
  await propertyTitle.pressSequentially("Membrana", { delay: 40 });
  await expect(propertyTitle).toBeFocused();
  await expect(propertyTitle).toHaveValue("Membrana");

  const accordion = page.locator('.widget-window[data-widget-type="accordion"]');
  await accordion.dblclick();
  await accordion.getByLabel("Título del apartado 1").fill("La membrana celular");
  await accordion
    .getByRole("textbox", { name: "Contenido del apartado 1" })
    .fill("Regula el intercambio de sustancias con el entorno.");

  await expect(accordion.getByLabel("Título del apartado 1")).toHaveValue("La membrana celular");
  await page.getByRole("button", { name: "Estudiar" }).click();
  await page.getByRole("button", { name: "La membrana celular" }).click();
  await expect(page.getByText("Regula el intercambio de sustancias con el entorno.")).toBeVisible();
});

test("authors rich tabs and switches their content in study mode", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Learning widget desktop regression");
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Pestañas");

  const properties = page.getByRole("complementary", { name: "Propiedades" });
  await properties.getByLabel("Título de la pestaña 1").fill("Concepto");
  await properties.getByLabel("Título de la pestaña 2").fill("Aplicación");
  await properties
    .getByRole("textbox", { name: "Contenido de la pestaña 2" })
    .fill("Un ejemplo aplicado y significativo.");
  await properties.getByRole("button", { name: "Añadir pestaña" }).click();
  await expect(properties.getByLabel("Título de la pestaña 3")).toHaveValue("Pestaña 3");

  await page.getByRole("button", { name: "Estudiar" }).click();
  const tabs = page.getByRole("region", { name: "Explora por temas" });
  await tabs.getByRole("tab", { name: "Aplicación" }).click();
  await expect(tabs.getByRole("tabpanel")).toContainText("Un ejemplo aplicado y significativo.");
  await expect(tabs.getByRole("tab", { name: "Aplicación" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("authors and studies reversible flashcards", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Learning widget desktop regression");
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Tarjetas reversibles");

  const properties = page.getByRole("complementary", { name: "Propiedades" });
  await properties
    .getByRole("textbox", { name: "Anverso de la tarjeta 1" })
    .fill("¿Qué orgánulo contiene el ADN?");
  await properties
    .getByRole("textbox", { name: "Reverso de la tarjeta 1" })
    .fill("El núcleo celular.");
  await properties.getByRole("button", { name: "Añadir tarjeta" }).click();
  await expect(properties.getByRole("textbox", { name: "Anverso de la tarjeta 3" })).toBeVisible();

  await page.getByRole("button", { name: "Estudiar" }).click();
  const flashcards = page.getByRole("region", { name: "Comprueba lo aprendido" });
  await expect(flashcards).toContainText("¿Qué orgánulo contiene el ADN?");
  await flashcards.getByRole("button", { name: "Mostrar respuesta" }).click();
  await expect(flashcards).toContainText("El núcleo celular.");
  await flashcards.getByRole("button", { name: "Tarjeta siguiente" }).click();
  await expect(flashcards).toContainText("2 de 3");
  await expect(flashcards.getByRole("button", { name: "Mostrar respuesta" })).toBeVisible();
});

test("authors and reads a rich timeline", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Learning widget desktop regression");
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Línea temporal");

  const properties = page.getByRole("complementary", { name: "Propiedades" });
  await properties.getByLabel("Fecha del hito 1").fill("1665");
  await properties.getByLabel("Nombre del hito 1").fill("Primera observación celular");
  await properties
    .getByRole("textbox", { name: "Contenido del hito 1" })
    .fill("Robert Hooke observa estructuras en una lámina de corcho.");
  await properties.getByRole("button", { name: "Añadir hito" }).click();
  await expect(properties.getByLabel("Nombre del hito 3")).toHaveValue("Hito 3");

  await page.getByRole("button", { name: "Estudiar" }).click();
  const timeline = page.getByRole("region", { name: "Una historia paso a paso" });
  await expect(timeline).toContainText("1665");
  await expect(timeline).toContainText("Primera observación celular");
  await expect(timeline).toContainText("Robert Hooke observa estructuras");
});

test("authors and explores an interactive image", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Learning widget desktop regression");
  await mockAuthenticatedApi(page);
  await page.route("https://example.com/cell.jpg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#dbeafe"/></svg>',
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Imagen interactiva");

  const properties = page.getByRole("complementary", { name: "Propiedades" });
  await properties.getByRole("button", { name: "Elegir imagen" }).click();
  const picker = page.getByRole("dialog", { name: "Añadir una imagen" });
  await picker.getByLabel("Dirección").fill("https://example.com/cell.jpg");
  await picker.getByLabel("Texto alternativo").fill("Diagrama de una célula");
  await picker.getByRole("button", { name: "Insertar URL" }).click();

  await properties.getByRole("button", { name: "Añadir punto" }).click();
  await properties.getByLabel("Título del punto 1").fill("Núcleo");
  await properties
    .getByRole("textbox", { name: "Contenido del punto 1" })
    .fill("Contiene la mayor parte del material genético.");
  await properties.getByLabel("Posición X del punto 1").fill("35");
  await properties.getByLabel("Posición Y del punto 1").fill("40");

  await page.getByRole("button", { name: "Estudiar" }).click();
  const hotspots = page.getByRole("region", { name: "Explora la imagen" });
  await hotspots.getByRole("button", { name: "Punto 1: Núcleo" }).click();
  await expect(hotspots).toContainText("Contiene la mayor parte del material genético.");
  await expect(hotspots.getByRole("img", { name: "Diagrama de una célula" })).toBeVisible();
});

test("opens the widget library from empty canvas space and places the chosen widget", async ({
  page,
}) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();

  const canvas = page.getByRole("region", { name: "Contenido del lienzo" });
  await canvas.click({ position: { x: 240, y: 520 } });
  const properties = page.getByRole("complementary", { name: "Propiedades" });
  await expect(properties).toBeVisible();
  await expect(properties.getByRole("tab", { name: "Herramientas" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await properties.getByRole("searchbox", { name: "Buscar herramientas" }).fill("test");
  await expect(properties.getByRole("button", { name: "Ejercicio tipo test" })).toBeVisible();
  await expect(properties.locator(".widget-catalog-preview")).toContainText("Ejercicio tipo test");
  await expect(properties.getByRole("button", { name: "Tabla" })).toHaveCount(0);
  await properties.getByRole("searchbox", { name: "Buscar herramientas" }).fill("");
  await properties.getByRole("button", { name: "Tabla" }).click();
  await expect(page.getByText(/^Colocando Tabla/u)).toBeVisible();
  await expect(page.locator(".widget-placement-preview")).toBeVisible();
  await canvas.click({ position: { x: 420, y: 320 } });
  const table = page.locator('.widget-window[data-widget-type="table"]');
  await expect(table).toHaveCount(1);
  await expect(table.getByLabel("2 filas por 2 columnas")).toBeVisible();
  await expect(table).toContainText("Concepto");
});

test("starts the AI assistant from a creation intent in the widget library", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();

  const canvas = page.getByRole("region", { name: "Contenido del lienzo" });
  await canvas.click({ position: { x: 240, y: 520 } });
  const properties = page.getByRole("complementary", { name: "Propiedades" });
  await properties.getByRole("button", { name: "Crear con IA: Explicar" }).click();

  const dialog = page.getByRole("dialog", { name: "Copiloto de contenido" });
  const prompt = dialog.getByLabel("¿Qué quieres crear?");
  await expect(dialog).toBeVisible();
  await expect(prompt).toBeFocused();
  await expect(prompt).toHaveValue("Crea una explicación clara y visual sobre ");
});

test("transforms rich text into an accordion and undoes the conversion", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");

  const properties = page.getByRole("complementary", { name: "Propiedades" });
  const transformButton = properties.getByRole("button", { name: "Acordeón", exact: true });
  await expect(transformButton).toBeInViewport();
  await transformButton.click();
  const transformed = page.locator('.widget-window[data-widget-type="accordion"]');
  await expect(transformed).toHaveCount(1);
  await expect(page.locator('.widget-window[data-widget-type="richText"]')).toHaveCount(0);
  await expect(transformed).toContainText("Nuevo bloque de texto");

  await properties.getByRole("button", { name: "Pestañas", exact: true }).click();
  const tabs = page.locator('.widget-window[data-widget-type="tabs"]');
  await expect(tabs).toHaveCount(1);
  await expect(tabs).toContainText("Nuevo bloque de texto");

  await page.getByRole("button", { name: "Deshacer" }).click();
  await expect(page.locator('.widget-window[data-widget-type="accordion"]')).toHaveCount(1);
  await expect(page.locator('.widget-window[data-widget-type="tabs"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Deshacer" }).click();
  await expect(page.locator('.widget-window[data-widget-type="richText"]')).toHaveCount(1);
  await expect(page.locator('.widget-window[data-widget-type="accordion"]')).toHaveCount(0);
});

test("offers process and comparison as visible intents backed by shared engines", async ({
  page,
}) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();

  const canvas = page.getByRole("region", { name: "Contenido del lienzo" });
  await canvas.click({ position: { x: 260, y: 560 } });
  const properties = page.getByRole("complementary", { name: "Propiedades" });
  await properties.getByRole("button", { name: "Comparación", exact: true }).click();
  await expect(page.getByText(/^Colocando Comparación/u)).toBeVisible();
  await canvas.click({ position: { x: 420, y: 320 } });
  await expect(page.getByLabel("2 filas por 3 columnas")).toContainText("Opción A");

  await properties.getByRole("tab", { name: "Herramientas" }).click();
  await properties.getByRole("button", { name: "Proceso paso a paso", exact: true }).click();
  await expect(page.getByText(/^Colocando Proceso paso a paso/u)).toBeVisible();
  await canvas.click({ position: { x: 760, y: 650 } });
  const process = page.locator('.widget-window[data-widget-type="timeline"]');
  await expect(process).toContainText("Preparación");
  await expect(process).toContainText("Paso 1");
});

test("authors and completes an ordering activity without drag-only interaction", async ({
  page,
}) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();

  const canvas = page.getByRole("region", { name: "Contenido del lienzo" });
  await canvas.click({ position: { x: 260, y: 560 } });
  const properties = page.getByRole("complementary", { name: "Propiedades" });
  await properties.getByRole("button", { name: "Ordenar", exact: true }).click();
  await expect(page.getByText(/^Colocando Ordenar/u)).toBeVisible();
  await canvas.click({ position: { x: 520, y: 360 } });

  const activity = page.locator('.widget-window[data-widget-type="sorting"]');
  await expect(activity).toContainText("Ordena el proceso");
  await expect(properties).toHaveAttribute("data-inspector-context", "sorting");
  await properties.getByLabel("Título").fill("Secuencia del experimento");
  await expect(activity).toContainText("Secuencia del experimento");

  if ((page.viewportSize()?.width ?? 1280) <= 820) {
    await properties.getByRole("button", { name: "Cerrar propiedades" }).click();
  }

  await page.getByRole("button", { name: "Estudiar" }).click();
  const studyActivity = page.getByRole("region", { name: "Secuencia del experimento" });
  await studyActivity.getByRole("button", { name: "Subir Preparar los materiales" }).click();
  await studyActivity.getByRole("button", { name: "Subir Preparar los materiales" }).click();
  await studyActivity.getByRole("button", { name: "Subir Realizar el procedimiento" }).click();
  await studyActivity.getByRole("button", { name: "Comprobar actividad" }).click();
  await expect(studyActivity.getByRole("status")).toContainText("¡Actividad completada!");
});

test("places an index and transforms it into a contextual navigation bar", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();

  const canvas = page.getByRole("region", { name: "Contenido del lienzo" });
  await canvas.click({ position: { x: 250, y: 560 } });
  const properties = page.getByRole("complementary", { name: "Propiedades" });
  await properties.getByRole("button", { name: "Menú / índice", exact: true }).click();
  await expect(page.getByText(/^Colocando Menú \/ índice/u)).toBeVisible();
  await canvas.click({ position: { x: 500, y: 360 } });

  const navigation = page.locator('.widget-window[data-widget-type="navigation"]');
  await expect(navigation).toContainText("Contenido");
  await expect(navigation.getByRole("navigation", { name: "Contenido" })).toBeVisible();
  await properties.getByLabel("Título").fill("Temario del libro");
  await expect(navigation).toContainText("Temario del libro");
  await properties.getByLabel("Presentación").selectOption("bar");
  await expect(navigation.getByRole("navigation", { name: "Temario del libro" })).toContainText(
    "Siguiente",
  );
  await properties.getByLabel("Presentación").selectOption("index");

  if ((page.viewportSize()?.width ?? 1280) <= 820) {
    await properties.getByRole("button", { name: "Cerrar propiedades" }).click();
  }
  await page.getByRole("button", { name: "Estudiar" }).click();
  const studyNavigation = page.getByRole("navigation", { name: "Temario del libro" });
  await expect(studyNavigation).toContainText("¿Qué es una célula?");
  await expect(studyNavigation.getByRole("link").first()).toHaveAttribute("href", /#canvas=/u);
});

test("selects a spatial widget and shows its properties", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  const widget = page.locator(".widget-window");
  await expect(widget).toHaveCSS("border-color", "rgb(0, 102, 204)");
  if ((page.viewportSize()?.width ?? 1280) > 820) {
    await page.getByRole("button", { name: /Seleccionar widget/ }).click();
  }
  await expect(page.getByText("AJUSTES DEL WIDGET")).toBeVisible();
  await expect(page.getByText("Texto enriquecido", { exact: true }).last()).toBeVisible();
  await expect(page.locator(".widget-window.selected")).toBeVisible();
});

test("separates widget selection from internal editing", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  const selectionLayer = page.getByRole("button", { name: /Seleccionar widget/ });
  await selectionLayer.click();
  await expect(page.locator(".widget-window.selected")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Contenido del bloque" })).toHaveCount(0);
  await selectionLayer.dblclick();
  const editor = page.getByRole("textbox", { name: "Contenido del bloque" });
  await expect(editor).toBeVisible();
  await expect(editor).toContainText("Nuevo bloque de texto");
  await expect(editor).toContainText("Empieza a desarrollar tu idea.");
  await expect(page.locator(".widget-resize-handle")).toHaveCount(8);
  await expect(page.getByRole("toolbar", { name: "Acciones del widget" })).toHaveCount(0);
  await editor.press("Escape");
  await expect(editor).toHaveCount(0);
  await expect(page.locator(".widget-window.selected")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator('.widget-window[data-selected="true"]')).toHaveCount(0);
});

test("keeps one canonical editor mode and resizes the selection from the keyboard", async ({
  page,
}) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");

  const canvas = page.getByRole("region", { name: "Contenido del lienzo" });
  const widget = page.locator('.widget-window[data-widget-type="richText"]');
  const selectionLayer = widget.getByRole("button", { name: /Seleccionar widget/ });
  await expect(canvas).toHaveAttribute("data-interaction-mode", "canvas");

  await selectionLayer.click();
  await expect(canvas).toHaveAttribute("data-interaction-mode", "selection");
  await expect(canvas).toHaveAttribute("data-active-widget-id", /.+/);
  await expect(widget).toHaveCSS("width", "520px");
  await widget.focus();
  await page.keyboard.press("Alt+ArrowRight");
  await expect(widget).toHaveCSS("width", "521px");
  await page.keyboard.press("Alt+Shift+ArrowDown");
  await expect(widget).toHaveCSS("height", "350px");

  await selectionLayer.dblclick();
  await expect(canvas).toHaveAttribute("data-interaction-mode", "object");
  await expect(widget).toHaveAttribute("data-interaction-state", "object");
  await page.getByRole("textbox", { name: "Contenido del bloque" }).press("Escape");
  await expect(canvas).toHaveAttribute("data-interaction-mode", "selection");

  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  await page.mouse.click(
    (canvasBox?.x ?? 0) + (canvasBox?.width ?? 0) - 12,
    (canvasBox?.y ?? 0) + (canvasBox?.height ?? 0) - 12,
  );
  await expect(canvas).toHaveAttribute("data-interaction-mode", "canvas");
  await expect(widget).toHaveAttribute("data-selected", "false");
});

test("zooms, fits and pans the canvas without losing the active selection", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  if ((page.viewportSize()?.width ?? 1280) > 820) {
    await page.getByRole("button", { name: /Seleccionar widget/ }).click();
  }
  const widget = page.locator('.widget-window[data-widget-type="richText"]');
  const zoom = page.getByRole("group", { name: "Zoom del lienzo" });
  const zoomLevel = zoom.getByLabel("Nivel de zoom");
  await expect(zoomLevel).toHaveText("100%");
  await zoom.getByRole("button", { name: "Alejar lienzo" }).click();
  await expect(zoomLevel).toHaveText("90%");
  await expect(widget).toHaveAttribute("data-selected", "true");

  await page.keyboard.press("Control+-");
  await expect(zoomLevel).toHaveText("80%");
  await page.keyboard.press("Control+0");
  await expect(zoomLevel).toHaveText("90%");
  await expect(widget).toHaveAttribute("data-selected", "true");
  for (let step = 0; step < 11; step += 1) {
    await zoom.getByRole("button", { name: "Acercar lienzo" }).click();
  }
  await expect(zoomLevel).toHaveText("200%");

  const viewport = page.getByRole("region", { name: "Lienzo actual" });
  const verticalMetrics = await viewport.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(verticalMetrics.scrollHeight).toBeGreaterThan(verticalMetrics.clientHeight);
  const viewportBox = await viewport.boundingBox();
  expect(viewportBox).not.toBeNull();
  const startX = (viewportBox?.x ?? 0) + (viewportBox?.width ?? 0) - 40;
  const startY = (viewportBox?.y ?? 0) + (viewportBox?.height ?? 0) - 40;
  await page.keyboard.down("Space");
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 140, startY - 120, { steps: 4 });
  await page.mouse.up();
  await page.keyboard.up("Space");
  await expect.poll(() => viewport.evaluate((element) => element.scrollLeft)).toBeGreaterThan(50);
  const composition = page.getByRole("region", { name: "Contenido del lienzo" });
  await expect
    .poll(async () => {
      const outerTop = await viewport.evaluate((element) => element.scrollTop);
      const innerTop = await composition.evaluate((element) => element.scrollTop);
      return outerTop + innerTop;
    })
    .toBeGreaterThan(50);
});

test("selects widgets with a marquee and applies reversible group actions", async ({ page }) => {
  test.skip((page.viewportSize()?.width ?? 1280) <= 820, "La marquesina es un gesto de escritorio");
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  await insertWidget(page, "Tabla");

  const zoomOut = page.getByRole("button", { name: "Alejar lienzo" });
  for (let step = 0; step < 5; step += 1) await zoomOut.click();
  const canvas = page.getByRole("region", { name: "Contenido del lienzo" });
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move((box?.x ?? 0) + 650, (box?.y ?? 0) + 24);
  await page.mouse.down();
  await page.mouse.move((box?.x ?? 0) + 6, (box?.y ?? 0) + 360, { steps: 5 });
  await page.mouse.up();

  const selected = page.locator('.widget-window[data-selected="true"]');
  await expect(selected).toHaveCount(2);
  const selectionToolbar = page.getByRole("toolbar", { name: "Organizar selección" });
  await expect(selectionToolbar).toBeVisible();
  const moreSelectionActions = selectionToolbar.getByRole("button", {
    name: "Más acciones de la selección",
  });
  await moreSelectionActions.click();
  const selectionMenu = page.getByRole("menu", { name: "Más acciones de la selección" });
  await expect(selectionMenu.getByRole("menuitem", { name: "Duplicar" })).toBeVisible();
  await expect(selectionMenu.getByRole("menuitem", { name: "Eliminar selección" })).toBeVisible();
  await moreSelectionActions.click();
  await selectionToolbar.getByRole("button", { name: "Agrupar" }).click();
  await expect(selectionToolbar.getByRole("button", { name: "Desagrupar" })).toBeVisible();
  const persistedGroupIds = await selected.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-group-id")),
  );
  expect(persistedGroupIds[0]).toBeTruthy();
  expect(new Set(persistedGroupIds).size).toBe(1);
  const originalLeft = await selected
    .nth(0)
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).left));
  const secondOriginalLeft = await selected
    .nth(1)
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).left));
  const selectionLayer = selected.nth(0).locator(".widget-selection-layer");
  const properties = page.getByRole("complementary", { name: "Propiedades" });
  await expect(properties.getByText("PROPIEDADES DEL GRUPO", { exact: true })).toBeVisible();
  await expect(properties.getByRole("button", { name: "Desagrupar" })).toHaveCount(0);
  await expect(properties.getByText("Composición", { exact: true })).toBeVisible();
  await expect(properties.getByText("Elementos", { exact: true })).toBeVisible();
  await expect(properties.getByText("Posición", { exact: true })).toBeVisible();
  await expect(properties.getByText("Tamaño", { exact: true })).toBeVisible();
  await selectionLayer.dispatchEvent("contextmenu", { button: 2 });
  await expect(page.getByRole("menu", { name: "Más acciones de la selección" })).toBeVisible();
  await page
    .getByRole("menu", { name: "Más acciones de la selección" })
    .getByRole("menuitem")
    .first()
    .press("Escape");
  await expect(page.getByRole("menu", { name: "Más acciones de la selección" })).toBeHidden();
  const selectionBox = await selectionLayer.boundingBox();
  expect(selectionBox).not.toBeNull();
  await page.mouse.move((selectionBox?.x ?? 0) + 20, (selectionBox?.y ?? 0) + 20);
  await page.mouse.down();
  await page.mouse.move((selectionBox?.x ?? 0) + 60, (selectionBox?.y ?? 0) + 50, { steps: 4 });
  await page.mouse.up();
  const firstDraggedLeft = await selected
    .nth(0)
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).left));
  const secondDraggedLeft = await selected
    .nth(1)
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).left));
  expect(firstDraggedLeft).toBeGreaterThan(originalLeft);
  expect(secondDraggedLeft - secondOriginalLeft).toBeCloseTo(firstDraggedLeft - originalLeft, 0);
  const originalTops = await selected.evaluateAll((elements) =>
    elements.map((element) => Number.parseFloat(getComputedStyle(element).top)),
  );
  const updatedSelectionBox = await selectionLayer.boundingBox();
  if (!updatedSelectionBox) throw new Error("El grupo no expone un área de arrastre");
  await page.mouse.move(updatedSelectionBox.x + 20, updatedSelectionBox.y + 20);
  await page.mouse.down();
  await page.mouse.move(updatedSelectionBox.x + 20, 1, { steps: 4 });
  await page.mouse.up();
  const clampedTops = await selected.evaluateAll((elements) =>
    elements.map((element) => Number.parseFloat(getComputedStyle(element).top)),
  );
  expect(Math.min(...clampedTops)).toBe(0);
  expect(clampedTops[1] - clampedTops[0]).toBeCloseTo(originalTops[1] - originalTops[0], 5);

  await selectionLayer.dispatchEvent("dblclick");
  await expect(selected).toHaveCount(1);
  await expect(page.getByRole("textbox", { name: "Contenido del bloque" })).toBeVisible();
  await page.getByRole("textbox", { name: "Contenido del bloque" }).press("Escape");
  await expect(selected).toHaveCount(2);

  await selectionToolbar.getByRole("button", { name: "Desagrupar" }).click();
  await expect(selected).toHaveCount(2);
  await expect(selectionToolbar.getByText("2 seleccionados", { exact: true })).toBeVisible();
  await expect(selectionToolbar.getByRole("button", { name: "Agrupar" })).toBeVisible();
  expect(
    await selected.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-group-id")),
    ),
  ).toEqual([null, null]);

  await moreSelectionActions.click();
  await selectionMenu.getByRole("menuitem", { name: "Duplicar" }).click();
  await expect(page.locator(".widget-window")).toHaveCount(4);
  await expect(selected).toHaveCount(2);
  await moreSelectionActions.click();
  await selectionMenu.getByRole("menuitem", { name: "Eliminar selección" }).click();
  await expect(page.locator(".widget-window")).toHaveCount(2);
});

test("duplicates, locks and deletes a widget from its contextual toolbar", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  await page.getByRole("button", { name: /Seleccionar widget/ }).click();

  const toolbar = page.getByRole("toolbar", { name: "Acciones del widget" });
  await expect(toolbar).toBeVisible();
  await toolbar.getByRole("button", { name: "Duplicar widget" }).click();
  await expect(page.locator(".widget-window")).toHaveCount(2);

  await page.getByRole("button", { name: "Bloquear widget" }).click();
  await expect(page.locator('.widget-window.selected[data-locked="true"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Desbloquear widget" })).toBeVisible();

  await page.getByRole("button", { name: "Eliminar widget" }).click();
  await expect(page.locator(".widget-window")).toHaveCount(1);
  await expect(toolbar).toHaveCount(0);
});

test("edits widget content, design and behavior from the inspector tabs", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  if ((page.viewportSize()?.width ?? 1280) > 820) {
    await page.getByRole("button", { name: /Seleccionar widget/ }).click();
  }

  const properties = page.getByRole("complementary", { name: "Propiedades" });
  await expect(properties.getByText("Contenido Markdown")).toHaveCount(0);
  await expect(properties.getByText("Nuevo bloque de texto")).toBeVisible();

  await properties.getByRole("tab", { name: "Apariencia" }).click();
  await properties.getByLabel("Color de fondo").fill("#fff4cc");
  await properties.getByLabel("Borde").selectOption("subtle");
  await properties.getByRole("spinbutton", { name: "Posición X" }).fill("84");
  await expect(page.locator(".widget-window.selected")).toHaveCSS("left", "84px");
  await expect(page.locator(".widget-window.selected .widget-window-content")).toHaveCSS(
    "background-color",
    "rgb(255, 244, 204)",
  );

  await properties.getByRole("tab", { name: "Comportamiento" }).click();
  await properties.getByRole("checkbox", { name: "Bloquear widget" }).check();
  await expect(page.locator('.widget-window.selected[data-locked="true"]')).toBeVisible();
});

test("navigates inspector tabs with arrow keys and exposes complete ARIA relationships", async ({
  page,
}) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  await page.getByRole("button", { name: /Seleccionar widget/ }).click();

  const contentTab = page.getByRole("tab", { name: "Contenido" });
  const designTab = page.getByRole("tab", { name: "Apariencia" });
  await contentTab.focus();
  await contentTab.press("ArrowRight");
  await expect(designTab).toBeFocused();
  await expect(designTab).toHaveAttribute("aria-selected", "true");
  await expect(designTab).toHaveAttribute("aria-controls", "widget-properties-panel-design");
  await expect(page.getByRole("tabpanel", { name: "Apariencia" })).toHaveAttribute(
    "aria-labelledby",
    "widget-properties-tab-design",
  );
});

test("traps focus in the image dialog and closes it with Escape", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await page.getByRole("button", { name: "Insertar widget" }).click();
  await page
    .getByRole("dialog", { name: "Catálogo de widgets" })
    .getByRole("button", { name: /Imagen/ })
    .click();

  const dialog = page.getByRole("dialog", { name: "Añadir una imagen" });
  const close = dialog.getByRole("button", { name: "Cerrar selector" });
  await expect(dialog).toBeVisible();
  await expect(close).toBeFocused();
  await close.press("Shift+Tab");
  await expect(dialog.getByLabel("Texto alternativo")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("offers coherent image and accordion properties in the inspector", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();

  await page.getByRole("button", { name: "Insertar widget" }).click();
  await page
    .getByRole("dialog", { name: "Catálogo de widgets" })
    .getByRole("button", { name: /^Imagen Biblioteca/u })
    .click();
  await expect(page.getByText(/^Colocando .*Clic para situar/u)).toBeVisible();
  await page
    .getByRole("region", { name: "Contenido del lienzo" })
    .click({ position: { x: 420, y: 300 } });
  const picker = page.getByRole("dialog", { name: "Añadir una imagen" });
  await picker.getByLabel("Dirección").fill("https://example.com/celula.png");
  await picker.getByLabel("Texto alternativo").fill("Diagrama de una célula");
  await picker.getByRole("button", { name: "Insertar URL" }).click();

  const properties = page.getByRole("complementary", { name: "Propiedades" });
  await expect(properties.getByRole("button", { name: "Cambiar imagen" })).toBeVisible();
  await properties.getByRole("tab", { name: "Apariencia" }).click();
  const fit = properties.getByRole("combobox", { name: "Ajuste dentro del marco" });
  await fit.selectOption("cover");
  await expect(
    page.locator('.widget-window[data-widget-type="image"] .image-widget'),
  ).toHaveAttribute("data-image-fit", "cover");

  await insertWidget(page, "Acordeón");
  await properties.getByRole("tab", { name: "Comportamiento" }).click();
  const multiple = properties.getByRole("checkbox", {
    name: "Permitir varios apartados abiertos",
  });
  await expect(multiple).not.toBeChecked();
  await multiple.check();
  await expect(multiple).toBeChecked();
  await expect(properties.getByRole("checkbox", { name: "Bloquear widget" })).toBeVisible();
});

test("filters the widget catalog and inserts text commands with slash", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await page.getByRole("button", { name: "Insertar widget" }).click();
  const catalog = page.getByRole("dialog", { name: "Catálogo de widgets" });
  await catalog.getByRole("textbox", { name: "Buscar widgets" }).fill("texto");
  await expect(catalog.getByRole("button")).toHaveCount(1);
  await catalog.getByRole("button").click();

  await page.getByRole("button", { name: /Seleccionar widget/ }).dblclick();
  const editor = page.getByRole("textbox", { name: "Contenido del bloque" });
  await editor.fill("/");
  await page.getByRole("option", { name: "Encabezado" }).click();
  await expect(page.getByRole("heading", { level: 2 }).last()).toBeVisible();
  await expect(page.getByText("##", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Ver código Markdown" }).click();
  await expect(page.getByRole("textbox", { name: "Código Markdown" })).toHaveValue(/^##/);
  await page.getByRole("button", { name: "Volver al texto enriquecido" }).click();
  await expect(page.getByRole("textbox", { name: "Código Markdown" })).toHaveCount(0);
});

test("undoes, redoes and automatically saves canvas changes", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  await expect(page.locator(".widget-window")).toHaveCount(1);

  await page.getByRole("button", { name: "Deshacer" }).click();
  await expect(page.locator(".widget-window")).toHaveCount(0);
  const autoSave = page.waitForRequest(
    (request) => request.url().endsWith("/api/canvases/canvas-1") && request.method() === "PATCH",
  );
  await page.getByRole("button", { name: "Rehacer" }).click();
  await expect(page.locator(".widget-window")).toHaveCount(1);

  await autoSave;
  await expect(page.getByText("Guardado", { exact: true })).toBeVisible();
});

test("moves a widget precisely with the keyboard and exposes eight resize handles", async ({
  page,
}) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  const widget = page.locator(".widget-window");
  await widget.focus();
  await widget.press("ArrowRight");
  await expect(widget).toHaveCSS("left", "37px");
  await widget.press("Shift+ArrowDown");
  await expect(widget).toHaveCSS("top", "130px");
  await expect(widget.locator(".widget-resize-handle")).toHaveCount(8);
});

test("creates a focused text block only after double clicking blank canvas", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  const canvas = page.locator(".composition-editor.spatial");
  await canvas.click({ position: { x: 300, y: 700 } });
  await expect(page.locator(".widget-window")).toHaveCount(0);
  await canvas.dblclick({ position: { x: 300, y: 700 } });

  const editor = page.getByRole("textbox", { name: "Contenido del bloque" });
  await expect(editor).toBeFocused();
  await expect(page.locator(".widget-window.selected")).toHaveCount(1);
});

test("inserts tables in rich text and as an independent canvas widget", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();

  await insertWidget(page, "Texto enriquecido");
  await page.getByRole("button", { name: /Seleccionar widget/ }).dblclick();
  const richText = page.getByRole("textbox", { name: "Contenido del bloque" });
  await richText.fill("Tabla");
  await richText.press("ControlOrMeta+A");
  await page.getByRole("button", { name: "Más opciones" }).click();
  await page.getByRole("button", { name: "Insertar tabla" }).click();
  await expect(page.locator(".rich-text-input table")).toBeVisible();
  const cells = page.locator(".rich-text-input td");
  await cells.nth(0).click();
  await page.keyboard.type("Primera celda");
  await expect(cells.nth(0)).toContainText("Primera celda");
  await expect(cells.nth(1)).not.toContainText("Primera celda");

  await page.getByRole("button", { name: "Insertar widget" }).click();
  const catalog = page.getByRole("dialog", { name: "Catálogo de widgets" });
  await catalog.getByRole("button", { name: /Tabla/ }).click();
  await expect(page.locator(".canvas-table-widget")).toBeVisible();
});

test("moves a widget into a table cell and can return it to the canvas", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  await insertWidget(page, "Tabla");

  const textWidget = page.locator('.widget-window[data-widget-type="richText"]');
  await textWidget
    .getByRole("button", { name: /Seleccionar widget/ })
    .click({ position: { x: 10, y: 100 } });
  await page.getByRole("button", { name: "Colocar widget aquí" }).first().click();

  await expect(page.locator(".widget-window")).toHaveCount(1);
  await expect(page.locator(".contained-widget")).toHaveCount(1);
  await page.getByRole("button", { name: "Sacar al lienzo" }).click();
  await expect(page.locator(".widget-window")).toHaveCount(2);
  await expect(page.locator(".contained-widget")).toHaveCount(0);
});

test("creates and edits a link from the contextual text menu", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  await page.getByRole("button", { name: /Seleccionar widget/ }).dblclick();

  const editor = page.getByRole("textbox", { name: "Contenido del bloque" });
  await editor.fill("Documentación");
  await editor.press("ControlOrMeta+A");
  const contextualMenu = page.getByRole("toolbar", {
    name: "Formato del texto seleccionado",
  });
  await expect(contextualMenu).toBeVisible();
  await expect(contextualMenu).toHaveCSS("position", "fixed");
  expect(await contextualMenu.evaluate((menu) => menu.closest(".widget-window") === null)).toBe(
    true,
  );
  await expect(page.locator(".rich-text-toolbar")).toHaveCount(0);
  await contextualMenu.getByRole("button", { name: "Enlace" }).click();

  const popover = page.getByRole("dialog", { name: "Crear enlace" });
  const url = popover.getByRole("textbox", { name: "URL del enlace" });
  await expect(url).toBeVisible();
  await expect(popover.getByText("Páginas del libro")).toBeVisible();
  await expect(popover.getByRole("option", { name: "¿Qué es una célula?" })).toBeVisible();
  await url.pressSequentially("example.com/docs");
  await expect(url).toBeFocused();
  await popover.getByRole("button", { name: "Aplicar enlace" }).click();

  const visibleLink = page.locator(".rich-text-input a", { hasText: "Documentación" });
  await expect(visibleLink).toHaveAttribute("href", "https://example.com/docs");
  await expect(visibleLink).toHaveCSS("text-decoration-line", "underline");
  await visibleLink.click();
  await expect(visibleLink).toHaveAttribute("data-link-active", "true");
  await expect(page.getByRole("textbox", { name: "URL del enlace" })).toHaveValue(
    "https://example.com/docs",
  );
  await page.getByRole("button", { name: "Quitar enlace" }).click();
  await expect(page.locator(".rich-text-input a")).toHaveCount(0);
  await expect(editor).toHaveText("Documentación");
});

test("does not reuse the previous link when another word is selected", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  await page.getByRole("button", { name: /Seleccionar widget/ }).dblclick();

  const editor = page.getByRole("textbox", { name: "Contenido del bloque" });
  await editor.fill("Primero Segundo");
  await editor.evaluate((element) => {
    const text = element.firstElementChild?.firstChild;
    if (!text) throw new Error("No se encontró el texto editable");
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 7);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });
  await page.getByRole("button", { name: "Enlace" }).click();
  await page.getByRole("textbox", { name: "URL del enlace" }).fill("example.com");
  await page.getByRole("button", { name: "Aplicar enlace" }).click();

  await editor.evaluate((element) => {
    const paragraph = element.firstElementChild;
    const text = paragraph?.lastChild;
    if (!text) throw new Error("No se encontró la segunda palabra");
    const range = document.createRange();
    range.setStart(text, 1);
    range.setEnd(text, 8);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });

  await expect(page.getByRole("dialog", { name: "Crear enlace" })).toHaveCount(0);
  await page.getByRole("button", { name: "Enlace" }).click();
  await expect(page.getByRole("textbox", { name: "URL del enlace" })).toHaveValue("");
  await expect(page.getByRole("button", { name: "Quitar enlace" })).toHaveCount(0);
});

test("returns focus to the link control when its popover closes with Escape", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  await page.getByRole("button", { name: /Seleccionar widget/ }).dblclick();

  const editor = page.getByRole("textbox", { name: "Contenido del bloque" });
  await editor.fill("Enlace accesible");
  await editor.press("ControlOrMeta+A");
  const linkButton = page.getByRole("button", { name: "Enlace" });
  await linkButton.click();
  await expect(page.getByRole("textbox", { name: "URL del enlace" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Crear enlace" })).toHaveCount(0);
  await expect(linkButton).toBeFocused();
});

test("navigates tree menus with arrows and returns focus with Escape", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();

  const trigger = page.getByRole("button", { name: "Opciones de ¿Qué es una célula?" });
  await trigger.click();
  const menu = page.getByRole("menu", { name: "Opciones de ¿Qué es una célula?" });
  await expect(menu.getByRole("menuitem", { name: "Renombrar" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "Nuevo lienzo dentro" })).toBeFocused();
  await page.keyboard.press("End");
  await expect(menu.getByRole("menuitem", { name: "Eliminar" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("discards a provisional text block when the user leaves it empty", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await page.locator(".composition-editor.spatial").click({ position: { x: 300, y: 700 } });

  await expect(page.locator(".widget-window")).toHaveCount(1);
  await page.locator(".canvas-toolbar").click();
  await expect(page.locator(".widget-window")).toHaveCount(0);
});

test("adds and removes widgets from a multiple selection with Shift click", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  await insertWidget(page, "Tabla");

  const selectionLayers = page.getByRole("button", {
    name: "Seleccionar widget; doble clic para editar",
  });
  await selectionLayers.nth(0).dispatchEvent("pointerdown", { button: 0 });
  await selectionLayers.nth(1).dispatchEvent("click", { shiftKey: true });

  await expect(page.locator('.widget-window[data-selected="true"]')).toHaveCount(2);
  await expect(page.locator(".widget-window.selected")).toHaveCount(0);
  const groupBox = page.getByTestId("multi-selection-box");
  await expect(groupBox).toBeVisible();
  const [groupBounds, firstBounds, secondBounds, toolbarBounds] = await Promise.all([
    groupBox.boundingBox(),
    page.locator('.widget-window[data-selected="true"]').nth(0).boundingBox(),
    page.locator('.widget-window[data-selected="true"]').nth(1).boundingBox(),
    page.getByRole("toolbar", { name: "Organizar selección" }).boundingBox(),
  ]);
  if (!groupBounds || !firstBounds || !secondBounds || !toolbarBounds) {
    throw new Error("La selección múltiple no produjo geometría visible");
  }
  expect(groupBounds.x).toBeLessThanOrEqual(firstBounds.x + 1);
  expect(groupBounds.x).toBeLessThanOrEqual(secondBounds.x + 1);
  expect(groupBounds.x + groupBounds.width).toBeGreaterThanOrEqual(
    secondBounds.x + secondBounds.width - 1,
  );
  expect(toolbarBounds.x).toBeGreaterThanOrEqual(groupBounds.x - 2);
  expect(toolbarBounds.x + toolbarBounds.width).toBeLessThanOrEqual(
    groupBounds.x + groupBounds.width + 2,
  );
  await selectionLayers.nth(0).dispatchEvent("click", { shiftKey: true });
  await expect(page.locator('.widget-window[data-selected="true"]')).toHaveCount(1);
  await expect(page.locator(".widget-window").nth(1)).toHaveAttribute("data-selected", "true");
  await selectionLayers.nth(0).dispatchEvent("click", { shiftKey: true });
  await expect(page.locator('.widget-window[data-selected="true"]')).toHaveCount(2);
  await expect(page.locator(".widget-resize-handle")).toHaveCount(0);
  await expect(page.getByRole("toolbar", { name: "Acciones del widget" })).toHaveCount(0);
  const selectedWindows = page.locator('.widget-window[data-selected="true"]');
  const originalLefts = await page
    .locator(".widget-window")
    .evaluateAll((elements) => elements.map((element) => getComputedStyle(element).left));
  await page.getByRole("button", { name: "Más acciones de la selección" }).click();
  await page.getByRole("menuitem", { name: "Izquierda" }).click();
  const alignedLefts = await selectedWindows.evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).left),
  );
  expect(alignedLefts[0]).toBe(alignedLefts[1]);
  if ((page.viewportSize()?.width ?? 1024) < 700) {
    await page.getByRole("button", { name: "Cerrar propiedades" }).click();
  }
  await page.getByRole("button", { name: "Deshacer" }).click();
  await expect
    .poll(() =>
      page
        .locator(".widget-window")
        .evaluateAll((elements) => elements.map((element) => getComputedStyle(element).left)),
    )
    .toEqual(originalLefts);

  await selectionLayers.nth(0).dispatchEvent("click", { shiftKey: true });
  await expect(page.locator('.widget-window[data-selected="true"]')).toHaveCount(1);
});

test("makes one widget exclusive before entering its internal editor", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  await insertWidget(page, "Tabla");

  const textWidget = page.locator('.widget-window[data-widget-type="richText"]');
  const tableWidget = page.locator('.widget-window[data-widget-type="table"]');
  const textSelection = textWidget.getByRole("button", { name: /Seleccionar widget/ });
  const tableSelection = tableWidget.getByRole("button", { name: /Seleccionar widget/ });
  await textSelection.click();
  await tableSelection.click({ modifiers: ["Shift"] });
  await expect(page.locator('.widget-window[data-selected="true"]')).toHaveCount(2);
  await expect(page.locator(".widget-resize-handle")).toHaveCount(0);

  await textSelection.dblclick();
  await expect(page.locator('.widget-window[data-selected="true"]')).toHaveCount(1);
  await expect(textWidget).toHaveAttribute("data-selected", "true");
  await expect(tableWidget).toHaveAttribute("data-selected", "false");
  await expect(textWidget).toHaveAttribute("data-interaction-state", "object");
  await expect(textWidget.getByRole("textbox", { name: "Contenido del bloque" })).toBeVisible();
  await expect(textWidget.locator(".widget-resize-handle")).toHaveCount(8);
});

test("grows a rich text widget with its content until it is manually resized", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  await page.getByRole("button", { name: /Seleccionar widget/ }).dblclick();

  const widget = page.locator('.widget-window[data-widget-type="richText"]');
  const editor = page.getByRole("textbox", { name: "Contenido del bloque" });
  await editor.evaluate((element) => {
    element.innerHTML = Array.from({ length: 24 }, (_, index) => `<p>Línea ${index + 1}</p>`).join(
      "",
    );
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
  });

  await expect(widget).toHaveAttribute("data-height-mode", "auto");
  await expect.poll(async () => (await widget.boundingBox())?.height ?? 0).toBeGreaterThan(340);
  await expect(widget.locator(".widget-window-content")).toHaveCSS("overflow-y", "visible");

  await page.getByRole("tab", { name: "Apariencia" }).click();
  await page.getByRole("spinbutton", { name: "Alto" }).fill("260");
  await expect(widget).toHaveAttribute("data-height-mode", "fixed");
  await expect.poll(async () => Math.round((await widget.boundingBox())?.height ?? 0)).toBe(260);

  await editor.evaluate((element) => {
    element.innerHTML += Array.from({ length: 12 }, (_, index) => `<p>Extra ${index + 1}</p>`).join(
      "",
    );
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
  });
  await expect.poll(async () => Math.round((await widget.boundingBox())?.height ?? 0)).toBe(260);
  await expect(widget.locator(".widget-window-content")).toHaveCSS("overflow-y", "auto");
});

test("inserts an image inside a rich text widget", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  await page.getByRole("button", { name: /Seleccionar widget/ }).dblclick();

  const editor = page.getByRole("textbox", { name: "Contenido del bloque" });
  await editor.fill("/imagen");
  await page.getByRole("option", { name: "Imagen" }).click();

  const picker = page.getByRole("dialog", { name: "Añadir una imagen" });
  const widget = page.locator('.widget-window[data-widget-type="richText"]');
  const canvas = page.getByRole("region", { name: "Contenido del lienzo" });
  await expect(widget).toHaveAttribute("data-interaction-state", "tool");
  await expect(canvas).toHaveAttribute("data-interaction-mode", "tool");
  await expect(page.getByRole("toolbar", { name: "Acciones del widget" })).toHaveCount(0);
  await expect(widget.locator(".widget-resize-handle")).toHaveCount(0);
  expect(await picker.evaluate((dialog) => dialog.closest(".widget-window") === null)).toBe(true);
  await picker.getByLabel("Dirección").fill("https://example.com/celula.jpg");
  await picker.getByLabel("Texto alternativo").fill("Esquema de una célula");
  await picker.getByRole("button", { name: "Insertar URL" }).click();

  const inlineImage = editor.locator("img");
  await expect(inlineImage).toHaveAttribute("src", "https://example.com/celula.jpg");
  await expect(inlineImage).toHaveAttribute("alt", "Esquema de una célula");
  await expect(widget).toHaveAttribute("data-height-mode", "auto");
  await expect(widget).toHaveAttribute("data-interaction-state", "object");

  await inlineImage.click();
  const elementMenu = page.getByRole("toolbar", { name: "Formato del texto seleccionado" });
  await expect(elementMenu).toBeVisible();
  await expect(elementMenu.getByText("Imagen", { exact: true })).toBeVisible();
  await expect(widget).toHaveAttribute("data-interaction-state", "tool");
});

test("edits an embedded image as a first-class element inside content", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  await page.getByRole("button", { name: /Seleccionar widget/ }).dblclick();

  const widget = page.locator('.widget-window[data-widget-type="richText"]');
  const editor = page.getByRole("textbox", { name: "Contenido del bloque" });
  await editor.fill("/imagen");
  await page.getByRole("option", { name: "Imagen" }).click();
  const picker = page.getByRole("dialog", { name: "Añadir una imagen" });
  await picker.getByLabel("Dirección").fill("https://example.com/interna.jpg");
  await picker.getByLabel("Texto alternativo").fill("Imagen interna");
  await picker.getByRole("button", { name: "Insertar URL" }).click();

  const image = editor.locator("img");
  await image.click();
  const internalSelection = page.getByLabel("Imagen seleccionada dentro del contenido");
  await expect(internalSelection).toBeVisible();
  await expect(internalSelection.locator(".embedded-image-resize-handle")).toHaveCount(4);
  await expect(widget.locator(".widget-resize-handle")).toHaveCount(0);
  await expect(page.getByText("ELEMENTO DENTRO DEL CONTENIDO")).toBeVisible();

  const altInput = page.getByLabel("Texto alternativo");
  await altInput.fill("Descripción actualizada");
  await expect(image).toHaveAttribute("alt", "Descripción actualizada");

  await page.getByRole("tab", { name: "Apariencia" }).click();
  const widthInput = page.getByLabel("Ancho de imagen interna");
  await widthInput.fill("320");
  await expect(image).toHaveCSS("width", "320px");

  await image.click();
  const southeast = page.getByRole("button", {
    name: "Redimensionar imagen interna se",
    exact: true,
  });
  const handleBox = await southeast.boundingBox();
  expect(handleBox).not.toBeNull();
  const startX = (handleBox?.x ?? 0) + (handleBox?.width ?? 0) / 2;
  const startY = (handleBox?.y ?? 0) + (handleBox?.height ?? 0) / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 60, startY + 30, { steps: 3 });
  await page.mouse.up();
  const resizedWidth = (await image.boundingBox())?.width ?? 0;
  expect(resizedWidth).toBeGreaterThan(360);
  await image.evaluate((element) => {
    element.setAttribute("src", "/api/resources/resource-1/content");
    element.setAttribute("data-resource-id", "resource-1");
    element.dispatchEvent(new InputEvent("input", { bubbles: true }));
  });

  await editor.press("Escape");
  await expect(page.getByRole("toolbar", { name: "Formato del texto seleccionado" })).toHaveCount(
    0,
  );
  await editor.press("Escape");
  await expect(internalSelection).toHaveCount(0);
  await expect(widget.locator(".widget-resize-handle")).toHaveCount(8);
  await editor.press("Escape");
  await expect(editor).toHaveCount(0);
  await expect(widget.locator(".rich-text-preview img")).toHaveAttribute(
    "alt",
    "Descripción actualizada",
  );
  await expect(widget.locator(".rich-text-preview img")).toHaveAttribute(
    "src",
    "/api/resources/resource-1/content",
  );
  const previewWidth = (await widget.locator(".rich-text-preview img").boundingBox())?.width ?? 0;
  expect(Math.abs(previewWidth - resizedWidth)).toBeLessThanOrEqual(1);
});

test("pastes a clipboard image into rich text and stores it as a Drive resource", async ({
  page,
}) => {
  await mockAuthenticatedApi(page);
  let uploadedContentType = "";
  await page.route("**/api/resources", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fulfill({ json: { data: [] } });
      return;
    }
    uploadedContentType = route.request().headers()["content-type"] ?? "";
    await route.fulfill({
      json: {
        data: {
          id: "resource-pasted",
          name: "captura.jpg",
          mimeType: "image/jpeg",
          width: 1,
          height: 1,
          sizeBytes: 128,
          url: "/api/resources/resource-pasted/content",
          createdAt: now,
        },
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  await page.getByRole("button", { name: /Seleccionar widget/ }).dblclick();

  const editor = page.getByRole("textbox", { name: "Contenido del bloque" });
  await editor.click();
  await editor.evaluate((element) => {
    const bytes = Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z3ZsAAAAASUVORK5CYII=",
      ),
      (character) => character.charCodeAt(0),
    );
    const transfer = new DataTransfer();
    transfer.items.add(new File([bytes], "captura.png", { type: "image/png" }));
    element.dispatchEvent(
      new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: transfer }),
    );
  });

  await expect(editor.locator('img[data-resource-id="resource-pasted"]')).toHaveAttribute(
    "src",
    "/api/resources/resource-pasted/content",
  );
  await expect(page.getByText(/Guardando la imagen en Google Drive/)).toHaveCount(0);
  expect(uploadedContentType).toBe("image/jpeg");
});

test("opens the internal editing menu with right click", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  await page.getByRole("button", { name: /Seleccionar widget/ }).dblclick();

  const editor = page.getByRole("textbox", { name: "Contenido del bloque" });
  await editor.fill("Texto para editar");
  const editorBox = await editor.boundingBox();
  expect(editorBox).not.toBeNull();
  await editor.click({ button: "right", position: { x: 45, y: 24 } });

  const menu = page.getByRole("toolbar", { name: "Formato del texto seleccionado" });
  await expect(menu).toBeVisible();
  const menuBox = await menu.boundingBox();
  expect(menuBox).not.toBeNull();
  const clickY = (editorBox?.y ?? 0) + 24;
  const distanceToMenuEdge = Math.min(
    Math.abs((menuBox?.y ?? 0) - clickY),
    Math.abs((menuBox?.y ?? 0) + (menuBox?.height ?? 0) - clickY),
  );
  expect(distanceToMenuEdge).toBeLessThanOrEqual(8);
  const widget = page.locator('.widget-window[data-widget-type="richText"]');
  await expect(widget).toHaveAttribute("data-interaction-state", "tool");
  await expect(widget.locator(".widget-resize-handle")).toHaveCount(0);

  await editor.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(widget).toHaveAttribute("data-interaction-state", "object");
  await expect(widget.locator(".widget-resize-handle")).toHaveCount(8);

  await editor.press("Escape");
  await expect(editor).toHaveCount(0);
  await page.getByRole("button", { name: /Seleccionar widget/ }).dblclick();
  await expect(widget).toHaveAttribute("data-interaction-state", "object");
  await expect(widget.locator(".widget-resize-handle")).toHaveCount(8);
});

test("resizes a widget from all eight handles while editing", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  await page.getByRole("button", { name: /Seleccionar widget/ }).dblclick();

  const widget = page.locator('.widget-window[data-widget-type="richText"]');
  await expect(widget.locator(".widget-resize-handle")).toHaveCount(8);

  const cases = [
    { direction: "n", dx: 0, dy: -8, edges: ["top", "height"] },
    { direction: "ne", dx: 8, dy: -8, edges: ["top", "width", "height"] },
    { direction: "e", dx: 8, dy: 0, edges: ["width"] },
    { direction: "se", dx: 8, dy: 8, edges: ["width", "height"] },
    { direction: "s", dx: 0, dy: 8, edges: ["height"] },
    { direction: "sw", dx: -8, dy: 8, edges: ["left", "width", "height"] },
    { direction: "w", dx: -8, dy: 0, edges: ["left", "width"] },
    { direction: "nw", dx: -8, dy: -8, edges: ["left", "top", "width", "height"] },
  ] as const;

  for (const resizeCase of cases) {
    const before = await widget.boundingBox();
    const handle = widget.getByRole("button", {
      name: `Redimensionar widget ${resizeCase.direction}`,
      exact: true,
    });
    const handleBox = await handle.boundingBox();
    expect(before).not.toBeNull();
    expect(handleBox).not.toBeNull();

    const startX = (handleBox?.x ?? 0) + (handleBox?.width ?? 0) / 2;
    const startY = (handleBox?.y ?? 0) + (handleBox?.height ?? 0) / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + resizeCase.dx, startY + resizeCase.dy, { steps: 3 });
    await page.mouse.up();

    const after = await widget.boundingBox();
    expect(after).not.toBeNull();
    for (const edge of resizeCase.edges) {
      if (edge === "left") expect(after?.x).toBeLessThan(before?.x ?? 0);
      if (edge === "top") expect(after?.y).toBeLessThan(before?.y ?? 0);
      if (edge === "width") expect(after?.width).toBeGreaterThan(before?.width ?? 0);
      if (edge === "height") expect(after?.height).toBeGreaterThan(before?.height ?? 0);
    }
  }
});

test("keeps resizing captured outside the widget and commits it as one operation", async ({
  page,
}) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  await page.getByRole("button", { name: /Seleccionar widget/ }).dblclick();

  const widget = page.locator('.widget-window[data-widget-type="richText"]');
  const before = await widget.boundingBox();
  const eastHandle = widget.getByRole("button", {
    name: "Redimensionar widget e",
    exact: true,
  });
  const handleBox = await eastHandle.boundingBox();
  expect(before).not.toBeNull();
  expect(handleBox?.width).toBe(24);
  expect(handleBox?.height).toBe(24);

  const startX = (handleBox?.x ?? 0) + (handleBox?.width ?? 0) / 2;
  const startY = (handleBox?.y ?? 0) + (handleBox?.height ?? 0) / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 120, startY + 40, { steps: 2 });
  await page.mouse.move(startX + 260, startY + 90, { steps: 2 });
  await page.mouse.up();

  const after = await widget.boundingBox();
  expect(after?.width).toBeGreaterThan((before?.width ?? 0) + 240);
  await expect(widget.locator(".widget-resize-handle")).toHaveCount(8);

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Deshacer" }).click();
  const restored = await widget.boundingBox();
  expect(Math.abs((restored?.width ?? 0) - (before?.width ?? 0))).toBeLessThanOrEqual(1);
});

test("removes the text widget outline when clicking outside the widget", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  await page.getByRole("button", { name: /Seleccionar widget/ }).click();
  await expect(page.locator(".widget-window.selected")).toHaveCount(1);

  await page.locator(".canvas-toolbar").click();
  await expect(page.locator(".widget-window.selected")).toHaveCount(0);
});

test("uses the complete workspace as a borderless editing canvas", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  const scroll = page.locator(".canvas-scroll");
  const canvas = page.locator(".canvas-document.edit");
  const [scrollBox, canvasBox] = await Promise.all([scroll.boundingBox(), canvas.boundingBox()]);
  expect(scrollBox).not.toBeNull();
  expect(canvasBox).not.toBeNull();
  expect(Math.abs((scrollBox?.width ?? 0) - (canvasBox?.width ?? 0))).toBeLessThan(2);
  await expect(canvas.locator(".document-header")).toBeHidden();
  await expect(canvas).toHaveCSS("box-shadow", "none");
});

test("activates an empty canvas with a double click over its empty-state message", async ({
  page,
}) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  const emptyState = page.locator(".empty-canvas-copy");
  const box = await emptyState.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.dblclick((box?.x ?? 0) + 20, (box?.y ?? 0) + 20);
  await expect(page.getByRole("textbox", { name: "Contenido del bloque" })).toBeFocused();
  await expect(page.locator(".widget-window")).toHaveCount(1);
});

test("does not create another widget while leaving internal editing", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  const canvas = page.locator(".composition-editor.spatial");
  await canvas.dblclick({ position: { x: 180, y: 260 } });
  await page.getByRole("textbox", { name: "Contenido del bloque" }).fill("Contenido conservado");
  await canvas.dblclick({ position: { x: 720, y: 650 } });

  await expect(page.locator(".widget-window")).toHaveCount(1);
  await expect(page.locator('.widget-window[data-editing="true"]')).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Contenido del bloque" })).toHaveCount(0);
});

test("keeps text selection inside the active widget when the pointer leaves it", async ({
  page,
}) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  await page.getByRole("button", { name: /Seleccionar widget/ }).dblclick();
  const editor = page.getByRole("textbox", { name: "Contenido del bloque" });
  await editor.fill("Primer párrafo para cambiar de letra");
  await editor.evaluate((element) => {
    const text = element.firstElementChild?.firstChild;
    if (!text) throw new Error("No se encontró texto editable");
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 14);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });

  await page.locator(".composition-editor.spatial").click({ position: { x: 1050, y: 760 } });
  await expect(page.getByRole("textbox", { name: "Contenido del bloque" })).toHaveCount(1);
  await expect(page.locator(".widget-window")).toHaveCount(1);
  await expect
    .poll(() => page.evaluate(() => window.getSelection()?.toString()))
    .toBe("Primer párrafo");
});

test("ignores other widgets until internal editing has ended", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  await insertWidget(page, "Texto enriquecido");
  const widgets = page.locator(".widget-window");
  await widgets
    .nth(0)
    .getByRole("button", { name: /Seleccionar widget/ })
    .dblclick();

  await expect(page.locator(".composition-editor.spatial")).toHaveAttribute(
    "data-internal-editing",
    "true",
  );
  await expect(widgets.nth(1)).toHaveCSS("pointer-events", "none");
  await widgets.nth(1).hover({ force: true });
  await expect(widgets.nth(1)).toHaveCSS("border-color", "rgba(0, 0, 0, 0)");

  const secondBox = await widgets.nth(1).boundingBox();
  expect(secondBox).not.toBeNull();
  await page.mouse.click((secondBox?.x ?? 0) + 30, (secondBox?.y ?? 0) + 30);
  await expect(page.getByRole("textbox", { name: "Contenido del bloque" })).toHaveCount(0);
  await expect(widgets.nth(1)).toHaveCSS("pointer-events", "auto");
  await expect(widgets.nth(1)).not.toHaveAttribute("data-selected", "true");
});

test("deletes a selected widget with Delete and restores it with undo", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  const selector = page.getByRole("button", { name: /Seleccionar widget/ });
  await selector.click();
  await selector.press("Delete");
  await expect(page.locator(".widget-window")).toHaveCount(0);

  await page.getByRole("button", { name: "Deshacer" }).click();
  await expect(page.locator(".widget-window")).toHaveCount(1);
  await page.getByRole("button", { name: "Rehacer" }).click();
  await expect(page.locator(".widget-window")).toHaveCount(0);
});

test("does not leave the project when double-clicking the editing canvas", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await page.locator(".composition-editor.spatial").dblclick({ position: { x: 650, y: 620 } });
  await expect(page.getByRole("heading", { name: "KnowCanvas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tus libros" })).toHaveCount(0);
  await expect(page.locator(".widget-window")).toHaveCount(1);
  await page.getByRole("button", { name: "¿Qué es una célula?", exact: true }).dblclick();
  await expect(page.getByRole("heading", { name: "Tus libros" })).toHaveCount(0);
});

test("cannot navigate to the library while writing inside a widget", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();
  await insertWidget(page, "Texto enriquecido");
  await page.getByRole("button", { name: /Seleccionar widget/ }).dblclick();
  const editor = page.getByRole("textbox", { name: "Contenido del bloque" });
  await editor.fill("Estoy redactando dentro del contenido");
  await editor.dblclick({ position: { x: 80, y: 30 } });
  await page.keyboard.type("Texto estable");

  await page.getByRole("button", { name: "Volver a la biblioteca" }).click();
  await expect(page.getByRole("heading", { name: "Tus libros" })).toHaveCount(0);
  await expect(editor).toBeVisible();

  await editor.press("Escape");
  await page.getByRole("button", { name: "Volver a la biblioteca" }).click();
  await expect(page.getByRole("heading", { name: "Tus libros" })).toBeVisible();
});

test("manages project tree nodes from their contextual menu", async ({ page }) => {
  await mockAuthenticatedApi(page);
  await page.route("**/api/projects/project-1/nodes", (route) =>
    route.fulfill({
      json: {
        data: {
          projectRevision: 2,
          node: {
            id: "new-node",
            projectId: "project-1",
            parentId: "folder-1",
            kind: "canvas",
            title: "Nuevo lienzo",
            position: 1,
            canvasId: "new-canvas",
            createdAt: now,
            updatedAt: now,
          },
        },
      },
    }),
  );
  await page.route("**/api/nodes/folder-1", (route) =>
    route.fulfill({ json: { data: { projectRevision: 2 } } }),
  );
  await page.route("**/api/nodes/node-1/move", (route) =>
    route.fulfill({ json: { data: { projectRevision: 2, nodes: detail.nodes } } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Explorando la célula/ }).click();

  await expect(page.getByRole("button", { name: "Nueva página", exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Crear carpeta dentro de ¿Qué es una célula?" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "¿Qué es una célula?", exact: true }).click({
    button: "right",
  });
  await expect(page.getByRole("menuitem", { name: "Nuevo lienzo dentro" })).toBeVisible();
  await page.locator(".canvas-toolbar").click();
  await expect(page.getByRole("menuitem", { name: "Nuevo lienzo dentro" })).toBeHidden();

  await page.getByRole("button", { name: "Introducción", exact: true }).click({ button: "right" });
  await page.locator(".canvas-toolbar").click();
  const toolbarCreateRequest = page.waitForRequest("**/api/projects/project-1/nodes");
  await page.getByRole("button", { name: "Nueva página", exact: true }).click();
  expect((await toolbarCreateRequest).postDataJSON()).toMatchObject({
    parentId: "folder-1",
    kind: "canvas",
  });

  const pageNode = page.getByRole("button", { name: "¿Qué es una célula?", exact: true });
  await pageNode.click();
  await pageNode.press("Delete");
  const deleteDialog = page.getByRole("dialog", { name: "¿Eliminar “¿Qué es una célula?”?" });
  await expect(deleteDialog).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(deleteDialog).toHaveCount(0);

  await page.getByRole("button", { name: "Opciones de ¿Qué es una célula?" }).click();
  await page.getByRole("menuitem", { name: "Eliminar…" }).click();
  const deleteRequest = page.waitForRequest("**/api/nodes/node-1");
  await deleteDialog.getByRole("button", { name: "Eliminar página" }).click();
  expect((await deleteRequest).method()).toBe("DELETE");

  await page.getByRole("button", { name: "Opciones de ¿Qué es una célula?" }).click();
  const moveRequest = page.waitForRequest("**/api/nodes/node-1/move");
  await page.getByRole("menuitem", { name: "Mover a la raíz" }).click();
  expect((await moveRequest).postDataJSON()).toMatchObject({ parentId: null });

  await page.getByRole("button", { name: "Opciones de Introducción" }).click();
  const createRequest = page.waitForRequest("**/api/projects/project-1/nodes");
  await page.getByRole("menuitem", { name: "Nuevo lienzo dentro" }).click();
  const created = await createRequest;
  expect(created.postDataJSON()).toMatchObject({ parentId: "folder-1", kind: "canvas" });

  await page.getByRole("button", { name: "Opciones de Introducción" }).click();
  await page.getByRole("menuitem", { name: "Renombrar" }).click();
  const renameRequest = page.waitForRequest("**/api/nodes/folder-1");
  const rename = page.locator(".tree-rename-input");
  await rename.fill("Capítulo inicial");
  await rename.press("Enter");
  expect((await renameRequest).method()).toBe("PATCH");

  await page.getByRole("button", { name: "Introducción", exact: true }).click();
  await expect(page.getByRole("button", { name: /¿Qué es una célula?/ })).toBeHidden();
});
