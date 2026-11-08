import { canvasCompositionV2Schema } from "./canvas-composition";
import { markdownToDocument } from "./rich-text";
import type { CanvasComposition } from "../shared/contracts";

export const DEMO_SEED_VERSION = 2;
export const KNOWCANVAS_DEMO_SEED_VERSION = 1;

export type DemoPage = {
  key: string;
  title: string;
  description: string;
  canvasId: string;
  composition: CanvasComposition;
};

const frame = (x: number, y: number, width: number, height: number, z: number) => ({
  x,
  y,
  width,
  height,
  z,
  heightMode: "auto" as const,
});

function objectBase(id: string, order: number) {
  return { id, parentId: null, slotId: null, order };
}

export function buildDemoBookPages(projectId: string): DemoPage[] {
  const canvasId = (key: string) => `${projectId}:demo:${key}:canvas`;
  const page1 = canvasId("vida");
  const page2 = canvasId("anatomia");
  const page3 = canvasId("red");
  const page4 = canvasId("comparar");
  const page5 = canvasId("reto");

  const pages: DemoPage[] = [
    {
      key: "vida",
      title: "1. La unidad de la vida",
      description: "Una introducción a la célula como sistema vivo.",
      canvasId: page1,
      composition: canvasCompositionV2Schema.parse({
        version: 2,
        rootIds: ["vida-texto", "vida-continuar"],
        objects: {
          "vida-texto": {
            ...objectBase("vida-texto", 0),
            type: "richText",
            schemaVersion: 2,
            data: {
              document: markdownToDocument(`## La célula: pequeña, pero completa

Todo ser vivo está formado por células. Algunas criaturas tienen una sola; nuestro cuerpo reúne billones que cooperan. Aunque no podamos verla a simple vista, cada célula **intercambia materia**, obtiene energía, responde al entorno y conserva información.

### Tres ideas para orientarnos

- La célula es la unidad mínima capaz de realizar las funciones de la vida.
- Su membrana separa un interior organizado del entorno.
- Su actividad depende de partes especializadas que trabajan como un sistema.

> Comprender una célula no consiste en memorizar nombres, sino en explicar cómo sus procesos se coordinan.

En las páginas siguientes abriremos esta “ciudad microscópica”, seguiremos el camino de la energía y compararemos distintos tipos celulares.`),
            },
            frame: frame(120, 90, 820, 620, 0),
          },
          "vida-continuar": {
            ...objectBase("vida-continuar", 1),
            type: "navigation",
            schemaVersion: 1,
            data: {
              label: "Abrir la célula",
              destination: { kind: "canvas", canvasId: page2 },
              style: "primary",
              openInNewTab: false,
            },
            frame: frame(120, 750, 320, 160, 1),
          },
        },
      }),
    },
    {
      key: "anatomia",
      title: "2. Anatomía de una célula",
      description: "Una imagen guiada de las estructuras esenciales.",
      canvasId: page2,
      composition: canvasCompositionV2Schema.parse({
        version: 2,
        rootIds: ["anatomia-imagen", "anatomia-texto"],
        objects: {
          "anatomia-imagen": {
            ...objectBase("anatomia-imagen", 0),
            type: "image",
            schemaVersion: 1,
            data: {
              resourceId: null,
              url: "/examples/cell-structure.svg",
              alt: "Esquema de una célula animal con núcleo, mitocondrias y membrana",
              caption:
                "Una célula animal simplificada: las formas ayudan a localizar cada función.",
            },
            frame: frame(90, 90, 580, 520, 0),
          },
          "anatomia-texto": {
            ...objectBase("anatomia-texto", 1),
            type: "richText",
            schemaVersion: 2,
            data: {
              document: markdownToDocument(`## Un interior organizado

La **membrana plasmática** decide qué sustancias atraviesan el límite celular. Dentro, el **citoplasma** ofrece el medio donde ocurren numerosas reacciones. El **núcleo** protege el ADN y coordina qué instrucciones se utilizan.

Las **mitocondrias** liberan energía aprovechable a partir de nutrientes. Los **ribosomas** ensamblan proteínas, y otras membranas internas transportan o transforman materiales.

Ninguna pieza trabaja aislada: si cambia la entrada de nutrientes, también cambian la producción de energía y la fabricación de moléculas.`),
            },
            frame: frame(710, 90, 520, 660, 1),
          },
        },
      }),
    },
    {
      key: "red",
      title: "3. Una red de procesos",
      description: "Del nutriente a la energía y a la construcción celular.",
      canvasId: page3,
      composition: canvasCompositionV2Schema.parse({
        version: 2,
        rootIds: ["red-texto", "red-diagrama"],
        objects: {
          "red-texto": {
            ...objectBase("red-texto", 0),
            type: "richText",
            schemaVersion: 2,
            data: {
              document: markdownToDocument(`## La vida ocurre como una secuencia conectada

Los nutrientes atraviesan la membrana y llegan al citoplasma. Las mitocondrias transforman parte de esa materia en energía química. Con energía e instrucciones del ADN, los ribosomas fabrican proteínas que permiten crecer, reparar estructuras y responder al entorno.

Sigue las flechas del diagrama. ¿Qué ocurriría con la fabricación de proteínas si la célula dejara de obtener energía?`),
            },
            frame: frame(110, 80, 520, 560, 0),
          },
          "red-diagrama": {
            ...objectBase("red-diagrama", 1),
            type: "pele",
            schemaVersion: 1,
            data: {
              source: `flowchart LR
  A[Nutrientes] --> B[Membrana]
  B --> C[Citoplasma]
  C --> D[Mitocondria]
  D --> E[Energía utilizable]
  F[ADN en el núcleo] --> G[Ribosomas]
  E --> G
  G --> H[Proteínas]`,
              caption:
                "Materia, energía e información convergen para sostener la actividad celular.",
            },
            frame: frame(680, 80, 600, 560, 1),
          },
        },
      }),
    },
    {
      key: "comparar",
      title: "4. Comparar para comprender",
      description: "Semejanzas y diferencias entre células animales y vegetales.",
      canvasId: page4,
      composition: canvasCompositionV2Schema.parse({
        version: 2,
        rootIds: ["comparar-texto", "comparar-tabla"],
        objects: {
          "comparar-texto": {
            ...objectBase("comparar-texto", 0),
            type: "richText",
            schemaVersion: 2,
            data: {
              document: markdownToDocument(`## Dos soluciones para una misma tarea

Las células animales y vegetales comparten membrana, citoplasma, ADN, ribosomas y mitocondrias porque todas necesitan regular intercambios, fabricar moléculas y obtener energía.

Las vegetales añaden estructuras relacionadas con su forma de vida: una pared rígida, una gran vacuola y cloroplastos capaces de captar energía luminosa. Comparar permite distinguir lo común de lo especializado.`),
            },
            frame: frame(100, 80, 1080, 340, 0),
          },
          "comparar-tabla": {
            ...objectBase("comparar-tabla", 1),
            type: "table",
            schemaVersion: 2,
            data: {
              rows: 5,
              columns: 3,
              cells: [
                { id: "c00", text: "Estructura" },
                { id: "c01", text: "Célula animal" },
                { id: "c02", text: "Célula vegetal" },
                { id: "c10", text: "Membrana" },
                { id: "c11", text: "Sí" },
                { id: "c12", text: "Sí" },
                { id: "c20", text: "Pared celular" },
                { id: "c21", text: "No" },
                { id: "c22", text: "Sí" },
                { id: "c30", text: "Cloroplastos" },
                { id: "c31", text: "No" },
                { id: "c32", text: "Sí" },
                { id: "c40", text: "Mitocondrias" },
                { id: "c41", text: "Sí" },
                { id: "c42", text: "Sí" },
              ],
            },
            frame: frame(180, 470, 900, 440, 1),
          },
        },
      }),
    },
    {
      key: "reto",
      title: "5. Comprueba tu modelo",
      description: "Una pregunta final para aplicar lo aprendido.",
      canvasId: page5,
      composition: canvasCompositionV2Schema.parse({
        version: 2,
        rootIds: ["reto-texto", "reto-quiz", "reto-volver"],
        objects: {
          "reto-texto": {
            ...objectBase("reto-texto", 0),
            type: "richText",
            schemaVersion: 2,
            data: {
              document: markdownToDocument(`## Pensar como un biólogo

Ya puedes describir estructuras, pero el objetivo es relacionarlas. Responde usando una cadena causal: **si una parte falla, ¿qué proceso cambia y qué consecuencia aparece?**`),
            },
            frame: frame(140, 80, 940, 260, 0),
          },
          "reto-quiz": {
            ...objectBase("reto-quiz", 1),
            type: "quiz",
            schemaVersion: 1,
            data: {
              question:
                "Si una célula pierde la capacidad de producir energía en sus mitocondrias, ¿qué efecto es más probable?",
              options: [
                {
                  id: "a",
                  label: "Aumentará inmediatamente la fabricación de proteínas",
                  correct: false,
                },
                {
                  id: "b",
                  label: "Tendrá dificultades para sostener procesos que requieren energía",
                  correct: true,
                },
                { id: "c", label: "Su ADN desaparecerá de forma automática", correct: false },
                {
                  id: "d",
                  label: "Se convertirá necesariamente en una célula vegetal",
                  correct: false,
                },
              ],
              explanation:
                "La energía producida por las mitocondrias alimenta transporte, síntesis, movimiento y reparación. Si disminuye, muchos procesos pierden capacidad de trabajo.",
              allowRetry: true,
              showExplanation: true,
            },
            frame: frame(220, 380, 820, 480, 1),
          },
          "reto-volver": {
            ...objectBase("reto-volver", 2),
            type: "navigation",
            schemaVersion: 1,
            data: {
              label: "Repasar desde el principio",
              destination: { kind: "canvas", canvasId: page1 },
              style: "secondary",
              openInNewTab: false,
            },
            frame: frame(220, 900, 360, 160, 2),
          },
        },
      }),
    },
  ];
  return pages;
}

export function buildKnowCanvasDemoPages(projectId: string): DemoPage[] {
  const canvasId = (key: string) => `${projectId}:knowcanvas-demo:${key}:canvas`;
  const welcome = canvasId("welcome");
  const create = canvasId("create");
  const organize = canvasId("organize");
  const interact = canvasId("interact");
  const publish = canvasId("publish");

  return [
    {
      key: "welcome",
      title: "1. Bienvenido a KnowCanvas",
      description: "Qué es la herramienta y cómo se organiza un libro visual.",
      canvasId: welcome,
      composition: canvasCompositionV2Schema.parse({
        version: 2,
        rootIds: ["welcome-copy", "welcome-map", "welcome-next"],
        objects: {
          "welcome-copy": {
            ...objectBase("welcome-copy", 0),
            type: "richText",
            schemaVersion: 2,
            data: {
              document: markdownToDocument(`## Ideas que se pueden recorrer

**KnowCanvas** es una herramienta de autor para convertir conocimiento en libros visuales, interactivos y reutilizables. Cada libro combina la libertad de una pizarra con una estructura clara de páginas.

### El modelo mental

- Un **libro** reúne el propósito, el tema visual y la forma de lectura.
- El **árbol** organiza carpetas y páginas sin limitar la creatividad del lienzo.
- Cada **lienzo** permite colocar, mover, redimensionar y agrupar widgets.
- El modo **Estudiar** transforma la composición en una experiencia de lectura limpia.

Este propio libro es editable: selecciónalo, cambia sus textos y observa cómo cada elemento expone propiedades coherentes.`),
            },
            frame: frame(90, 80, 650, 640, 0),
          },
          "welcome-map": {
            ...objectBase("welcome-map", 1),
            type: "pele",
            schemaVersion: 1,
            data: {
              source: `flowchart LR
  A[Libro] --> B[Carpetas]
  B --> C[Páginas]
  C --> D[Lienzos]
  D --> E[Widgets]
  E --> F[Estudiar]
  F --> G[HTML y SCORM]`,
              caption: "De una idea editable a una experiencia que se puede compartir.",
            },
            frame: frame(790, 80, 520, 500, 1),
          },
          "welcome-next": {
            ...objectBase("welcome-next", 2),
            type: "navigation",
            schemaVersion: 1,
            data: {
              label: "Descubrir el lienzo",
              destination: { kind: "canvas", canvasId: create },
              style: "primary",
              openInNewTab: false,
            },
            frame: frame(790, 620, 320, 160, 2),
          },
        },
      }),
    },
    {
      key: "create",
      title: "2. Crea en un lienzo flexible",
      description: "Selección, colocación, edición y composición visual de widgets.",
      canvasId: create,
      composition: canvasCompositionV2Schema.parse({
        version: 2,
        rootIds: ["create-image", "create-copy", "create-table"],
        objects: {
          "create-image": {
            ...objectBase("create-image", 0),
            type: "image",
            schemaVersion: 1,
            data: {
              resourceId: null,
              url: "/examples/knowcanvas-workspace.svg",
              alt: "Esquema de la interfaz de KnowCanvas con árbol, lienzo e inspector",
              caption: "Tres zonas coordinadas: organiza, compone y configura.",
              fit: "contain",
            },
            frame: frame(80, 80, 720, 500, 0),
          },
          "create-copy": {
            ...objectBase("create-copy", 1),
            type: "richText",
            schemaVersion: 2,
            data: {
              document: markdownToDocument(`## Editar sin perder el contexto

Un clic selecciona un widget. Desde ahí puedes **moverlo**, cambiar su tamaño o usar sus propiedades. Un doble clic entra en su contenido. Al hacer clic fuera vuelves al lienzo.

Selecciona varios elementos con el rectángulo o con Mayús + clic. El conjunto se puede mover, duplicar, alinear y agrupar como una unidad.

> Prueba a seleccionar esta tarjeta y cambia su fondo en Apariencia.`),
            },
            frame: frame(850, 80, 460, 500, 1),
          },
          "create-table": {
            ...objectBase("create-table", 2),
            type: "table",
            schemaVersion: 2,
            data: {
              rows: 4,
              columns: 3,
              cells: [
                { id: "create-c00", text: "Acción" },
                { id: "create-c01", text: "Gesto" },
                { id: "create-c02", text: "Resultado" },
                { id: "create-c10", text: "Seleccionar" },
                { id: "create-c11", text: "Clic" },
                { id: "create-c12", text: "Marco y propiedades" },
                { id: "create-c20", text: "Editar" },
                { id: "create-c21", text: "Doble clic" },
                { id: "create-c22", text: "Contenido activo" },
                { id: "create-c30", text: "Crear" },
                { id: "create-c31", text: "Doble clic en vacío" },
                { id: "create-c32", text: "Nuevo contenido" },
              ],
            },
            frame: frame(230, 640, 930, 360, 2),
          },
        },
      }),
    },
    {
      key: "organize",
      title: "3. Organiza y da identidad",
      description: "Árbol, propiedades, temas y componentes con estilos coherentes.",
      canvasId: organize,
      composition: canvasCompositionV2Schema.parse({
        version: 2,
        rootIds: ["organize-copy", "organize-tabs", "organize-accordion"],
        objects: {
          "organize-copy": {
            ...objectBase("organize-copy", 0),
            type: "richText",
            schemaVersion: 2,
            data: {
              document: markdownToDocument(`## Del borrador al sistema

El árbol lateral funciona como el índice de un libro: permite crear carpetas y páginas, renombrarlas y moverlas. La raíz concentra las propiedades globales.

Cada widget mantiene separados **contenido**, **apariencia** y **comportamiento**. Así puedes cambiar el estilo sin alterar lo que enseña, o modificar una interacción sin rehacer la composición.`),
            },
            frame: frame(80, 70, 560, 430, 0),
          },
          "organize-tabs": {
            ...objectBase("organize-tabs", 1),
            type: "tabs",
            schemaVersion: 1,
            data: {
              title: "Tres niveles de propiedades",
              items: [
                {
                  id: "tab-content",
                  title: "Contenido",
                  content: markdownToDocument(
                    "Textos, imágenes, preguntas y datos que comunican la idea.",
                  ),
                },
                {
                  id: "tab-appearance",
                  title: "Apariencia",
                  content: markdownToDocument(
                    "Color, acento, borde, radio, relleno, tamaño y posición.",
                  ),
                },
                {
                  id: "tab-behavior",
                  title: "Comportamiento",
                  content: markdownToDocument(
                    "Navegación, respuesta educativa, expansión y bloqueo.",
                  ),
                },
              ],
            },
            frame: frame(690, 70, 600, 430, 1),
          },
          "organize-accordion": {
            ...objectBase("organize-accordion", 2),
            type: "accordion",
            schemaVersion: 2,
            data: {
              title: "Diseña una experiencia consistente",
              allowMultiple: true,
              items: [
                {
                  id: "accordion-theme",
                  title: "Temas del libro",
                  content: markdownToDocument(
                    "Minimal, Editorial, Aula, Naturaleza y Nocturno cambian la identidad del visor sin alterar el contenido.",
                  ),
                },
                {
                  id: "accordion-layout",
                  title: "Plantillas de lectura",
                  content: markdownToDocument(
                    "Árbol + hoja, Lectura, Revista y Presentación ofrecen distintos ritmos sobre las mismas páginas.",
                  ),
                },
                {
                  id: "accordion-accessibility",
                  title: "Accesibilidad integrada",
                  content: markdownToDocument(
                    "Navegación por teclado, foco visible, texto alternativo y estructura semántica forman parte del contenido publicado.",
                  ),
                },
              ],
            },
            frame: frame(200, 550, 980, 560, 2),
          },
        },
      }),
    },
    {
      key: "interact",
      title: "4. Convierte contenido en aprendizaje",
      description: "Ejemplos de tarjetas, secuencias e interacción educativa.",
      canvasId: interact,
      composition: canvasCompositionV2Schema.parse({
        version: 2,
        rootIds: ["interact-copy", "interact-cards", "interact-timeline"],
        objects: {
          "interact-copy": {
            ...objectBase("interact-copy", 0),
            type: "richText",
            schemaVersion: 2,
            data: {
              document: markdownToDocument(`## No basta con mostrar información

KnowCanvas incorpora widgets educativos para **explorar**, **recordar**, **comparar** y **comprobar**. En edición configuras el contenido; en Estudiar aparece únicamente la interacción que necesita la persona que aprende.

Prueba las tarjetas y recorre la línea temporal.`),
            },
            frame: frame(80, 70, 480, 430, 0),
          },
          "interact-cards": {
            ...objectBase("interact-cards", 1),
            type: "flashcards",
            schemaVersion: 1,
            data: {
              title: "Conceptos esenciales",
              cards: [
                {
                  id: "card-canvas",
                  front: markdownToDocument("¿Qué es un lienzo?"),
                  back: markdownToDocument(
                    "Una superficie espacial editable que se convierte en contenido adaptable al estudiar.",
                  ),
                },
                {
                  id: "card-widget",
                  front: markdownToDocument("¿Qué es un widget?"),
                  back: markdownToDocument(
                    "Una unidad de contenido o interacción con datos, estilo y comportamiento propios.",
                  ),
                },
                {
                  id: "card-study",
                  front: markdownToDocument("¿Qué hace el modo Estudiar?"),
                  back: markdownToDocument(
                    "Oculta las herramientas de autor y presenta el libro como experiencia de lectura.",
                  ),
                },
              ],
            },
            frame: frame(620, 70, 660, 430, 1),
          },
          "interact-timeline": {
            ...objectBase("interact-timeline", 2),
            type: "timeline",
            schemaVersion: 1,
            data: {
              title: "Un flujo de autoría completo",
              items: [
                {
                  id: "step-idea",
                  date: "1",
                  title: "Define la idea",
                  content: markdownToDocument("Crea un libro y organiza su recorrido."),
                },
                {
                  id: "step-compose",
                  date: "2",
                  title: "Compón las páginas",
                  content: markdownToDocument("Añade widgets y construye una jerarquía visual."),
                },
                {
                  id: "step-test",
                  date: "3",
                  title: "Prueba en Estudiar",
                  content: markdownToDocument("Comprueba navegación, lectura e interacciones."),
                },
                {
                  id: "step-share",
                  date: "4",
                  title: "Comparte",
                  content: markdownToDocument("Exporta HTML o un paquete SCORM 1.2."),
                },
              ],
            },
            frame: frame(230, 560, 920, 700, 2),
          },
        },
      }),
    },
    {
      key: "publish",
      title: "5. Estudia, comparte y evoluciona",
      description: "Prueba final, exportación y próximos pasos para crear tu libro.",
      canvasId: publish,
      composition: canvasCompositionV2Schema.parse({
        version: 2,
        rootIds: ["publish-copy", "publish-quiz", "publish-next", "publish-back"],
        objects: {
          "publish-copy": {
            ...objectBase("publish-copy", 0),
            type: "richText",
            schemaVersion: 2,
            data: {
              document: markdownToDocument(`## El mismo contenido, varios destinos

Antes de compartir, abre **Estudiar** y cambia el layout para revisar el libro desde distintos ritmos. Desde **Publicar** puedes descargar un HTML autocontenido o un paquete **SCORM 1.2** para un LMS.

El contenido sigue siendo tuyo y editable. La exportación es una fotografía estable del libro en ese momento.`),
            },
            frame: frame(90, 70, 560, 430, 0),
          },
          "publish-quiz": {
            ...objectBase("publish-quiz", 1),
            type: "quiz",
            schemaVersion: 1,
            data: {
              question: "¿Qué afirmaciones describen KnowCanvas?",
              options: [
                { id: "q-a", label: "Combina árbol, lienzos y widgets", correct: true },
                { id: "q-b", label: "Solo sirve para escribir texto plano", correct: false },
                { id: "q-c", label: "Se puede estudiar y exportar", correct: true },
                { id: "q-d", label: "Obliga a publicar para guardar", correct: false },
              ],
              explanation:
                "KnowCanvas separa autoría, estudio y publicación: organiza libros, compone páginas visuales y produce experiencias reutilizables.",
              selectionMode: "multiple",
              allowRetry: true,
              showExplanation: true,
            },
            frame: frame(710, 70, 600, 500, 1),
          },
          "publish-next": {
            ...objectBase("publish-next", 2),
            type: "navigation",
            schemaVersion: 1,
            data: {
              label: "Volver al comienzo",
              destination: { kind: "canvas", canvasId: welcome },
              style: "secondary",
              openInNewTab: false,
            },
            frame: frame(710, 620, 290, 160, 2),
          },
          "publish-back": {
            ...objectBase("publish-back", 3),
            type: "navigation",
            schemaVersion: 1,
            data: {
              label: "Repasar interacciones",
              destination: { kind: "canvas", canvasId: interact },
              style: "primary",
              openInNewTab: false,
            },
            frame: frame(1020, 620, 290, 160, 3),
          },
        },
      }),
    },
  ];
}
