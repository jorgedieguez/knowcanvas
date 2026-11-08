import {
  BookOpen,
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  BringToFront,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Cloud,
  Copy,
  Download,
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  Folder,
  FolderPlus,
  Globe2,
  Image,
  GripVertical,
  LayoutGrid,
  ListTree,
  KeyRound,
  LogOut,
  Lock,
  Maximize2,
  Menu,
  Minus,
  MoreHorizontal,
  MousePointer2,
  Network,
  PanelRightClose,
  PanelRightOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Package,
  Plus,
  Search,
  SendToBack,
  Settings2,
  ShieldCheck,
  Share2,
  Sparkles,
  Table2,
  Type,
  Trash2,
  Redo2,
  Undo2,
  Unlock,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";

import { brand } from "../config/brand";
import type {
  AiCredentialStatus,
  AiProposal,
  CanvasComposition,
  CanvasObject,
  DiagramWidget as DiagramWidgetData,
  NodeItem,
  ProjectDetail,
  ProjectAccessLevel,
  ProjectSummary,
  ProjectTheme,
  ProjectViewerTemplate,
  RichTextNode,
  TableWidget as TableWidgetData,
  User,
  Widget,
  WidgetAppearance,
  WidgetFrame,
} from "../shared/contracts";
import { api } from "./api";
import { exportProject, type ExportFormat } from "./export/project-export";
import {
  documentToMarkdown,
  markdownToDocument,
  updateEmbeddedImage,
  type EmbeddedImageData,
} from "../domain/rich-text";
import { buildStudyPages, type StudyPage } from "../domain/study-navigation";
import { RichTextEditor, RichTextPreview } from "./components/RichTextEditor";
import { ImagePicker, type SelectedImage } from "./components/ImagePicker";
import { DiagramWidget } from "./components/DiagramWidget";
import { PeleWidget } from "./components/PeleWidget";
import { NavigationWidget } from "./components/NavigationWidget";
import { QuizWidget } from "./components/QuizWidget";
import { AccordionWidget } from "./components/AccordionWidget";
import { TabsWidget } from "./components/TabsWidget";
import { FlashcardsWidget } from "./components/FlashcardsWidget";
import { TimelineWidget } from "./components/TimelineWidget";
import { HotspotsWidget } from "./components/HotspotsWidget";
import { SortingWidget } from "./components/SortingWidget";
import { SortingPropertiesEditor } from "./components/SortingPropertiesEditor";
import { Menu as AccessibleMenu } from "./components/ui/Menu";
import { Dialog } from "./components/ui/Dialog";
import { Tabs } from "./components/ui/Tabs";

type WorkspaceMode = "edit" | "study";
type StudyLayout = ProjectViewerTemplate;
type InsertableWidgetType =
  | "richText"
  | "image"
  | "diagram"
  | "pele"
  | "table"
  | "navigation"
  | "quiz"
  | "accordion"
  | "tabs"
  | "flashcards"
  | "timeline"
  | "hotspots"
  | "sorting";
type WidgetPresetId =
  | "default"
  | "comparison"
  | "secondary"
  | "multiple"
  | "trueFalse"
  | "openMultiple"
  | "process"
  | "classify"
  | "order"
  | "match"
  | "index"
  | "bar";
type PendingWidgetPlacement = { type: InsertableWidgetType; preset: WidgetPresetId };
type AiCreationIntent = "explain" | "visualize" | "practice" | "assess" | "transform";

const aiCreationPrompts: Record<AiCreationIntent, string> = {
  explain: "Crea una explicación clara y visual sobre ",
  visualize: "Propón una composición visual para explicar ",
  practice: "Crea una actividad práctica sobre ",
  assess: "Crea una evaluación breve con retroalimentación sobre ",
  transform:
    "Transforma el contenido actual del lienzo en una experiencia más visual e interactiva.",
};
type EditorInteractionState =
  | { kind: "canvas" }
  | { kind: "selection"; primaryId: string | null; widgetIds: string[] }
  | { kind: "object"; widgetId: string }
  | { kind: "tool"; widgetId: string | null };

type SelectedWidget = { widget: Widget; frame: WidgetFrame };
type SelectedEmbeddedImage = { parentWidgetId: string; image: EmbeddedImageData };
type MultiSelectionInfo = {
  count: number;
  grouped: boolean;
  bounds: { x: number; y: number; width: number; height: number };
};
type SelectionArrangeAction =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom"
  | "distribute-horizontal"
  | "distribute-vertical";
type MultiSelectionActions = {
  arrange: (action: SelectionArrangeAction) => void;
  duplicate: () => void;
  remove: () => void;
  toggleGroup: () => void;
};
type PendingGroupPlacement = {
  objects: CanvasObject[];
  width: number;
  height: number;
};

const NAVIGATION_COLLAPSED_KEY = "knowcanvas-navigation-collapsed";
const INSPECTOR_WIDTH_KEY = "knowcanvas-inspector-width";

const widgetCategories = [
  { id: "Contenido", label: "Contenido", description: "Presentar información" },
  { id: "Visualizar", label: "Visualizar y explicar", description: "Hacer visible una idea" },
  { id: "Explorar", label: "Explorar e interactuar", description: "Descubrir por partes" },
  { id: "Practicar", label: "Practicar y evaluar", description: "Comprobar lo aprendido" },
  { id: "Diseño", label: "Diseño y navegación", description: "Guiar el recorrido" },
] as const;

const widgetTypes = [
  {
    id: "richText",
    label: "Texto enriquecido",
    icon: Type,
    tone: "amber",
    category: "Contenido",
    description: "Texto, listas, tablas e imágenes en un mismo bloque.",
    keywords: "escribir párrafo título lista contenido rico",
  },
  {
    id: "image",
    label: "Imagen",
    icon: Image,
    tone: "blue",
    category: "Contenido",
    description: "Añade una imagen con pie y texto alternativo.",
    keywords: "foto ilustración recurso visual",
  },
  {
    id: "table",
    label: "Tabla",
    icon: Table2,
    tone: "green",
    category: "Contenido",
    description: "Organiza datos y otros widgets en filas y columnas.",
    keywords: "datos filas columnas matriz",
  },
  {
    id: "diagram",
    label: "Diagrama libre",
    icon: Network,
    tone: "violet",
    category: "Visualizar",
    description: "Dibuja y conecta ideas libremente con Excalidraw.",
    keywords: "excalidraw dibujo esquema mapa",
  },
  {
    id: "pele",
    label: "Diagrama Mermaid",
    icon: Share2,
    tone: "violet",
    category: "Visualizar",
    description: "Genera procesos y relaciones desde texto estructurado.",
    keywords: "mermaid flujo proceso secuencia gráfico",
  },
  {
    id: "process",
    insertType: "timeline",
    preset: "process",
    label: "Proceso paso a paso",
    icon: ArrowRight,
    tone: "blue",
    category: "Visualizar",
    description: "Explica un procedimiento mediante etapas consecutivas.",
    keywords: "pasos procedimiento etapas instrucciones método",
  },
  {
    id: "comparison",
    insertType: "table",
    preset: "comparison",
    label: "Comparación",
    icon: LayoutGrid,
    tone: "green",
    category: "Visualizar",
    description: "Contrasta dos opciones mediante criterios comunes.",
    keywords: "versus diferencias similitudes antes después contraste",
  },
  {
    id: "navigation",
    label: "Botón de navegación",
    icon: ArrowRight,
    tone: "blue",
    category: "Diseño",
    description: "Conecta páginas o abre un recurso externo.",
    keywords: "enlace avanzar retroceder página url",
    variants: [
      { id: "default", label: "Principal" },
      { id: "secondary", label: "Secundario" },
    ],
  },
  {
    id: "navigationIndex",
    insertType: "navigation",
    preset: "index",
    label: "Menú / índice",
    icon: ListTree,
    tone: "violet",
    category: "Diseño",
    description: "Coloca un índice navegable de las páginas del libro.",
    keywords: "menú indice contenidos páginas capítulos navegación",
  },
  {
    id: "navigationBar",
    insertType: "navigation",
    preset: "bar",
    label: "Barra de navegación",
    icon: ArrowRight,
    tone: "blue",
    category: "Diseño",
    description: "Añade controles anterior y siguiente con contexto de página.",
    keywords: "anterior siguiente avanzar retroceder progreso navegación",
  },
  {
    id: "quiz",
    label: "Ejercicio tipo test",
    icon: CircleHelp,
    tone: "green",
    category: "Practicar",
    description: "Pregunta con opciones, solución y retroalimentación.",
    keywords: "cuestionario evaluación pregunta opción verdadero falso",
    variants: [
      { id: "default", label: "Respuesta única" },
      { id: "multiple", label: "Respuesta múltiple" },
      { id: "trueFalse", label: "Verdadero / falso" },
    ],
  },
  {
    id: "classify",
    insertType: "sorting",
    preset: "classify",
    label: "Clasificar",
    icon: LayoutGrid,
    tone: "green",
    category: "Practicar",
    description: "Distribuye conceptos en las categorías correctas.",
    keywords: "agrupar categorías ordenar actividad práctica",
  },
  {
    id: "order",
    insertType: "sorting",
    preset: "order",
    label: "Ordenar",
    icon: ArrowDown,
    tone: "blue",
    category: "Practicar",
    description: "Reconstruye una secuencia mediante pasos movibles.",
    keywords: "secuencia pasos ordenar prioridad cronología",
  },
  {
    id: "match",
    insertType: "sorting",
    preset: "match",
    label: "Relacionar",
    icon: Share2,
    tone: "violet",
    category: "Practicar",
    description: "Empareja cada concepto con su correspondencia.",
    keywords: "unir emparejar correspondencias conceptos definiciones",
  },
  {
    id: "accordion",
    label: "Acordeón",
    icon: ChevronDown,
    tone: "coral",
    category: "Explorar",
    description: "Revela explicaciones progresivamente.",
    keywords: "desplegable panel pregunta respuesta",
    variants: [
      { id: "default", label: "Uno abierto" },
      { id: "openMultiple", label: "Varios abiertos" },
    ],
  },
  {
    id: "tabs",
    label: "Pestañas",
    icon: LayoutGrid,
    tone: "blue",
    category: "Explorar",
    description: "Alterna entre contenidos relacionados sin salir del bloque.",
    keywords: "paneles secciones categorías",
  },
  {
    id: "flashcards",
    label: "Tarjetas reversibles",
    icon: Copy,
    tone: "green",
    category: "Explorar",
    description: "Repasa conceptos mediante anverso y reverso.",
    keywords: "flashcards memoria repaso tarjetas",
  },
  {
    id: "timeline",
    label: "Línea temporal",
    icon: ArrowDown,
    tone: "violet",
    category: "Visualizar",
    description: "Explica una evolución mediante hitos ordenados.",
    keywords: "cronología fechas historia etapas hitos",
  },
  {
    id: "hotspots",
    label: "Imagen interactiva",
    icon: Image,
    tone: "coral",
    category: "Visualizar",
    description: "Añade puntos explicativos sobre una imagen.",
    keywords: "hotspots puntos mapa anatomía explorar",
  },
] as const;

type WidgetCatalogItem = (typeof widgetTypes)[number];
type WidgetCatalogId = WidgetCatalogItem["id"];

function catalogInsertionType(item: WidgetCatalogItem): InsertableWidgetType {
  if (item.id === "process") return "timeline";
  if (item.id === "comparison") return "table";
  if (item.id === "classify" || item.id === "order" || item.id === "match") return "sorting";
  if (item.id === "navigationIndex" || item.id === "navigationBar") return "navigation";
  return item.id;
}

function catalogDefaultPreset(item: WidgetCatalogItem): WidgetPresetId {
  if (item.id === "process") return "process";
  if (item.id === "comparison") return "comparison";
  if (item.id === "classify") return "classify";
  if (item.id === "order") return "order";
  if (item.id === "match") return "match";
  if (item.id === "navigationIndex") return "index";
  if (item.id === "navigationBar") return "bar";
  return "default";
}

function WidgetCatalogPreview({ type }: { type: InsertableWidgetType }) {
  return (
    <div className={`widget-catalog-preview-visual preview-${type}`} aria-hidden="true">
      {type === "richText" ? (
        <>
          <span className="preview-heading" />
          <span className="preview-line wide" />
          <span className="preview-line" />
          <span className="preview-line short" />
        </>
      ) : type === "image" || type === "hotspots" ? (
        <>
          <Image size={26} />
          {type === "hotspots" ? (
            <>
              <i className="preview-hotspot one" />
              <i className="preview-hotspot two" />
            </>
          ) : null}
        </>
      ) : type === "table" ? (
        <span className="preview-table-grid">
          {Array.from({ length: 6 }, (_, index) => (
            <i key={index} />
          ))}
        </span>
      ) : type === "diagram" || type === "pele" ? (
        <>
          <i className="preview-node first" />
          <i className="preview-connector" />
          <i className="preview-node second" />
        </>
      ) : type === "navigation" ? (
        <span className="preview-navigation-button">
          Continuar <ArrowRight size={11} />
        </span>
      ) : type === "quiz" ? (
        <>
          <span className="preview-question" />
          <span className="preview-option">
            <i /> Opción A
          </span>
          <span className="preview-option">
            <i /> Opción B
          </span>
        </>
      ) : type === "sorting" ? (
        <>
          <span className="preview-option">
            <i /> Concepto
          </span>
          <span className="preview-sort-target">Categoría</span>
          <span className="preview-sort-target">Categoría</span>
        </>
      ) : type === "accordion" ? (
        <>
          <span className="preview-panel">
            Primer apartado <ChevronRight size={10} />
          </span>
          <span className="preview-panel">
            Segundo apartado <ChevronRight size={10} />
          </span>
        </>
      ) : type === "tabs" ? (
        <>
          <span className="preview-tabs">
            <i /> <i />
          </span>
          <span className="preview-tab-content" />
        </>
      ) : type === "flashcards" ? (
        <span className="preview-flashcard">
          Concepto <Copy size={12} />
        </span>
      ) : (
        <span className="preview-timeline">
          <i />
          <b />
          <i />
          <b />
          <i />
          <b />
        </span>
      )}
    </div>
  );
}

type RichTextTransformationTarget = "accordion" | "flashcards" | "timeline";

function richTextTransformationChunks(document: RichTextNode): string[] {
  const chunks = documentToMarkdown(document)
    .split(/\n\s*\n/u)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  return chunks.length ? chunks : ["Añade aquí el contenido principal."];
}

function transformationTitle(chunk: string, fallback: string): string {
  const firstLine = chunk
    .split("\n")[0]
    ?.replace(/^#{1,6}\s+/u, "")
    .replace(/^[-*+]\s+/u, "")
    .trim();
  return (firstLine || fallback).slice(0, 160);
}

function transformRichTextWidget(
  widget: Extract<Widget, { type: "richText" }>,
  target: RichTextTransformationTarget,
): Widget {
  const chunks = richTextTransformationChunks(widget.data.document);
  const common = {
    id: widget.id,
    frame: widget.frame,
    locked: widget.locked,
    appearance: widget.appearance,
  };
  if (target === "accordion") {
    return {
      ...common,
      type: "accordion",
      schemaVersion: 2,
      data: {
        title: "Explora el contenido",
        items: chunks.slice(0, 20).map((chunk, index) => ({
          id: crypto.randomUUID(),
          title: transformationTitle(chunk, `Apartado ${index + 1}`),
          content: markdownToDocument(chunk),
        })),
        allowMultiple: false,
      },
    };
  }
  if (target === "flashcards") {
    const cards = Array.from({ length: Math.max(1, Math.ceil(chunks.length / 2)) }, (_, index) => ({
      id: crypto.randomUUID(),
      front: markdownToDocument(chunks[index * 2] ?? `Concepto ${index + 1}`),
      back: markdownToDocument(
        chunks[index * 2 + 1] ?? "Añade aquí una explicación breve y memorable.",
      ),
    }));
    return {
      ...common,
      type: "flashcards",
      schemaVersion: 1,
      data: { title: "Repasa los conceptos", cards: cards.slice(0, 20) },
    };
  }
  return {
    ...common,
    type: "timeline",
    schemaVersion: 1,
    data: {
      title: "Proceso paso a paso",
      items: chunks.slice(0, 20).map((chunk, index) => ({
        id: crypto.randomUUID(),
        date: `Paso ${index + 1}`,
        title: transformationTitle(chunk, `Etapa ${index + 1}`),
        content: markdownToDocument(chunk),
      })),
    },
  };
}

type PresentationWidget = Extract<
  Widget,
  { type: "accordion" | "tabs" | "flashcards" | "timeline" }
>;
type PresentationTarget = PresentationWidget["type"];

function isPresentationWidget(widget: Widget): widget is PresentationWidget {
  return ["accordion", "tabs", "flashcards", "timeline"].includes(widget.type);
}

function transformPresentationWidget(
  widget: PresentationWidget,
  target: PresentationTarget,
): PresentationWidget {
  const title = widget.data.title;
  const sections =
    widget.type === "flashcards"
      ? widget.data.cards.map((card, index) => ({
          title: transformationTitle(documentToMarkdown(card.front), `Tarjeta ${index + 1}`),
          content: markdownToDocument(
            `**Anverso**\n\n${documentToMarkdown(card.front)}\n\n**Reverso**\n\n${documentToMarkdown(card.back)}`,
          ),
          back: card.back,
        }))
      : widget.data.items.map((item, index) => ({
          title:
            "date" in item ? `${item.date} · ${item.title}` : item.title || `Apartado ${index + 1}`,
          content: item.content,
          back: item.content,
        }));
  const common = {
    id: widget.id,
    frame: widget.frame,
    locked: widget.locked,
    appearance: widget.appearance,
  };
  if (target === "accordion") {
    return {
      ...common,
      type: "accordion",
      schemaVersion: 2,
      data: {
        title,
        items: sections.map((section) => ({
          id: crypto.randomUUID(),
          title: section.title.slice(0, 500),
          content: section.content,
        })),
        allowMultiple: false,
      },
    };
  }
  if (target === "tabs") {
    return {
      ...common,
      type: "tabs",
      schemaVersion: 1,
      data: {
        title,
        items: sections.map((section) => ({
          id: crypto.randomUUID(),
          title: section.title.slice(0, 120),
          content: section.content,
        })),
      },
    };
  }
  if (target === "flashcards") {
    return {
      ...common,
      type: "flashcards",
      schemaVersion: 1,
      data: {
        title,
        cards: sections.map((section) => ({
          id: crypto.randomUUID(),
          front: markdownToDocument(section.title),
          back: section.back,
        })),
      },
    };
  }
  return {
    ...common,
    type: "timeline",
    schemaVersion: 1,
    data: {
      title,
      items: sections.map((section, index) => ({
        id: crypto.randomUUID(),
        date: `Paso ${index + 1}`,
        title: section.title.slice(0, 500),
        content: section.content,
      })),
    },
  };
}

function PresentationTransformer({
  widget,
  onTransform,
}: {
  widget: PresentationWidget;
  onTransform: (target: PresentationTarget) => void;
}) {
  const labels: Record<PresentationTarget, string> = {
    accordion: "Acordeón",
    tabs: "Pestañas",
    flashcards: "Tarjetas",
    timeline: "Proceso",
  };
  return (
    <section
      className="widget-transformer presentation-transformer"
      aria-labelledby="presentation-transform-title"
    >
      <div>
        <span className="property-grid-label" id="presentation-transform-title">
          Cambiar presentación
        </span>
        <p>Reutiliza el mismo contenido con otra experiencia.</p>
      </div>
      <div className="widget-transformer-actions">
        {(Object.keys(labels) as PresentationTarget[])
          .filter((target) => target !== widget.type)
          .map((target) => (
            <button
              className="secondary-button"
              type="button"
              key={target}
              onClick={() => onTransform(target)}
            >
              <Sparkles size={13} aria-hidden="true" />
              {labels[target]}
            </button>
          ))}
      </div>
      <small>Conserva posición y permite deshacer.</small>
    </section>
  );
}

function aiWidgetLabel(type: AiProposal["widgets"][number]["type"]): string {
  return {
    richText: "Texto enriquecido",
    image: "Imagen",
    diagram: "Diagrama libre",
    pele: "Diagrama Mermaid",
    table: "Tabla",
    navigation: "Botón de navegación",
    quiz: "Cuestionario",
    accordion: "Acordeón",
    tabs: "Pestañas",
    flashcards: "Tarjetas reversibles",
    timeline: "Línea temporal",
    hotspots: "Imagen interactiva",
    sorting: "Actividad interactiva",
  }[type];
}

function aiWidgetSummary(widget: AiProposal["widgets"][number]): string {
  if (widget.type === "richText") return widget.markdown.slice(0, 140);
  if (widget.type === "image") return widget.caption || widget.alt;
  if (widget.type === "diagram") return widget.description;
  if (widget.type === "pele") return widget.caption || widget.source.slice(0, 140);
  if (widget.type === "table")
    return `${widget.headers.length} columnas · ${widget.rows.length} filas`;
  if (widget.type === "navigation") return widget.label;
  if (widget.type === "quiz") return widget.question;
  return widget.title;
}

const DEFAULT_WIDGET_APPEARANCE: WidgetAppearance = {
  backgroundColor: "#ffffff",
  textColor: "#1d1d1f",
  accentColor: "#0066cc",
  border: "none",
  borderRadius: 12,
  padding: 0,
};

const WIDGET_APPEARANCE_BY_TYPE: Partial<Record<Widget["type"], Partial<WidgetAppearance>>> = {
  richText: { accentColor: "#5b5bd6" },
  image: { backgroundColor: "#f8fafc", accentColor: "#0f766e", borderRadius: 16 },
  diagram: { backgroundColor: "#f7f5ff", accentColor: "#6d4aff", borderRadius: 16 },
  pele: { backgroundColor: "#f7f5ff", accentColor: "#6d4aff", borderRadius: 16 },
  table: { backgroundColor: "#f8fafc", accentColor: "#2563eb", borderRadius: 14 },
  navigation: { backgroundColor: "#f7f8ff", accentColor: "#4f46e5", borderRadius: 18 },
  quiz: { backgroundColor: "#fff8f3", accentColor: "#c2410c", borderRadius: 18 },
  sorting: { backgroundColor: "#f4fbf8", accentColor: "#047857", borderRadius: 18 },
  accordion: { backgroundColor: "#f6fbff", accentColor: "#0369a1", borderRadius: 16 },
  tabs: { backgroundColor: "#faf8ff", accentColor: "#7c3aed", borderRadius: 16 },
  flashcards: { backgroundColor: "#fff7fb", accentColor: "#be185d", borderRadius: 18 },
  timeline: { backgroundColor: "#fffbf2", accentColor: "#b45309", borderRadius: 16 },
  hotspots: { backgroundColor: "#f4fbf8", accentColor: "#047857", borderRadius: 16 },
};

function defaultWidgetAppearance(type: Widget["type"]): WidgetAppearance {
  return { ...DEFAULT_WIDGET_APPEARANCE, ...WIDGET_APPEARANCE_BY_TYPE[type] };
}

function widgetAppearanceStyle(widget: Widget): CSSProperties {
  const appearance = widget.appearance ?? defaultWidgetAppearance(widget.type);
  return {
    backgroundColor: appearance.backgroundColor,
    color: appearance.textColor,
    borderRadius: appearance.borderRadius,
    padding: appearance.padding,
    border: appearance.border === "subtle" ? "1px solid var(--ui-line)" : "1px solid transparent",
    "--widget-accent": appearance.accentColor,
  } as CSSProperties;
}

function defaultWidgetFrame(index: number): WidgetFrame {
  return {
    x: 36 + (index % 2) * 600,
    y: 120 + Math.floor(index / 2) * 400,
    width: 520,
    height: 340,
    z: index,
  };
}

function isRichTextEmpty(markdown: string) {
  return markdown.replace(/[\s#>*_`\-/\\[\]()]/gu, "").length === 0;
}

function removeEmptyTextObjects(composition: CanvasComposition) {
  const emptyIds = new Set(
    Object.values(composition.objects)
      .filter(
        (object) =>
          object.type === "richText" && isRichTextEmpty(documentToMarkdown(object.data.document)),
      )
      .map((object) => object.id),
  );
  if (emptyIds.size === 0) return composition;
  return {
    ...composition,
    rootIds: composition.rootIds.filter((id) => !emptyIds.has(id)),
    objects: Object.fromEntries(
      Object.entries(composition.objects).filter(([id]) => !emptyIds.has(id)),
    ) as Record<string, CanvasObject>,
  };
}

function flattenTree(
  nodes: NodeItem[],
  collapsedNodes: ReadonlySet<string> = new Set(),
): { node: NodeItem; depth: number }[] {
  const children = new Map<string | null, NodeItem[]>();
  for (const node of nodes) {
    const siblings = children.get(node.parentId) ?? [];
    siblings.push(node);
    children.set(node.parentId, siblings);
  }
  for (const siblings of children.values()) siblings.sort((a, b) => a.position - b.position);

  const rows: { node: NodeItem; depth: number }[] = [];
  const visit = (parentId: string | null, depth: number) => {
    for (const node of children.get(parentId) ?? []) {
      rows.push({ node, depth });
      if (!collapsedNodes.has(node.id)) visit(node.id, depth + 1);
    }
  };
  visit(null, 0);
  return rows;
}

function BrandLockup() {
  return (
    <div className="brand-block">
      <img className="brand-logo" src={brand.logo} alt={brand.name} />
      <h1 className="sr-only">{brand.name}</h1>
      <p>{brand.tagline}</p>
    </div>
  );
}

function BrandIcon({ size = "medium" }: { size?: "small" | "medium" }) {
  return (
    <span className={`brand-mark brand-mark-${size}`} aria-hidden="true">
      <img src={brand.logo} alt="" />
    </span>
  );
}

function AccountTrigger({ user, onOpen }: { user: User; onOpen: () => void }) {
  return (
    <button className="account-trigger" type="button" onClick={onOpen} aria-label="Abrir perfil">
      {user.avatarUrl ? (
        <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
      ) : (
        <span className="account-trigger-avatar" aria-hidden="true">
          {user.displayName.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="account-trigger-copy">
        <strong>{user.displayName}</strong>
        <small>Perfil</small>
      </span>
      <ChevronDown size={14} aria-hidden="true" />
    </button>
  );
}

function LoadingScreen() {
  return (
    <main className="entry-screen" aria-busy="true" aria-live="polite">
      <BrandLockup />
      <div className="loading-line" />
      <p>Preparando tu biblioteca…</p>
    </main>
  );
}

function LoginScreen({ authConfigured, error }: { authConfigured: boolean; error: string | null }) {
  return (
    <main className="login-screen">
      <section className="login-card">
        <BrandLockup />
        <span className="eyebrow">Tu espacio de conocimiento</span>
        <h2>Convierte ideas complejas en experiencias que se entienden.</h2>
        <p>
          Organiza cada libro en carpetas y lienzos, y construye contenido interactivo desde una
          estructura clara.
        </p>
        {error ? (
          <div className="inline-error" role="alert">
            {error}
          </div>
        ) : null}
        {authConfigured ? (
          <a className="google-button" href="/api/auth/google/start">
            <span aria-hidden="true">G</span>Continuar con Google
          </a>
        ) : (
          <div className="setup-note">
            <strong>Falta configurar Google OAuth</strong>
            <span>
              Copia <code>.dev.vars.example</code> como <code>.dev.vars</code> y añade el client ID
              y el secret.
            </span>
          </div>
        )}
        <small>
          KnowCanvas usa tu cuenta Google para identificarte y guardar en Drive únicamente los
          archivos que creas desde la aplicación. No solicita acceso a Gmail ni al resto de tu
          Drive.
        </small>
        <nav className="entry-legal-links" aria-label="Información legal">
          <a href="/privacy">Privacidad</a>
          <a href="/terms">Términos</a>
        </nav>
      </section>
      <aside className="login-visual" aria-hidden="true">
        <span className="visual-label">Biblioteca / Biología</span>
        <div className="visual-sheet">
          <i />
          <i />
          <i />
          <strong>La célula como sistema</strong>
          <p>Texto, relaciones y experiencias en un mismo lienzo.</p>
        </div>
      </aside>
    </main>
  );
}

function LibraryScreen({
  user,
  projects,
  error,
  onOpen,
  onCreate,
  onOpenAccount,
  onLogout,
}: {
  user: User;
  projects: ProjectSummary[];
  error: string | null;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onOpenAccount: () => void;
  onLogout: () => void;
}) {
  const ownProjects = projects.filter((project) => project.isOwner);
  const publicProjects = projects.filter((project) => !project.isOwner);
  const renderBook = (item: ProjectSummary, index: number) => (
    <button className="book-card" type="button" onClick={() => onOpen(item.id)} key={item.id}>
      <span className={`book-cover cover-${index % 3}`}>
        <BookOpen size={24} />
      </span>
      <span className="book-meta">
        <strong>{item.name}</strong>
        <span>{item.description || "Un espacio listo para desarrollar."}</span>
        <small>
          {item.isOwner
            ? item.accessLevel === "private"
              ? "Privado"
              : item.accessLevel === "public_edit"
                ? "Público · colaborativo"
                : "Público · lectura"
            : `${item.ownerName} · ${item.canEdit ? "puedes editar" : "solo lectura"}`}
        </small>
      </span>
      <ChevronRight size={18} />
    </button>
  );
  return (
    <div className="library-shell">
      <header className="library-topbar">
        <BrandLockup />
        <div className="library-account-actions">
          <AccountTrigger user={user} onOpen={onOpenAccount} />
          <button
            className="icon-button"
            type="button"
            aria-label="Cerrar sesión"
            onClick={onLogout}
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>
      <main className="library-main">
        <div className="library-heading">
          <div>
            <span className="eyebrow">Biblioteca</span>
            <h2>Tus libros</h2>
            <p>Proyectos separados para investigar, explicar y publicar conocimiento.</p>
          </div>
          <button className="primary-action" type="button" onClick={onCreate}>
            <Plus size={17} />
            Nuevo libro
          </button>
        </div>
        {error ? (
          <div className="inline-error" role="alert">
            {error}
          </div>
        ) : null}
        <div className="library-collection-heading">
          <h3>Mis libros</h3>
          <span>{ownProjects.length}</span>
        </div>
        <section className="book-grid" aria-label="Mis libros">
          {ownProjects.map(renderBook)}
          {ownProjects.length === 0 ? (
            <div className="empty-library">
              <BookOpen size={28} />
              <h3>Empieza tu primer libro</h3>
              <p>Crea un proyecto y organízalo en carpetas y lienzos.</p>
            </div>
          ) : null}
        </section>
        {publicProjects.length ? (
          <>
            <div className="library-collection-heading">
              <h3>Comunidad</h3>
              <span>{publicProjects.length}</span>
            </div>
            <section className="book-grid" aria-label="Libros públicos">
              {publicProjects.map(renderBook)}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

function AccountAiDialog({
  user,
  onClose,
  onLogout,
}: {
  user: User;
  onClose: () => void;
  onLogout: () => void;
}) {
  const [status, setStatus] = useState<AiCredentialStatus | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<"success" | "error">("success");
  const [showKey, setShowKey] = useState(false);
  const [replacingKey, setReplacingKey] = useState(false);

  useEffect(() => {
    void api
      .getAiCredential()
      .then(setStatus)
      .catch((cause) => {
        setMessageKind("error");
        setMessage(cause instanceof Error ? cause.message : "No se pudo comprobar la conexión.");
      });
  }, []);

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      setStatus(await api.saveAiCredential(apiKey));
      setApiKey("");
      setReplacingKey(false);
      setMessageKind("success");
      setMessage("Conexión lista. Ya puedes utilizar el asistente de KnowCanvas.");
    } catch (cause) {
      setMessageKind("error");
      setMessage(cause instanceof Error ? cause.message : "No se pudo guardar la API key.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setMessage(null);
    try {
      await api.deleteAiCredential();
      setStatus({ configured: false, lastFour: null, updatedAt: null });
      setMessageKind("success");
      setMessage("La conexión con OpenAI se ha eliminado.");
    } catch (cause) {
      setMessageKind("error");
      setMessage(cause instanceof Error ? cause.message : "No se pudo eliminar la API key.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      className="account-settings-dialog"
      labelledBy="account-settings-title"
      onDismiss={onClose}
    >
      <header>
        <div className="account-profile-heading">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
          ) : (
            <span aria-hidden="true">{user.displayName.slice(0, 1).toUpperCase()}</span>
          )}
          <div>
            <span className="eyebrow">Cuenta</span>
            <h2 id="account-settings-title">Perfil y configuración</h2>
            <p>
              <strong>{user.displayName}</strong> · {user.email}
            </p>
          </div>
        </div>
        <button className="icon-button" type="button" aria-label="Cerrar" onClick={onClose}>
          <X size={17} />
        </button>
      </header>
      <section className="account-ai-section" aria-labelledby="account-ai-title">
        <div className="account-ai-heading">
          <span className="widget-icon purple">
            <KeyRound size={17} />
          </span>
          <div>
            <h3 id="account-ai-title">Asistente de IA</h3>
            <p>Conecta tu propia cuenta de OpenAI para generar contenido en tus lienzos.</p>
          </div>
        </div>
        <div className="ai-key-guide">
          <ShieldCheck size={18} aria-hidden="true" />
          <div>
            <strong>Tu clave sigue siendo privada</strong>
            <p>
              Se cifra antes de guardarse y solo se usa cuando envías una petición al asistente.
            </p>
          </div>
        </div>
        {status?.configured ? (
          <div className="credential-status">
            <span>
              <i aria-hidden="true" /> OpenAI conectado
            </span>
            <strong>•••• •••• {status.lastFour}</strong>
          </div>
        ) : status === null && !message ? (
          <p className="credential-loading" role="status">
            Comprobando conexión…
          </p>
        ) : null}
        {!status?.configured || replacingKey ? (
          <>
            <label className="property-field">
              {status?.configured ? "Nueva clave secreta" : "Clave secreta de OpenAI"}
              <span className="secret-input">
                <input
                  id="openai-api-key"
                  name="knowcanvas-openai-key-replacement"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  autoComplete="new-password"
                  data-1p-ignore
                  data-lpignore="true"
                  spellCheck={false}
                  placeholder="sk-…"
                  aria-describedby="openai-key-help openai-key-message"
                  onChange={(event) => {
                    setApiKey(event.target.value);
                    if (messageKind === "error") setMessage(null);
                  }}
                />
                <button
                  type="button"
                  aria-label={showKey ? "Ocultar clave" : "Mostrar clave"}
                  aria-pressed={showKey}
                  onClick={() => setShowKey((value) => !value)}
                >
                  {showKey ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>
            <div id="openai-key-help" className="ai-key-help">
              <p>
                La clave suele comenzar por <code>sk-</code>. El uso se factura en tu cuenta de
                OpenAI.
              </p>
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">
                Obtener una clave en OpenAI <ExternalLink size={13} aria-hidden="true" />
              </a>
            </div>
          </>
        ) : (
          <p className="configured-key-note">
            La clave guardada no se muestra ni se rellena en este formulario. Solo se sustituirá si
            eliges cambiarla.
          </p>
        )}
        {message ? (
          <p
            id="openai-key-message"
            className={`credential-message ${messageKind}`}
            role={messageKind === "error" ? "alert" : "status"}
          >
            {message}
          </p>
        ) : null}
        <footer>
          {status?.configured && !replacingKey ? (
            <button className="secondary-button" type="button" disabled={busy} onClick={remove}>
              Eliminar clave
            </button>
          ) : null}
          {status?.configured && !replacingKey ? (
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setMessage(null);
                setApiKey("");
                setReplacingKey(true);
              }}
            >
              Cambiar clave
            </button>
          ) : (
            <>
              {status?.configured ? (
                <button
                  className="secondary-button"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setApiKey("");
                    setMessage(null);
                    setReplacingKey(false);
                  }}
                >
                  Cancelar
                </button>
              ) : null}
              <button
                className="primary-button"
                type="button"
                disabled={busy || apiKey.trim().length < 20}
                onClick={save}
              >
                {busy ? "Validando…" : "Validar y guardar"}
              </button>
            </>
          )}
        </footer>
      </section>
      <footer className="account-dialog-footer">
        <button className="secondary-button" type="button" onClick={onLogout}>
          <LogOut size={15} aria-hidden="true" /> Cerrar sesión
        </button>
      </footer>
    </Dialog>
  );
}

function AiAssistantDialog({
  open,
  initialPrompt,
  canvasTitle,
  pages,
  onApply,
  onClose,
}: {
  open: boolean;
  initialPrompt: string;
  canvasTitle: string;
  pages: Array<{ id: string; title: string }>;
  onApply: (proposal: AiProposal) => Promise<void>;
  onClose: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<
    Array<
      | { id: string; role: "user"; text: string }
      | {
          id: string;
          role: "assistant";
          text: string;
          proposal?: AiProposal;
          selectedIndexes?: number[];
          status?: "pending" | "applied" | "discarded";
        }
    >
  >([]);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && initialPrompt) setPrompt(initialPrompt);
  }, [initialPrompt, open]);

  useEffect(() => {
    if (open) promptRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (open) historyEndRef.current?.scrollIntoView({ block: "end" });
  }, [busy, messages, open]);

  async function generate() {
    const request = prompt.trim();
    if (busy || request.length < 3) return;
    const requestId = crypto.randomUUID();
    setMessages((current) => [...current, { id: requestId, role: "user", text: request }]);
    setPrompt("");
    setBusy(true);
    try {
      const proposal = await api.createAiProposal(request, canvasTitle, pages);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: proposal.summary,
          proposal,
          selectedIndexes: proposal.widgets.map((_, index) => index),
          status: "pending",
        },
      ]);
    } catch (cause) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: cause instanceof Error ? cause.message : "No se pudo generar la propuesta.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function toggleWidget(messageId: string, widgetIndex: number) {
    setMessages((current) =>
      current.map((message) => {
        if (message.id !== messageId || message.role !== "assistant" || !message.proposal)
          return message;
        const selected = new Set(message.selectedIndexes ?? []);
        if (selected.has(widgetIndex)) selected.delete(widgetIndex);
        else selected.add(widgetIndex);
        return { ...message, selectedIndexes: [...selected].sort((a, b) => a - b) };
      }),
    );
  }

  async function applyProposal(messageId: string) {
    const message = messages.find((item) => item.id === messageId);
    if (!message || message.role !== "assistant" || !message.proposal) return;
    const selected = new Set(message.selectedIndexes ?? []);
    const widgets = message.proposal.widgets.filter((_, index) => selected.has(index));
    if (widgets.length === 0) return;
    setApplying(true);
    try {
      await onApply({ ...message.proposal, widgets });
      setMessages((current) =>
        current.map((item) =>
          item.id === messageId && item.role === "assistant"
            ? { ...item, status: "applied" }
            : item,
        ),
      );
    } catch (cause) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: cause instanceof Error ? cause.message : "No se pudo aplicar la propuesta.",
        },
      ]);
    } finally {
      setApplying(false);
    }
  }

  return (
    <aside
      className="ai-assistant-panel"
      hidden={!open}
      role="dialog"
      aria-modal="false"
      aria-labelledby="ai-assistant-title"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <header>
        <div>
          <span className="eyebrow">Asistente IA</span>
          <h2 id="ai-assistant-title">Copiloto de contenido</h2>
          <p>Trabajando en “{canvasTitle}”</p>
        </div>
        <button className="icon-button" type="button" aria-label="Cerrar" onClick={onClose}>
          <X size={17} />
        </button>
      </header>
      <div className="ai-assistant-body">
        <div className="ai-chat-history" role="log" aria-live="polite" aria-busy={busy}>
          <div className="ai-chat-message assistant">
            <BrandIcon size="small" />
            <p>
              Puedo preparar textos y cuestionarios. Siempre verás una propuesta antes de añadirla.
            </p>
          </div>
          {messages.map((message) =>
            message.role === "user" ? (
              <div className="ai-chat-message user" key={message.id}>
                <p>{message.text}</p>
              </div>
            ) : (
              <div className="ai-chat-turn" key={message.id}>
                <div className="ai-chat-message assistant">
                  <BrandIcon size="small" />
                  <p>{message.text}</p>
                </div>
                {message.proposal ? (
                  <section className="ai-proposal" aria-label="Propuesta de contenido">
                    <ul>
                      {message.proposal.widgets.map((widget, index) => (
                        <li key={`${message.id}-${widget.type}-${index}`}>
                          <label>
                            <input
                              type="checkbox"
                              checked={(message.selectedIndexes ?? []).includes(index)}
                              disabled={message.status !== "pending" || applying}
                              onChange={() => toggleWidget(message.id, index)}
                            />
                            <span>
                              <strong>{aiWidgetLabel(widget.type)}</strong>
                              <small>{aiWidgetSummary(widget)}</small>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                    {message.status === "pending" ? (
                      <footer>
                        <button
                          className="secondary-button"
                          type="button"
                          onClick={() =>
                            setMessages((current) =>
                              current.map((item) =>
                                item.id === message.id && item.role === "assistant"
                                  ? { ...item, status: "discarded" }
                                  : item,
                              ),
                            )
                          }
                        >
                          Descartar
                        </button>
                        <button
                          className="primary-button"
                          type="button"
                          disabled={(message.selectedIndexes?.length ?? 0) === 0 || applying}
                          onClick={() => void applyProposal(message.id)}
                        >
                          {applying
                            ? "Preparando elementos…"
                            : `Colocar ${message.selectedIndexes?.length ?? 0} en el lienzo`}
                        </button>
                      </footer>
                    ) : (
                      <p className="ai-proposal-status">
                        {message.status === "applied"
                          ? "Elementos preparados para colocarlos juntos en el lienzo."
                          : "Propuesta descartada."}
                      </p>
                    )}
                  </section>
                ) : null}
              </div>
            ),
          )}
          {busy ? (
            <div className="ai-chat-message assistant thinking" role="status">
              <BrandIcon size="small" />
              <span className="thinking-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className="sr-only">El asistente está preparando una propuesta…</span>
            </div>
          ) : null}
          <div ref={historyEndRef} />
        </div>
        <div className="ai-chat-composer">
          <label htmlFor="ai-chat-prompt">¿Qué quieres crear?</label>
          <textarea
            id="ai-chat-prompt"
            ref={promptRef}
            value={prompt}
            maxLength={4000}
            placeholder="Escribe una petición…"
            disabled={busy}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void generate();
              }
            }}
          />
          <div>
            <span>Enter para enviar · Shift + Enter para nueva línea</span>
            <button
              className="primary-button"
              type="button"
              disabled={busy || prompt.trim().length < 3}
              onClick={() => void generate()}
            >
              <Sparkles size={15} /> {busy ? "Generando…" : "Enviar"}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function LegalScreen({ kind }: { kind: "privacy" | "terms" }) {
  const privacy = kind === "privacy";
  return (
    <main className="legal-screen">
      <a className="legal-brand" href="/">
        <img className="brand-logo" src={brand.logo} alt={brand.name} />
      </a>
      <article>
        <span className="eyebrow">Información legal</span>
        <h1>{privacy ? "Política de privacidad" : "Términos de servicio"}</h1>
        <p className="legal-updated">Última actualización: 22 de octubre de 2026</p>
        {privacy ? (
          <>
            <h2>Qué información tratamos</h2>
            <p>
              KnowCanvas usa tu cuenta Google para identificarte. Conservamos en Cloudflare D1 los
              datos necesarios para prestar el servicio: identidad básica, libros, carpetas,
              lienzos, widgets, preferencias y referencias de recursos.
            </p>
            <h2>Archivos en Google Drive</h2>
            <p>
              Las imágenes que subes se guardan en tu Google Drive. KnowCanvas solicita el permiso
              limitado <code>drive.file</code>, que permite gestionar únicamente los archivos
              creados por la propia aplicación. No solicitamos acceso general a tu Drive, Gmail ni
              otros productos de Google.
            </p>
            <h2>Credenciales y seguridad</h2>
            <p>
              Los tokens necesarios para mantener la conexión con Drive se cifran antes de
              almacenarse. No vendemos tus datos ni los usamos para publicidad. Solo los compartimos
              con los proveedores técnicos imprescindibles para operar KnowCanvas.
            </p>
            <h2>Funciones de inteligencia artificial</h2>
            <p>
              Si decides configurar una API key de OpenAI, KnowCanvas la valida con OpenAI y la
              almacena cifrada. Solo se utilizará cuando solicites expresamente una generación. El
              contenido que envíes al asistente se procesará conforme a las condiciones y política
              de privacidad de tu propia cuenta de OpenAI. Puedes eliminar la clave en cualquier
              momento desde Configuración personal.
            </p>
            <h2>Uso limitado de datos de Google</h2>
            <p>
              El uso y la transferencia a otras aplicaciones de la información recibida de las APIs
              de Google cumple la
              <a href="https://developers.google.com/terms/api-services-user-data-policy">
                {" "}
                Política de datos de usuario de los servicios API de Google
              </a>
              , incluidos sus requisitos de uso limitado.
            </p>
            <h2>Control y eliminación</h2>
            <p>
              Puedes revocar el acceso de KnowCanvas desde la seguridad de tu cuenta Google. Para
              solicitar acceso, rectificación o eliminación de tus datos, utiliza el canal de
              soporte indicado en el repositorio oficial de KnowCanvas.
            </p>
          </>
        ) : (
          <>
            <h2>Uso del servicio</h2>
            <p>
              KnowCanvas es una herramienta para crear y organizar experiencias de conocimiento.
              Debes utilizarla de forma lícita y conservar los derechos necesarios sobre el
              contenido que incorporas.
            </p>
            <h2>Tu contenido</h2>
            <p>
              Mantienes la titularidad de tu contenido. Nos autorizas únicamente a procesarlo en la
              medida necesaria para guardar, mostrar y operar tus libros y lienzos.
            </p>
            <h2>Disponibilidad</h2>
            <p>
              El servicio se encuentra en evolución. Podemos modificar funciones o interrumpir
              temporalmente el acceso por mantenimiento, seguridad o causas técnicas.
            </p>
            <h2>Contacto</h2>
            <p>
              Para consultas sobre estos términos, utiliza el canal de soporte indicado en el
              repositorio oficial de KnowCanvas.
            </p>
          </>
        )}
      </article>
      <nav aria-label="Enlaces legales">
        <a href="/">Inicio</a>
        <a href="/privacy">Privacidad</a>
        <a href="/terms">Términos</a>
      </nav>
    </main>
  );
}

function Application() {
  const publicProjectId = (() => {
    const match = /^\/read\/([^/]+)\/?$/u.exec(window.location.pathname);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  })();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authConfigured, setAuthConfigured] = useState(false);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [selectedCanvasId, setSelectedCanvasId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<WorkspaceMode>("edit");
  const [studyLayout, setStudyLayout] = useState<StudyLayout>("outline");
  const [projectSettingsOpen, setProjectSettingsOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiAssistantSeed, setAiAssistantSeed] = useState("");
  const [projectOverviewSelected, setProjectOverviewSelected] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [navigationCollapsed, setNavigationCollapsed] = useState(() => {
    try {
      return localStorage.getItem(NAVIGATION_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [inspectorWidth, setInspectorWidth] = useState(() => {
    try {
      return Math.min(480, Math.max(280, Number(localStorage.getItem(INSPECTOR_WIDTH_KEY)) || 340));
    } catch {
      return 340;
    }
  });
  const [selectedWidget, setSelectedWidget] = useState<SelectedWidget | null>(null);
  const [multiSelection, setMultiSelection] = useState<MultiSelectionInfo | null>(null);
  const [selectedEmbeddedImage, setSelectedEmbeddedImage] = useState<SelectedEmbeddedImage | null>(
    null,
  );
  const [newNodeToRename, setNewNodeToRename] = useState<string | null>(null);
  const frameUpdater = useRef<(widgetId: string, frame: WidgetFrame) => void>(() => undefined);
  const widgetUpdater = useRef<(widget: Widget) => void>(() => undefined);
  const embeddedImageUpdater = useRef<(parentWidgetId: string, image: EmbeddedImageData) => void>(
    () => undefined,
  );
  const widgetAdder = useRef<(type: InsertableWidgetType, preset?: WidgetPresetId) => void>(
    () => undefined,
  );
  const aiProposalApplier = useRef<(proposal: AiProposal) => Promise<void>>(async () => undefined);
  const multiSelectionActions = useRef<MultiSelectionActions>({
    arrange: () => undefined,
    duplicate: () => undefined,
    remove: () => undefined,
    toggleGroup: () => undefined,
  });
  const aiAssistantTrigger = useRef<HTMLButtonElement>(null);

  function hasOpenInternalEditor() {
    return !!document.querySelector(
      '.composition-editor:is([data-interaction-mode="object"], [data-interaction-mode="tool"])',
    );
  }

  useEffect(() => {
    try {
      localStorage.setItem(NAVIGATION_COLLAPSED_KEY, String(navigationCollapsed));
      localStorage.setItem(INSPECTOR_WIDTH_KEY, String(inspectorWidth));
    } catch {
      // La preferencia visual puede fallar sin afectar al documento.
    }
  }, [navigationCollapsed, inspectorWidth]);

  useEffect(() => {
    void (async () => {
      try {
        if (publicProjectId) {
          const detail = await api.getPublicProject(publicProjectId);
          setProject(detail);
          setMode("study");
          setStudyLayout(detail.settings.viewerTemplate);
          setSelectedCanvasId(
            detail.nodes.find((node) => node.kind === "canvas")?.canvasId ?? null,
          );
          return;
        }
        const session = await api.me();
        setUser(session.user);
        setAuthConfigured(session.authConfigured);
        if (session.user) setProjects(await api.listProjects());
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudo iniciar KnowCanvas.");
      } finally {
        setLoading(false);
      }
    })();
  }, [publicProjectId]);

  async function openProject(id: string) {
    setLoading(true);
    setError(null);
    try {
      const detail = await api.getProject(id);
      setProject(detail);
      setMode(detail.canEdit ? "edit" : "study");
      setProjectOverviewSelected(false);
      setStudyLayout(detail.settings.viewerTemplate);
      setSelectedCanvasId(detail.nodes.find((node) => node.kind === "canvas")?.canvasId ?? null);
      setSelectedWidget(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo abrir el libro.");
    } finally {
      setLoading(false);
    }
  }

  async function createProject() {
    setError(null);
    try {
      const created = await api.createProject("Libro sin título");
      setProjects((current) => [created, ...current]);
      setProject(created);
      setProjectOverviewSelected(true);
      setStudyLayout(created.settings.viewerTemplate);
      setSelectedCanvasId(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear el libro.");
    }
  }

  async function addNode(kind: "container" | "canvas", parentId: string | null = null) {
    if (!project) return;
    const title = kind === "container" ? "Nueva carpeta" : "Nuevo lienzo";
    setError(null);
    try {
      const created = await api.createNode(project.id, {
        kind,
        title,
        parentId,
        projectRevision: project.revision,
      });
      const refreshed = await api.getProject(project.id);
      setProject(refreshed);
      setNewNodeToRename(created.node.id);
      if (kind === "canvas" && created.node.canvasId) setSelectedCanvasId(created.node.canvasId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo añadir el elemento.");
    }
  }

  async function renameNode(nodeId: string, title: string) {
    if (!project) return;
    try {
      await api.renameNode(nodeId, title, project.revision);
      setProject(await api.getProject(project.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo renombrar el elemento.");
    }
  }

  async function deleteNode(nodeId: string) {
    if (!project) return;
    try {
      await api.deleteNode(nodeId, project.revision);
      const refreshed = await api.getProject(project.id);
      setProject(refreshed);
      if (!refreshed.nodes.some((node) => node.canvasId === selectedCanvasId)) {
        setSelectedCanvasId(
          refreshed.nodes.find((node) => node.kind === "canvas")?.canvasId ?? null,
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar el elemento.");
    }
  }

  async function moveNode(nodeId: string, parentId: string | null, requestedPosition?: number) {
    if (!project) return;
    const position =
      requestedPosition ??
      project.nodes.filter((node) => node.parentId === parentId && node.id !== nodeId).length;
    try {
      await api.moveNode(nodeId, parentId, position, project.revision);
      setProject(await api.getProject(project.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo mover el elemento.");
    }
  }

  async function signOut() {
    await api.logout();
    setAccountOpen(false);
    setUser(null);
    setProject(null);
    setProjects([]);
  }

  async function saveCanvas(canvasId: string, composition: CanvasComposition, revision: number) {
    setError(null);
    try {
      const updated = await api.updateCanvas(canvasId, composition, revision);
      setProject((current) =>
        current
          ? {
              ...current,
              canvases: current.canvases.map((canvas) =>
                canvas.id === updated.id ? updated : canvas,
              ),
            }
          : current,
      );
      return updated;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el lienzo.");
      throw cause;
    }
  }

  async function saveProjectProperties(input: {
    name: string;
    description: string;
    viewerTemplate: ProjectViewerTemplate;
    theme: ProjectTheme;
    accessLevel: ProjectAccessLevel;
  }) {
    if (!project) return;
    setError(null);
    try {
      await api.updateProject(project.id, {
        name: input.name,
        description: input.description,
        settings: { viewerTemplate: input.viewerTemplate, theme: input.theme },
        accessLevel: input.accessLevel,
        revision: project.revision,
      });
      const refreshed = await api.getProject(project.id);
      setProject(refreshed);
      setStudyLayout(refreshed.settings.viewerTemplate);
      setProjects((current) =>
        current.map((item) =>
          item.id === refreshed.id
            ? {
                id: refreshed.id,
                name: refreshed.name,
                description: refreshed.description,
                accessLevel: refreshed.accessLevel,
                ownerId: refreshed.ownerId,
                ownerName: refreshed.ownerName,
                isOwner: refreshed.isOwner,
                canEdit: refreshed.canEdit,
                revision: refreshed.revision,
                createdAt: refreshed.createdAt,
                updatedAt: refreshed.updatedAt,
              }
            : item,
        ),
      );
      setProjectSettingsOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron guardar las propiedades.");
      throw cause;
    }
  }

  if (loading) return <LoadingScreen />;
  if (!user && !publicProjectId)
    return <LoginScreen authConfigured={authConfigured} error={error} />;
  if (!project && publicProjectId) {
    return (
      <div className="loading-screen" role="alert">
        <p>{error ?? "Este libro público no está disponible."}</p>
        <a className="primary-button" href="/">
          Ir a KnowCanvas
        </a>
      </div>
    );
  }
  if (!project && user) {
    return (
      <>
        <LibraryScreen
          user={user}
          projects={projects}
          error={error}
          onOpen={(id) => void openProject(id)}
          onCreate={() => void createProject()}
          onOpenAccount={() => setAccountOpen(true)}
          onLogout={() => void signOut()}
        />
        {accountOpen ? (
          <AccountAiDialog
            user={user}
            onClose={() => setAccountOpen(false)}
            onLogout={() => void signOut()}
          />
        ) : null}
      </>
    );
  }
  if (!project) return null;

  const selectedCanvas = project.canvases.find((canvas) => canvas.id === selectedCanvasId) ?? null;
  const studyPages = buildStudyPages(project.nodes);
  const studyPageIndex = studyPages.findIndex((page) => page.canvasId === selectedCanvasId);
  const previousStudyPage = studyPageIndex > 0 ? (studyPages[studyPageIndex - 1] ?? null) : null;
  const nextStudyPage =
    studyPageIndex >= 0 && studyPageIndex < studyPages.length - 1
      ? (studyPages[studyPageIndex + 1] ?? null)
      : null;

  const selectStudyPage = (canvasId: string) => {
    setSelectedCanvasId(canvasId);
    setSelectedWidget(null);
    setSelectedEmbeddedImage(null);
    window.history.replaceState(null, "", `#canvas=${encodeURIComponent(canvasId)}`);
  };

  return (
    <div
      className="app-shell"
      onClick={(event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const link = target.closest("a[href^='#canvas=']");
        if (!link) return;
        const canvasId = link.getAttribute("href")?.slice("#canvas=".length);
        if (!canvasId || !project.canvases.some((canvas) => canvas.id === canvasId)) return;
        event.preventDefault();
        setSelectedCanvasId(canvasId);
        setSelectedWidget(null);
      }}
    >
      <a className="skip-link" href="#canvas-main">
        Saltar al lienzo
      </a>
      {error ? (
        <div className="global-error" role="alert">
          {error}
        </div>
      ) : null}
      <header className="topbar">
        <div className="brand-block">
          <button
            className="icon-button mobile-only"
            type="button"
            aria-label={mode === "study" ? "Abrir índice" : "Abrir explorador"}
            onClick={() => {
              if (mode === "study") setStudyLayout("outline");
              setNavigationOpen(true);
            }}
          >
            <Menu size={19} />
          </button>
          <img className="brand-logo" src={brand.logo} alt={brand.name} />
          <p>{brand.tagline}</p>
        </div>

        <div className="project-identity">
          <div>
            <span className="eyebrow">Libro</span>
            <span className="project-name">{project.name}</span>
            {!project.isOwner ? (
              <span className="eyebrow">{project.canEdit ? "Colaborativo" : "Solo lectura"}</span>
            ) : null}
          </div>
          {project.isOwner ? (
            <button
              className="project-settings-trigger"
              type="button"
              aria-label="Propiedades del libro"
              title="Propiedades del libro"
              onClick={() => setProjectSettingsOpen(true)}
            >
              <Settings2 size={15} />
              <span>Propiedades</span>
            </button>
          ) : null}
        </div>

        <div className="topbar-actions">
          <div className="save-state" aria-label="Cambios sincronizados">
            <Cloud size={15} />
            <span>Sincronizado</span>
          </div>
          {project.canEdit ? (
            <div className="mode-switch" aria-label="Modo de trabajo">
              <button
                type="button"
                className={mode === "edit" ? "active" : ""}
                aria-pressed={mode === "edit"}
                onClick={() => {
                  setMode("edit");
                  setSelectedWidget(null);
                }}
              >
                <MousePointer2 size={15} />
                Editar
              </button>
              <button
                type="button"
                className={mode === "study" ? "active" : ""}
                aria-pressed={mode === "study"}
                onClick={() => {
                  setMode("study");
                  setStudyLayout(project.settings.viewerTemplate);
                  setSelectedWidget(null);
                  setSelectedEmbeddedImage(null);
                  setPropertiesOpen(false);
                }}
              >
                <BookOpen size={15} />
                Estudiar
              </button>
            </div>
          ) : null}
          {project.isOwner ? (
            <button className="publish-button" type="button" onClick={() => setPublishOpen(true)}>
              <Share2 size={16} />
              Publicar
            </button>
          ) : null}
          {user ? <AccountTrigger user={user} onOpen={() => setAccountOpen(true)} /> : null}
          {project.isOwner ? (
            <button
              className="icon-button mobile-only"
              type="button"
              aria-label="Propiedades del libro"
              onClick={() => setProjectSettingsOpen(true)}
            >
              <Settings2 size={18} />
            </button>
          ) : null}
          {mode === "edit" ? (
            <button
              className="icon-button mobile-only"
              type="button"
              aria-label="Abrir propiedades"
              onClick={() => setPropertiesOpen(true)}
            >
              <PanelRightOpen size={19} />
            </button>
          ) : null}
        </div>
      </header>

      <div
        className={`workspace ${navigationCollapsed ? "navigation-collapsed" : ""} ${propertiesOpen ? "properties-open" : "properties-closed"} ${mode === "study" ? `study-workspace study-${studyLayout} theme-${project.settings.theme}` : ""}`}
        style={{ "--inspector-width": `${inspectorWidth}px` } as CSSProperties}
      >
        {mode === "edit" ? (
          <ExplorerPanel
            project={project}
            selectedCanvasId={selectedCanvasId}
            projectSelected={projectOverviewSelected}
            open={navigationOpen}
            onClose={() => setNavigationOpen(false)}
            onBack={() => {
              if (hasOpenInternalEditor()) return;
              setProject(null);
            }}
            onSelectProject={() => {
              if (hasOpenInternalEditor()) return;
              setProjectOverviewSelected(true);
              setSelectedCanvasId(null);
              setSelectedWidget(null);
              setSelectedEmbeddedImage(null);
              setPropertiesOpen(true);
              setNavigationOpen(false);
            }}
            onSelect={(canvasId) => {
              if (hasOpenInternalEditor()) return;
              setSelectedCanvasId(canvasId);
              setProjectOverviewSelected(false);
              setSelectedWidget(null);
              setSelectedEmbeddedImage(null);
            }}
            onAdd={(kind, parentId) => void addNode(kind, parentId)}
            onRename={(nodeId, title) => void renameNode(nodeId, title)}
            onDelete={(nodeId) => void deleteNode(nodeId)}
            onMove={(nodeId, parentId, position) => void moveNode(nodeId, parentId, position)}
            nodeToRename={newNodeToRename}
            onNodeRenameStarted={() => setNewNodeToRename(null)}
            collapsed={navigationCollapsed}
            onToggleCollapsed={() => setNavigationCollapsed((value) => !value)}
          />
        ) : studyLayout === "outline" ? (
          <StudyOutline
            projectName={project.name}
            nodes={project.nodes}
            pages={studyPages}
            selectedCanvasId={selectedCanvasId}
            open={navigationOpen}
            onClose={() => setNavigationOpen(false)}
            onBack={() => {
              if (publicProjectId) window.location.assign("/");
              else setProject(null);
            }}
            onSelect={selectStudyPage}
          />
        ) : null}
        {mode === "edit" && projectOverviewSelected ? (
          <ProjectOverview
            project={project}
            pages={studyPages}
            onOpenCanvas={(canvasId) => {
              setProjectOverviewSelected(false);
              setSelectedCanvasId(canvasId);
              setSelectedWidget(null);
              setSelectedEmbeddedImage(null);
            }}
          />
        ) : (
          <CanvasPanel
            mode={mode}
            studyLayout={studyLayout}
            onStudyLayoutChange={setStudyLayout}
            studyPosition={studyPageIndex >= 0 ? studyPageIndex + 1 : 0}
            studyTotal={studyPages.length}
            previousStudyPage={previousStudyPage}
            nextStudyPage={nextStudyPage}
            onStudyNavigate={selectStudyPage}
            canvas={selectedCanvas}
            internalPages={project.nodes
              .filter((node) => node.kind === "canvas" && node.canvasId)
              .map((node) => ({ id: node.canvasId as string, title: node.title }))}
            onSave={saveCanvas}
            selectedWidgetId={selectedWidget?.widget.id ?? null}
            onSelectWidget={(selection) => {
              setSelectedWidget(selection);
              setPropertiesOpen(true);
            }}
            onClearSelection={() => {
              setSelectedWidget(null);
              setSelectedEmbeddedImage(null);
              setPropertiesOpen(false);
            }}
            onSelectCanvas={() => {
              setSelectedWidget(null);
              setSelectedEmbeddedImage(null);
              setPropertiesOpen(true);
            }}
            onPlacementStarted={() => {
              if (window.matchMedia("(max-width: 820px)").matches) setPropertiesOpen(false);
            }}
            onSelectEmbeddedImage={(selection) => {
              setSelectedEmbeddedImage(selection);
              if (selection) setPropertiesOpen(true);
            }}
            frameUpdater={frameUpdater}
            widgetUpdater={widgetUpdater}
            embeddedImageUpdater={embeddedImageUpdater}
            widgetAdder={widgetAdder}
            aiProposalApplier={aiProposalApplier}
            multiSelectionActions={multiSelectionActions}
            onMultiSelectionChange={setMultiSelection}
          />
        )}
        {mode === "edit" && propertiesOpen ? (
          <button
            className="properties-resizer desktop-only"
            type="button"
            aria-label="Redimensionar panel de propiedades"
            onPointerDown={(event) => {
              event.preventDefault();
              const startX = event.clientX;
              const startWidth = inspectorWidth;
              const target = event.currentTarget;
              target.setPointerCapture(event.pointerId);
              target.onpointermove = (moveEvent) =>
                setInspectorWidth(
                  Math.min(480, Math.max(280, startWidth + startX - moveEvent.clientX)),
                );
              target.onpointerup = () => {
                target.onpointermove = null;
                target.onpointerup = null;
              };
            }}
          />
        ) : null}
        {mode === "edit" ? (
          <PropertiesPanel
            project={project}
            projectSelected={projectOverviewSelected}
            onProjectSave={saveProjectProperties}
            canvasTitle={selectedCanvas?.title ?? null}
            internalPages={project.nodes
              .filter((node) => node.kind === "canvas" && node.canvasId)
              .map((node) => ({ id: node.canvasId as string, title: node.title }))}
            selectedWidget={selectedWidget}
            multiSelection={multiSelection}
            selectedEmbeddedImage={selectedEmbeddedImage}
            onFrameChange={(frame) => {
              if (!selectedWidget) return;
              frameUpdater.current(selectedWidget.widget.id, frame);
            }}
            onWidgetChange={(widget) => widgetUpdater.current(widget)}
            onEmbeddedImageChange={(image) => {
              if (!selectedEmbeddedImage) return;
              embeddedImageUpdater.current(selectedEmbeddedImage.parentWidgetId, image);
              setSelectedEmbeddedImage({ ...selectedEmbeddedImage, image });
            }}
            canInsert={mode === "edit" && !!selectedCanvas}
            onAddWidget={(type, preset) => widgetAdder.current(type, preset)}
            onOpenAi={(intent) => {
              setAiAssistantSeed(aiCreationPrompts[intent]);
              setAiAssistantOpen(true);
              if (window.matchMedia("(max-width: 820px)").matches) setPropertiesOpen(false);
            }}
            open={propertiesOpen}
            onClose={() => setPropertiesOpen(false)}
          />
        ) : null}
      </div>
      {projectSettingsOpen ? (
        <ProjectSettingsDialog
          project={project}
          onDismiss={() => setProjectSettingsOpen(false)}
          onSave={saveProjectProperties}
        />
      ) : null}
      {publishOpen ? (
        <PublishDialog project={project} onDismiss={() => setPublishOpen(false)} />
      ) : null}
      {accountOpen && user ? (
        <AccountAiDialog
          user={user}
          onClose={() => setAccountOpen(false)}
          onLogout={() => void signOut()}
        />
      ) : null}
      {project.canEdit && mode === "edit" && selectedCanvas ? (
        <AiAssistantDialog
          key={selectedCanvas.id}
          open={aiAssistantOpen}
          initialPrompt={aiAssistantSeed}
          canvasTitle={selectedCanvas.title}
          pages={project.nodes.flatMap((node) =>
            node.canvasId ? [{ id: node.canvasId, title: node.title }] : [],
          )}
          onApply={async (proposal) => {
            await aiProposalApplier.current(proposal);
            setAiAssistantOpen(false);
          }}
          onClose={() => {
            setAiAssistantOpen(false);
            requestAnimationFrame(() => aiAssistantTrigger.current?.focus());
          }}
        />
      ) : null}
      {project.canEdit && mode === "edit" && selectedCanvas && !aiAssistantOpen ? (
        <button
          ref={aiAssistantTrigger}
          className="ai-assistant-bubble"
          type="button"
          aria-label="Abrir Asistente IA"
          onClick={() => {
            setAiAssistantSeed("");
            setAiAssistantOpen(true);
          }}
        >
          <Sparkles size={21} aria-hidden="true" />
          <span>IA</span>
        </button>
      ) : null}
    </div>
  );
}

export function App() {
  if (window.location.pathname === "/privacy") return <LegalScreen kind="privacy" />;
  if (window.location.pathname === "/terms") return <LegalScreen kind="terms" />;
  return <Application />;
}

const viewerTemplates: Array<{
  id: ProjectViewerTemplate;
  name: string;
  description: string;
  icon: typeof BookOpen;
}> = [
  {
    id: "outline",
    name: "Árbol + hoja",
    description: "Índice visible para explorar una estructura con ramas.",
    icon: Network,
  },
  {
    id: "reader",
    name: "Lectura",
    description: "Recorrido lineal y cómodo para texto largo.",
    icon: BookOpen,
  },
  {
    id: "magazine",
    name: "Revista",
    description: "Composición visual adaptable para texto e imágenes.",
    icon: LayoutGrid,
  },
  {
    id: "presentation",
    name: "Presentación",
    description: "Formato amplio y concentrado para exposición o aula.",
    icon: Maximize2,
  },
];

const projectThemes: Array<{
  id: ProjectTheme;
  name: string;
  description: string;
  colors: readonly [string, string, string];
}> = [
  {
    id: "minimal",
    name: "Minimal",
    description: "Neutral, luminoso y centrado en el contenido.",
    colors: ["#ffffff", "#f5f5f7", "#5b5bd6"],
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "Cálido, tipográfico y apropiado para lectura larga.",
    colors: ["#fffdf8", "#f2eadf", "#9a4f2d"],
  },
  {
    id: "classroom",
    name: "Aula",
    description: "Claro, dinámico y pensado para contenido educativo.",
    colors: ["#ffffff", "#eef4ff", "#2457d6"],
  },
  {
    id: "nature",
    name: "Naturaleza",
    description: "Sereno, orgánico y con acentos verdes contenidos.",
    colors: ["#fbfdf9", "#eaf2e6", "#39704a"],
  },
  {
    id: "night",
    name: "Nocturno",
    description: "Oscuro y contrastado para presentaciones inmersivas.",
    colors: ["#17181c", "#24262d", "#8ea7ff"],
  },
];

function ProjectSettingsDialog({
  project,
  onDismiss,
  onSave,
}: {
  project: ProjectDetail;
  onDismiss: () => void;
  onSave: (input: {
    name: string;
    description: string;
    viewerTemplate: ProjectViewerTemplate;
    theme: ProjectTheme;
    accessLevel: ProjectAccessLevel;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [viewerTemplate, setViewerTemplate] = useState<ProjectViewerTemplate>(
    project.settings.viewerTemplate,
  );
  const [theme, setTheme] = useState<ProjectTheme>(project.settings.theme);
  const [accessLevel, setAccessLevel] = useState<ProjectAccessLevel>(project.accessLevel);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  return (
    <Dialog
      className="project-settings-dialog"
      labelledBy="project-settings-title"
      onDismiss={onDismiss}
    >
      <header>
        <div>
          <span className="eyebrow">Configuración del libro</span>
          <h2 id="project-settings-title">Propiedades</h2>
        </div>
        <button className="icon-button" type="button" onClick={onDismiss} aria-label="Cerrar">
          <X size={18} />
        </button>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim() || saving) return;
          setSaving(true);
          setSaveError(null);
          void onSave({
            name: name.trim(),
            description: description.trim(),
            viewerTemplate,
            theme,
            accessLevel,
          })
            .catch((cause: unknown) => {
              setSaveError(cause instanceof Error ? cause.message : "No se pudo guardar.");
            })
            .finally(() => setSaving(false));
        }}
      >
        <section className="project-settings-section" aria-labelledby="project-general-heading">
          <div>
            <h3 id="project-general-heading">Información general</h3>
            <p>Identidad y descripción del proyecto.</p>
          </div>
          <div className="project-settings-fields">
            <label>
              <span>Nombre</span>
              <input
                data-autofocus
                value={name}
                maxLength={120}
                required
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label>
              <span>Descripción</span>
              <textarea
                value={description}
                maxLength={1000}
                rows={3}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="project-settings-section" aria-labelledby="project-access-heading">
          <div>
            <h3 id="project-access-heading">Acceso y colaboración</h3>
            <p>Decide quién puede descubrir, consultar o modificar este libro.</p>
          </div>
          <label className="property-field">
            Visibilidad
            <select
              value={accessLevel}
              onChange={(event) => setAccessLevel(event.target.value as ProjectAccessLevel)}
            >
              <option value="private">Privado — solo yo</option>
              <option value="public_read">Público — solo lectura</option>
              <option value="public_edit">Público — edición colaborativa</option>
            </select>
          </label>
        </section>

        <section className="project-settings-section" aria-labelledby="project-viewer-heading">
          <div>
            <h3 id="project-viewer-heading">Plantilla del visor</h3>
            <p>Se aplicará al estudiar y al exportar el libro como HTML.</p>
          </div>
          <fieldset className="viewer-template-grid">
            <legend className="sr-only">Selecciona la plantilla predeterminada</legend>
            {viewerTemplates.map(({ id, name: templateName, description: copy, icon: Icon }) => (
              <label key={id} className={viewerTemplate === id ? "selected" : ""}>
                <input
                  type="radio"
                  name="viewer-template"
                  value={id}
                  checked={viewerTemplate === id}
                  onChange={() => setViewerTemplate(id)}
                />
                <Icon size={19} aria-hidden="true" />
                <span>
                  <strong>{templateName}</strong>
                  <small>{copy}</small>
                </span>
              </label>
            ))}
          </fieldset>
        </section>

        <section className="project-settings-section" aria-labelledby="project-theme-heading">
          <div>
            <h3 id="project-theme-heading">Tema visual</h3>
            <p>Define la identidad del libro en Estudiar y en las exportaciones.</p>
          </div>
          <fieldset className="project-theme-grid">
            <legend className="sr-only">Selecciona el tema visual</legend>
            {projectThemes.map((option) => (
              <label key={option.id} className={theme === option.id ? "selected" : ""}>
                <input
                  type="radio"
                  name="project-theme"
                  value={option.id}
                  checked={theme === option.id}
                  onChange={() => setTheme(option.id)}
                />
                <span className="theme-swatches" aria-hidden="true">
                  {option.colors.map((color) => (
                    <i key={color} style={{ backgroundColor: color }} />
                  ))}
                </span>
                <span>
                  <strong>{option.name}</strong>
                  <small>{option.description}</small>
                </span>
              </label>
            ))}
          </fieldset>
        </section>

        {saveError ? (
          <p className="project-settings-error" role="alert">
            {saveError}
          </p>
        ) : null}
        <footer>
          <button className="secondary-button" type="button" onClick={onDismiss}>
            Cancelar
          </button>
          <button className="primary-button" type="submit" disabled={!name.trim() || saving}>
            {saving ? "Guardando…" : "Guardar propiedades"}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}

function PublishDialog({ project, onDismiss }: { project: ProjectDetail; onDismiss: () => void }) {
  const [exportState, setExportState] = useState<ExportFormat | "idle" | "error">("idle");
  const [linkState, setLinkState] = useState<"idle" | "copied" | "error">("idle");
  const publicUrl = `${window.location.origin}/read/${encodeURIComponent(project.id)}`;
  const isPublic = project.accessLevel !== "private";

  async function copyPublicLink() {
    if (!isPublic) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setLinkState("copied");
      window.setTimeout(() => setLinkState("idle"), 2_000);
    } catch {
      setLinkState("error");
    }
  }

  async function downloadExport(format: ExportFormat) {
    if (exportState !== "idle") return;
    setExportState(format);
    try {
      const result = await exportProject(project, format);
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.fileName;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setExportState("idle");
    } catch {
      setExportState("error");
    }
  }

  return (
    <Dialog className="publish-dialog" labelledBy="publish-title" onDismiss={onDismiss}>
      <header>
        <div>
          <span className="eyebrow">Distribuir el libro</span>
          <h2 id="publish-title">Publicar</h2>
        </div>
        <button className="icon-button" type="button" onClick={onDismiss} aria-label="Cerrar">
          <X size={18} />
        </button>
      </header>
      <div className="publish-options" aria-busy={exportState !== "idle"}>
        <button
          className="publish-option"
          type="button"
          disabled={!isPublic}
          onClick={() => void copyPublicLink()}
        >
          <Globe2 size={20} aria-hidden="true" />
          <span>
            <strong>{linkState === "copied" ? "Enlace copiado" : "Copiar enlace público"}</strong>
            <small>
              {isPublic
                ? "Cualquier persona podrá leer el libro sin iniciar sesión."
                : "Cambia el acceso del libro a público desde sus propiedades."}
            </small>
          </span>
          {isPublic ? <Copy size={16} aria-hidden="true" /> : <em>Privado</em>}
        </button>
        {isPublic ? (
          <div className="public-link-row">
            <input
              aria-label="Enlace público"
              value={publicUrl}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
            />
            <a className="secondary-button" href={publicUrl} target="_blank" rel="noreferrer">
              Abrir
            </a>
          </div>
        ) : null}
        {linkState === "error" ? (
          <p className="publish-link-error" role="alert">
            No se pudo copiar. Selecciona el enlace y cópialo manualmente.
          </p>
        ) : null}
        <button
          className="publish-option"
          type="button"
          disabled={exportState !== "idle"}
          onClick={() => void downloadExport("html")}
        >
          <Download size={20} aria-hidden="true" />
          <span>
            <strong>{exportState === "html" ? "Preparando HTML…" : "Descargar HTML"}</strong>
            <small>ZIP autocontenido para cualquier alojamiento web.</small>
          </span>
        </button>
        <button
          className="publish-option"
          type="button"
          disabled={exportState !== "idle"}
          onClick={() => void downloadExport("scorm12")}
        >
          <Package size={20} aria-hidden="true" />
          <span>
            <strong>
              {exportState === "scorm12" ? "Preparando SCORM…" : "Descargar SCORM 1.2"}
            </strong>
            <small>Paquete para Moodle, Canvas y otros LMS compatibles.</small>
          </span>
        </button>
        {exportState === "error" ? (
          <div className="publish-error" role="alert">
            <span>No se pudo crear el paquete. Revisa las imágenes e inténtalo de nuevo.</span>
            <button type="button" onClick={() => setExportState("idle")}>
              Reintentar
            </button>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}

function ProjectPropertiesInspector({
  project,
  onSave,
}: {
  project: ProjectDetail;
  onSave: (input: {
    name: string;
    description: string;
    viewerTemplate: ProjectViewerTemplate;
    theme: ProjectTheme;
    accessLevel: ProjectAccessLevel;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [viewerTemplate, setViewerTemplate] = useState(project.settings.viewerTemplate);
  const [theme, setTheme] = useState<ProjectTheme>(project.settings.theme);
  const [accessLevel, setAccessLevel] = useState<ProjectAccessLevel>(project.accessLevel);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const onSaveRef = useRef(onSave);
  const latestDraftRef = useRef("");

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    setName(project.name);
    setDescription(project.description);
    setViewerTemplate(project.settings.viewerTemplate);
    setTheme(project.settings.theme);
    setAccessLevel(project.accessLevel);
  }, [
    project.accessLevel,
    project.description,
    project.name,
    project.settings.theme,
    project.settings.viewerTemplate,
  ]);

  useEffect(() => {
    setState("idle");
  }, [project.id]);

  const changed =
    name.trim() !== project.name ||
    description.trim() !== project.description ||
    viewerTemplate !== project.settings.viewerTemplate ||
    theme !== project.settings.theme ||
    accessLevel !== project.accessLevel;

  const draftKey = JSON.stringify({
    name: name.trim(),
    description: description.trim(),
    viewerTemplate,
    theme,
    accessLevel,
  });
  latestDraftRef.current = draftKey;

  useEffect(() => {
    if (!changed || !name.trim()) return;

    setState("idle");
    const pendingDraft = draftKey;
    const timer = window.setTimeout(() => {
      setState("saving");
      void onSaveRef
        .current({
          name: name.trim(),
          description: description.trim(),
          viewerTemplate,
          theme,
          accessLevel,
        })
        .then(() => {
          if (latestDraftRef.current === pendingDraft) setState("saved");
        })
        .catch(() => {
          if (latestDraftRef.current === pendingDraft) setState("error");
        });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [accessLevel, changed, description, draftKey, name, theme, viewerTemplate]);

  return (
    <section className="project-properties-inspector" aria-busy={state === "saving"}>
      <div className="properties-heading">
        <span>PROPIEDADES DEL PROYECTO</span>
        <small>Se aplican al libro y a su exportación</small>
      </div>
      <label className="property-field">
        Nombre del proyecto
        <input
          value={name}
          maxLength={120}
          required
          onChange={(event) => setName(event.target.value)}
          aria-invalid={!name.trim()}
        />
      </label>
      <label className="property-field">
        Descripción
        <textarea
          value={description}
          maxLength={1000}
          rows={4}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <label className="property-field">
        Plantilla del visor
        <select
          value={viewerTemplate}
          onChange={(event) => setViewerTemplate(event.target.value as ProjectViewerTemplate)}
        >
          {viewerTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </label>
      <p className="property-help">
        Esta plantilla será la vista inicial al estudiar y la utilizada al exportar como HTML.
      </p>
      <fieldset className="project-theme-compact">
        <legend>Tema visual</legend>
        {projectThemes.map((option) => (
          <label key={option.id} className={theme === option.id ? "selected" : ""}>
            <input
              type="radio"
              name="inspector-project-theme"
              value={option.id}
              checked={theme === option.id}
              onChange={() => setTheme(option.id)}
            />
            <span className="theme-swatches" aria-hidden="true">
              {option.colors.map((color) => (
                <i key={color} style={{ backgroundColor: color }} />
              ))}
            </span>
            <span>{option.name}</span>
          </label>
        ))}
      </fieldset>
      <label className="property-field">
        Acceso
        <select
          value={accessLevel}
          onChange={(event) => setAccessLevel(event.target.value as ProjectAccessLevel)}
        >
          <option value="private">Privado — solo yo</option>
          <option value="public_read">Público — solo lectura</option>
          <option value="public_edit">Público — editable</option>
        </select>
      </label>
      <p className="property-help">
        Los libros colaborativos pueden ser editados por cualquier usuario identificado. Solo tú
        puedes cambiar este permiso.
      </p>
      <div className="project-property-status" role="status" aria-live="polite">
        {!name.trim()
          ? "El proyecto necesita un nombre"
          : state === "saving"
            ? "Guardando cambios…"
            : state === "saved"
              ? "Cambios guardados"
              : state === "error"
                ? "No se pudieron guardar los cambios"
                : changed
                  ? "Cambios pendientes"
                  : ""}
      </div>
    </section>
  );
}

function ProjectOverview({
  project,
  pages,
  onOpenCanvas,
}: {
  project: ProjectDetail;
  pages: readonly StudyPage[];
  onOpenCanvas: (canvasId: string) => void;
}) {
  const canvases = new Map(project.canvases.map((canvas) => [canvas.id, canvas]));

  return (
    <main className="project-overview" id="canvas-main" tabIndex={-1}>
      <header>
        <div>
          <span className="eyebrow">Vista general</span>
          <h2>{project.name}</h2>
          <p>{project.description || "Organiza y revisa todas las páginas de este libro."}</p>
        </div>
        <div className="project-overview-meta" aria-label={`${pages.length} páginas`}>
          <strong>{pages.length}</strong>
          <span>{pages.length === 1 ? "página" : "páginas"}</span>
        </div>
      </header>

      {pages.length > 0 ? (
        <ol className="page-thumbnail-grid" aria-label="Páginas del proyecto">
          {pages.map((page, index) => {
            const canvas = canvases.get(page.canvasId);
            const objects = canvas
              ? canvas.composition.rootIds
                  .map((id) => canvas.composition.objects[id])
                  .filter((item): item is CanvasObject => Boolean(item))
              : [];
            return (
              <li key={page.nodeId}>
                <button type="button" onClick={() => onOpenCanvas(page.canvasId)}>
                  <div className="page-thumbnail" aria-hidden="true">
                    <div className="page-thumbnail-heading" />
                    <div className="page-thumbnail-subheading" />
                    <div className="page-thumbnail-content">
                      {objects
                        .slice(0, 6)
                        .map((object) =>
                          object.type === "image" ? (
                            <img key={object.id} src={object.data.url} alt="" loading="lazy" />
                          ) : (
                            <span
                              key={object.id}
                              className={`page-thumbnail-block ${object.type}`}
                            />
                          ),
                        )}
                      {objects.length === 0 ? <span className="page-thumbnail-empty" /> : null}
                    </div>
                  </div>
                  <span className="page-thumbnail-label">
                    <small>{String(index + 1).padStart(2, "0")}</small>
                    <strong>{page.title}</strong>
                    <ChevronRight size={15} aria-hidden="true" />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="project-overview-empty">
          <FileText size={24} aria-hidden="true" />
          <strong>Este libro todavía no tiene páginas</strong>
          <p>Crea un lienzo desde el explorador para empezar.</p>
        </div>
      )}
    </main>
  );
}

function ExplorerPanel({
  project,
  selectedCanvasId,
  projectSelected,
  open,
  onClose,
  onBack,
  onSelectProject,
  onSelect,
  onAdd,
  onRename,
  onDelete,
  onMove,
  nodeToRename,
  onNodeRenameStarted,
  collapsed,
  onToggleCollapsed,
}: {
  project: ProjectDetail;
  selectedCanvasId: string | null;
  projectSelected: boolean;
  open: boolean;
  onClose: () => void;
  onBack: () => void;
  onSelectProject: () => void;
  onSelect: (canvasId: string) => void;
  onAdd: (kind: "container" | "canvas", parentId: string | null) => void;
  onRename: (nodeId: string, title: string) => void;
  onDelete: (nodeId: string) => void;
  onMove: (nodeId: string, parentId: string | null, position?: number) => void;
  nodeToRename: string | null;
  onNodeRenameStarted: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(() => new Set());
  const [dropTarget, setDropTarget] = useState<{
    nodeId: string;
    mode: "before" | "inside" | "after";
  } | null>(null);
  const [menuNodeId, setMenuNodeId] = useState<string | null>(null);
  const [renamingNodeId, setRenamingNodeId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const nodeMenuTrigger = useRef<HTMLButtonElement | null>(null);
  const rows = useMemo(
    () => flattenTree(project.nodes, collapsedNodes),
    [project.nodes, collapsedNodes],
  );
  const parentNodeIds = useMemo(
    () =>
      new Set(project.nodes.map((node) => node.parentId).filter((id): id is string => Boolean(id))),
    [project.nodes],
  );
  const activeNode = project.nodes.find((node) => node.id === activeNodeId) ?? null;

  useEffect(() => {
    const selectedNode = project.nodes.find((node) => node.canvasId === selectedCanvasId);
    if (selectedNode) setActiveNodeId(selectedNode.id);
  }, [project.nodes, selectedCanvasId]);

  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem(`knowcanvas-collapsed-${project.id}`) ?? "[]",
      ) as string[];
      setCollapsedNodes(new Set(stored));
    } catch {
      setCollapsedNodes(new Set());
    }
  }, [project.id]);

  useEffect(() => {
    try {
      localStorage.setItem(
        `knowcanvas-collapsed-${project.id}`,
        JSON.stringify([...collapsedNodes]),
      );
    } catch {
      // La preferencia del árbol no afecta al contenido.
    }
  }, [collapsedNodes, project.id]);

  function descendantCount(nodeId: string): number {
    const children = project.nodes.filter((node) => node.parentId === nodeId);
    return children.reduce((total, child) => total + 1 + descendantCount(child.id), 0);
  }

  function moveRelative(node: NodeItem, offset: -1 | 1) {
    const siblings = project.nodes
      .filter((candidate) => candidate.parentId === node.parentId)
      .sort((a, b) => a.position - b.position);
    const currentIndex = siblings.findIndex((candidate) => candidate.id === node.id);
    const targetIndex = Math.min(siblings.length - 1, Math.max(0, currentIndex + offset));
    if (targetIndex !== currentIndex) onMove(node.id, node.parentId, targetIndex);
    setMenuNodeId(null);
  }

  useEffect(() => {
    function closeNodeMenu(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".tree-node-menu, .tree-node-menu-button")) return;
      setMenuNodeId(null);
      setConfirmDeleteId(null);
    }
    document.addEventListener("pointerdown", closeNodeMenu, true);
    return () => document.removeEventListener("pointerdown", closeNodeMenu, true);
  }, []);

  useEffect(() => {
    if (!nodeToRename) return;
    const node = project.nodes.find((candidate) => candidate.id === nodeToRename);
    if (!node) return;
    setCollapsedNodes((current) => {
      const next = new Set(current);
      if (node.parentId) next.delete(node.parentId);
      return next;
    });
    startRename(node);
    onNodeRenameStarted();
  }, [nodeToRename, onNodeRenameStarted, project.nodes]);

  function toggleNode(nodeId: string) {
    setCollapsedNodes((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }

  function startRename(node: NodeItem) {
    setRenamingNodeId(node.id);
    setRenameValue(node.title);
    setMenuNodeId(null);
  }

  function finishRename(nodeId: string) {
    const title = renameValue.trim();
    if (title) onRename(nodeId, title);
    setRenamingNodeId(null);
  }
  return (
    <aside
      className={`side-panel explorer ${open ? "mobile-open" : ""} ${collapsed ? "collapsed" : ""}`}
      aria-label="Explorador"
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Estructura</span>
          <h2>Explorador</h2>
        </div>
        <button
          className="icon-button desktop-only"
          type="button"
          aria-label="Volver a la biblioteca"
          title="Volver a la biblioteca"
          onClick={onBack}
        >
          <ArrowLeft size={17} />
        </button>
        <button
          className="icon-button mobile-only"
          type="button"
          aria-label="Cerrar explorador"
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <button
          className="icon-button desktop-only explorer-collapse"
          type="button"
          aria-label={collapsed ? "Expandir explorador" : "Contraer explorador"}
          title={collapsed ? "Expandir explorador" : "Contraer explorador"}
          onClick={onToggleCollapsed}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <label className="search-field">
        <Search size={16} aria-hidden="true" />
        <span className="sr-only">Buscar en el libro</span>
        <input type="search" placeholder="Buscar en el libro" disabled />
      </label>

      <div className="explorer-tree-toolbar" aria-label="Crear en el árbol">
        <button
          className="tree-create-button"
          type="button"
          title={
            activeNode ? `Crear página dentro de ${activeNode.title}` : "Crear página en la raíz"
          }
          onClick={() => onAdd("canvas", activeNode?.id ?? null)}
        >
          <Plus size={16} aria-hidden="true" />
          <span>Nueva página</span>
        </button>
        <button
          className="tree-create-folder"
          type="button"
          aria-label={
            activeNode ? `Crear carpeta dentro de ${activeNode.title}` : "Crear carpeta en la raíz"
          }
          title={
            activeNode ? `Crear carpeta dentro de ${activeNode.title}` : "Crear carpeta en la raíz"
          }
          onClick={() => onAdd("container", activeNode?.id ?? null)}
        >
          <FolderPlus size={16} aria-hidden="true" />
        </button>
      </div>

      <nav className="tree" aria-label="Árbol del proyecto">
        <div
          className={`tree-root ${projectSelected ? "active" : ""}`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const nodeId = event.dataTransfer.getData("application/x-knowcanvas-node");
            if (nodeId) onMove(nodeId, null);
          }}
        >
          <ChevronDown size={15} aria-hidden="true" />
          <button
            className="tree-root-select"
            type="button"
            aria-current={projectSelected ? "page" : undefined}
            onClick={onSelectProject}
          >
            <span className="root-icon">
              <LayoutGrid size={15} />
            </span>
            <strong>{project.name}</strong>
          </button>
        </div>
        {rows.map(({ node, depth }) => (
          <div
            className={`tree-row ${activeNodeId === node.id ? "tree-row-selected" : ""} ${dropTarget?.nodeId === node.id ? `drop-${dropTarget.mode}` : ""}`}
            style={{ "--depth": depth } as CSSProperties}
            key={node.id}
            onContextMenu={(event) => {
              event.preventDefault();
              setActiveNodeId(node.id);
              setConfirmDeleteId(null);
              nodeMenuTrigger.current = event.currentTarget.querySelector(".tree-node-menu-button");
              setMenuNodeId(node.id);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              const bounds = event.currentTarget.getBoundingClientRect();
              const ratio = (event.clientY - bounds.top) / bounds.height;
              setDropTarget({
                nodeId: node.id,
                mode: ratio < 0.25 ? "before" : ratio > 0.75 ? "after" : "inside",
              });
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setDropTarget(null);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const nodeId = event.dataTransfer.getData("application/x-knowcanvas-node");
              const mode = dropTarget?.nodeId === node.id ? dropTarget.mode : "inside";
              setDropTarget(null);
              if (!nodeId || nodeId === node.id) return;
              if (mode === "inside") {
                onMove(nodeId, node.id);
                return;
              }
              const siblings = project.nodes
                .filter(
                  (candidate) => candidate.parentId === node.parentId && candidate.id !== nodeId,
                )
                .sort((a, b) => a.position - b.position);
              const targetIndex = siblings.findIndex((candidate) => candidate.id === node.id);
              onMove(nodeId, node.parentId, targetIndex + (mode === "after" ? 1 : 0));
            }}
          >
            {renamingNodeId === node.id ? (
              <input
                className="tree-rename-input"
                autoFocus
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                onBlur={() => finishRename(node.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") finishRename(node.id);
                  if (event.key === "Escape") setRenamingNodeId(null);
                }}
              />
            ) : (
              <>
                {parentNodeIds.has(node.id) ? (
                  <button
                    className="tree-expand-button"
                    type="button"
                    aria-label={
                      collapsedNodes.has(node.id)
                        ? `Expandir ${node.title}`
                        : `Contraer ${node.title}`
                    }
                    onClick={() => toggleNode(node.id)}
                  >
                    <ChevronDown
                      className={collapsedNodes.has(node.id) ? "collapsed-chevron" : ""}
                      size={14}
                    />
                  </button>
                ) : (
                  <span className="tree-expand-spacer" />
                )}
                <button
                  className={`tree-item ${node.canvasId === selectedCanvasId ? "active" : ""}`}
                  type="button"
                  draggable
                  onDragStart={(event) =>
                    event.dataTransfer.setData("application/x-knowcanvas-node", node.id)
                  }
                  onClick={() => {
                    setMenuNodeId(null);
                    setActiveNodeId(node.id);
                    if (node.kind === "container") toggleNode(node.id);
                    else if (node.canvasId) onSelect(node.canvasId);
                  }}
                  onDoubleClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  aria-current={node.canvasId === selectedCanvasId ? "page" : undefined}
                >
                  {node.kind === "container" ? <Folder size={15} /> : <FileText size={15} />}
                  <span>{node.title}</span>
                </button>
              </>
            )}
            <button
              className="tree-node-menu-button"
              type="button"
              aria-label={`Opciones de ${node.title}`}
              aria-haspopup="menu"
              aria-expanded={menuNodeId === node.id}
              aria-controls={menuNodeId === node.id ? `node-menu-${node.id}` : undefined}
              onClick={(event) => {
                nodeMenuTrigger.current = event.currentTarget;
                setConfirmDeleteId(null);
                setMenuNodeId((current) => (current === node.id ? null : node.id));
              }}
            >
              <MoreHorizontal size={15} />
            </button>
            {menuNodeId === node.id ? (
              <AccessibleMenu
                id={`node-menu-${node.id}`}
                className="tree-node-menu"
                label={`Opciones de ${node.title}`}
                onDismiss={() => {
                  setMenuNodeId(null);
                  setConfirmDeleteId(null);
                }}
                returnFocusRef={nodeMenuTrigger}
              >
                <button type="button" role="menuitem" onClick={() => startRename(node)}>
                  Renombrar
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuNodeId(null);
                    onAdd("canvas", node.id);
                  }}
                >
                  Nuevo lienzo dentro
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuNodeId(null);
                    onAdd("container", node.id);
                  }}
                >
                  Nueva carpeta dentro
                </button>
                <button type="button" role="menuitem" onClick={() => moveRelative(node, -1)}>
                  Mover arriba
                </button>
                <button type="button" role="menuitem" onClick={() => moveRelative(node, 1)}>
                  Mover abajo
                </button>
                {node.parentId ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuNodeId(null);
                      onMove(node.id, null);
                    }}
                  >
                    Mover a la raíz
                  </button>
                ) : null}
                <button
                  className="danger"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    if (confirmDeleteId === node.id) {
                      onDelete(node.id);
                      setMenuNodeId(null);
                      setConfirmDeleteId(null);
                    } else setConfirmDeleteId(node.id);
                  }}
                >
                  {confirmDeleteId === node.id
                    ? `Confirmar: eliminar ${descendantCount(node.id) + 1} elemento${descendantCount(node.id) === 0 ? "" : "s"}`
                    : "Eliminar"}
                </button>
              </AccessibleMenu>
            ) : null}
          </div>
        ))}
      </nav>

      <div className="panel-footer explorer-status">
        <span>{project.nodes.length} elementos · clic derecho para más acciones</span>
      </div>
    </aside>
  );
}

function StudyOutline({
  projectName,
  nodes,
  pages,
  selectedCanvasId,
  open,
  onClose,
  onBack,
  onSelect,
}: {
  projectName: string;
  nodes: readonly NodeItem[];
  pages: readonly StudyPage[];
  selectedCanvasId: string | null;
  open: boolean;
  onClose: () => void;
  onBack: () => void;
  onSelect: (canvasId: string) => void;
}) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  return (
    <aside className={`study-tree-panel ${open ? "open" : ""}`} aria-label="Índice del libro">
      <header>
        <button className="icon-button" type="button" onClick={onBack} aria-label="Volver a libros">
          <ArrowLeft size={17} />
        </button>
        <div>
          <span className="eyebrow">Modo estudio</span>
          <h2>{projectName}</h2>
        </div>
        <button
          className="icon-button mobile-only"
          type="button"
          onClick={onClose}
          aria-label="Cerrar índice"
        >
          <X size={17} />
        </button>
      </header>
      <nav aria-label="Páginas del libro">
        <ol>
          {pages.map((page, index) => {
            const parent = page.parentId ? nodeById.get(page.parentId) : null;
            return (
              <li key={page.nodeId} style={{ "--study-depth": page.depth } as CSSProperties}>
                <button
                  type="button"
                  className={page.canvasId === selectedCanvasId ? "active" : ""}
                  aria-current={page.canvasId === selectedCanvasId ? "page" : undefined}
                  onClick={() => {
                    onSelect(page.canvasId);
                    onClose();
                  }}
                >
                  <span className="study-page-number">{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    {parent ? <small>{parent.title}</small> : null}
                    <strong>{page.title}</strong>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <footer>
        {pages.length} {pages.length === 1 ? "hoja" : "hojas"}
      </footer>
    </aside>
  );
}

function CanvasPanel({
  mode,
  studyLayout,
  onStudyLayoutChange,
  studyPosition,
  studyTotal,
  previousStudyPage,
  nextStudyPage,
  onStudyNavigate,
  canvas,
  internalPages,
  onSave,
  selectedWidgetId,
  onSelectWidget,
  onClearSelection,
  onSelectCanvas,
  onPlacementStarted,
  onSelectEmbeddedImage,
  frameUpdater,
  widgetUpdater,
  embeddedImageUpdater,
  widgetAdder,
  aiProposalApplier,
  multiSelectionActions,
  onMultiSelectionChange,
}: {
  mode: WorkspaceMode;
  studyLayout: StudyLayout;
  onStudyLayoutChange: (layout: StudyLayout) => void;
  studyPosition: number;
  studyTotal: number;
  previousStudyPage: StudyPage | null;
  nextStudyPage: StudyPage | null;
  onStudyNavigate: (canvasId: string) => void;
  canvas: ProjectDetail["canvases"][number] | null;
  internalPages: { id: string; title: string }[];
  onSave: (
    canvasId: string,
    composition: CanvasComposition,
    revision: number,
  ) => Promise<ProjectDetail["canvases"][number]>;
  selectedWidgetId: string | null;
  onSelectWidget: (selection: SelectedWidget) => void;
  onClearSelection: () => void;
  onSelectCanvas: () => void;
  onPlacementStarted: () => void;
  onSelectEmbeddedImage: (selection: SelectedEmbeddedImage | null) => void;
  frameUpdater: MutableRefObject<(widgetId: string, frame: WidgetFrame) => void>;
  widgetUpdater: MutableRefObject<(widget: Widget) => void>;
  embeddedImageUpdater: MutableRefObject<
    (parentWidgetId: string, image: EmbeddedImageData) => void
  >;
  widgetAdder: MutableRefObject<(type: InsertableWidgetType, preset?: WidgetPresetId) => void>;
  aiProposalApplier: MutableRefObject<(proposal: AiProposal) => Promise<void>>;
  multiSelectionActions: MutableRefObject<MultiSelectionActions>;
  onMultiSelectionChange: (selection: MultiSelectionInfo | null) => void;
}) {
  const [draft, setDraft] = useState<CanvasComposition | null>(canvas?.composition ?? null);
  const [revision, setRevision] = useState(canvas?.revision ?? 1);
  const [saveState, setSaveState] = useState<"saved" | "changed" | "saving" | "error">("saved");
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [droppedImage, setDroppedImage] = useState<File | null>(null);
  const [pastedUrl, setPastedUrl] = useState("");
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
  const [toolWidgetId, setToolWidgetId] = useState<string | null>(null);
  const [contentElementWidgetId, setContentElementWidgetId] = useState<string | null>(null);
  const [selectedWidgetIds, setSelectedWidgetIds] = useState<string[]>([]);
  const [groupActionsOpen, setGroupActionsOpen] = useState(false);
  const [insertMenuOpen, setInsertMenuOpen] = useState(false);
  const [insertQuery, setInsertQuery] = useState("");
  const [pendingPlacement, setPendingPlacement] = useState<PendingWidgetPlacement | null>(null);
  const [pendingGroupPlacement, setPendingGroupPlacement] = useState<PendingGroupPlacement | null>(
    null,
  );
  const [placementPoint, setPlacementPoint] = useState<{ x: number; y: number } | null>(null);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [canvasPanning, setCanvasPanning] = useState(false);
  const [marquee, setMarquee] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const canvasScrollRef = useRef<HTMLElement>(null);
  const groupActionsTrigger = useRef<HTMLButtonElement>(null);
  const compositionRef = useRef<HTMLElement>(null);
  const lastCanvasPointer = useRef<{ x: number; y: number } | null>(null);
  const pendingImageFrame = useRef<WidgetFrame | null>(null);
  const spacePressed = useRef(false);
  const panCleanup = useRef<(() => void) | null>(null);
  const marqueeCleanup = useRef<(() => void) | null>(null);
  const undoHistory = useRef<CanvasComposition[]>([]);
  const redoHistory = useRef<CanvasComposition[]>([]);
  const changeVersion = useRef(0);
  const saving = useRef(false);
  const provisionalWidgetIds = useRef(new Set<string>());
  const blockCanvasDoubleClick = useRef(false);
  const [, setHistoryVersion] = useState(0);

  useEffect(() => {
    if (mode !== "study") return;
    const navigateWithKeyboard = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(target.tagName))
      )
        return;
      if ((event.key === "ArrowLeft" || event.key === "PageUp") && previousStudyPage) {
        event.preventDefault();
        onStudyNavigate(previousStudyPage.canvasId);
      }
      if ((event.key === "ArrowRight" || event.key === "PageDown") && nextStudyPage) {
        event.preventDefault();
        onStudyNavigate(nextStudyPage.canvasId);
      }
    };
    window.addEventListener("keydown", navigateWithKeyboard);
    return () => window.removeEventListener("keydown", navigateWithKeyboard);
  }, [mode, nextStudyPage, onStudyNavigate, previousStudyPage]);

  useEffect(() => {
    const composition = canvas?.composition ? removeEmptyTextObjects(canvas.composition) : null;
    setDraft(composition);
    setRevision(canvas?.revision ?? 1);
    setSaveState(composition && composition !== canvas?.composition ? "changed" : "saved");
    setEditingWidgetId(null);
    setToolWidgetId(null);
    setContentElementWidgetId(null);
    onSelectEmbeddedImage(null);
    setSelectedWidgetIds([]);
    setPendingPlacement(null);
    setPendingGroupPlacement(null);
    setPlacementPoint(null);
    setCanvasZoom(1);
    undoHistory.current = [];
    redoHistory.current = [];
    changeVersion.current = 0;
    provisionalWidgetIds.current.clear();
    setHistoryVersion((value) => value + 1);
  }, [canvas?.id]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const editable = target?.matches("input, textarea, [contenteditable='true']");
      if (event.code === "Space" && !event.repeat && !editable) {
        event.preventDefault();
        spacePressed.current = true;
      }
      if (event.key === "Escape" && (pendingPlacement || pendingGroupPlacement)) {
        event.preventDefault();
        setPendingPlacement(null);
        setPendingGroupPlacement(null);
        setPlacementPoint(null);
        return;
      }
      if (!(event.metaKey || event.ctrlKey)) return;
      if (editable) return;
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        changeCanvasZoom(canvasZoom + 0.1);
      } else if (event.key === "-") {
        event.preventDefault();
        changeCanvasZoom(canvasZoom - 0.1);
      } else if (event.key === "0") {
        event.preventDefault();
        fitCanvasContent();
      }
    }
    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") spacePressed.current = false;
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  });

  useEffect(
    () => () => {
      panCleanup.current?.();
      marqueeCleanup.current?.();
    },
    [],
  );

  function clearWidgetSelection() {
    setSelectedWidgetIds([]);
    setContentElementWidgetId(null);
    onSelectEmbeddedImage(null);
    onClearSelection();
  }

  function hasActiveTextSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    const editor =
      range.commonAncestorContainer instanceof Element
        ? range.commonAncestorContainer.closest(".rich-text-input")
        : range.commonAncestorContainer.parentElement?.closest(".rich-text-input");
    return !!editor;
  }

  function selectWidget(
    widget: Widget,
    frame: WidgetFrame,
    additive = false,
    expandPersistentGroup = true,
  ) {
    if (!additive) {
      const groupId = expandPersistentGroup ? draft?.objects[widget.id]?.groupId : undefined;
      setSelectedWidgetIds(
        groupId
          ? widgets
              .filter((candidate) => candidate.groupId === groupId)
              .map((candidate) => candidate.id)
          : [widget.id],
      );
      onSelectWidget({ widget, frame });
      return;
    }
    setSelectedWidgetIds((current) => {
      if (current.includes(widget.id)) {
        const next = current.filter((id) => id !== widget.id);
        if (selectedWidgetId === widget.id) {
          const nextPrimary = next
            .map((id) => draft?.objects[id])
            .find((candidate): candidate is CanvasObject => !!candidate);
          if (nextPrimary) {
            onSelectWidget({
              widget: nextPrimary,
              frame: nextPrimary.frame ?? defaultWidgetFrame(0),
            });
          } else {
            onClearSelection();
          }
        }
        return next;
      }
      onSelectWidget({ widget, frame });
      return [...current, widget.id];
    });
  }

  function selectInsertedWidget(widget: Widget, frame: WidgetFrame) {
    setSelectedWidgetIds([widget.id]);
    onSelectWidget({ widget, frame });
  }

  useEffect(() => {
    if (editingWidgetId && editingWidgetId !== selectedWidgetId) {
      setEditingWidgetId(null);
    }
  }, [editingWidgetId, selectedWidgetId]);

  function mutateDraft(updater: (current: CanvasComposition | null) => CanvasComposition | null) {
    setDraft((current) => {
      const next = updater(current);
      if (!current || !next || next === current) return next;
      undoHistory.current = [...undoHistory.current.slice(-99), structuredClone(current)];
      redoHistory.current = [];
      changeVersion.current += 1;
      setHistoryVersion((value) => value + 1);
      return next;
    });
    setSaveState("changed");
  }

  function undo() {
    const previous = undoHistory.current.at(-1);
    if (!previous || !draft) return;
    undoHistory.current = undoHistory.current.slice(0, -1);
    redoHistory.current = [...redoHistory.current.slice(-99), structuredClone(draft)];
    changeVersion.current += 1;
    setDraft(structuredClone(previous));
    setEditingWidgetId(null);
    clearWidgetSelection();
    setSaveState("changed");
    setHistoryVersion((value) => value + 1);
  }

  function redo() {
    const next = redoHistory.current.at(-1);
    if (!next || !draft) return;
    redoHistory.current = redoHistory.current.slice(0, -1);
    undoHistory.current = [...undoHistory.current.slice(-99), structuredClone(draft)];
    changeVersion.current += 1;
    setDraft(structuredClone(next));
    setEditingWidgetId(null);
    clearWidgetSelection();
    setSaveState("changed");
    setHistoryVersion((value) => value + 1);
  }

  function finishInsertion() {
    setInsertMenuOpen(false);
    setInsertQuery("");
  }

  function appendRootWidget(widget: Widget) {
    const object: CanvasObject = {
      ...widget,
      parentId: null,
      slotId: null,
      order: widgets.length,
    };
    mutateDraft((current) => {
      const composition = current ?? { version: 2 as const, rootIds: [], objects: {} };
      return {
        ...composition,
        rootIds: [...composition.rootIds, object.id],
        objects: { ...composition.objects, [object.id]: object },
      };
    });
    return object;
  }

  function addRichText(frameOverride?: WidgetFrame, empty = false, enterEdit = false) {
    const widget = {
      id: crypto.randomUUID(),
      type: "richText" as const,
      schemaVersion: 2 as const,
      data: {
        document: markdownToDocument(
          empty ? "" : "## Nuevo bloque de texto\n\nEmpieza a desarrollar tu idea.",
        ),
      },
      frame: frameOverride ?? visibleInsertionFrame(),
    };
    if (empty) provisionalWidgetIds.current.add(widget.id);
    const insertedWidget = appendRootWidget(widget);
    setSaveState("changed");
    finishInsertion();
    if (enterEdit) {
      selectInsertedWidget(widget, widget.frame);
      setEditingWidgetId(widget.id);
    } else {
      selectInsertedWidget(
        insertedWidget,
        insertedWidget.frame ?? defaultWidgetFrame(widgets.length),
      );
    }
  }

  function updateWidget(widgetId: string, document: RichTextNode, contentHeight?: number) {
    if (!isRichTextEmpty(documentToMarkdown(document)))
      provisionalWidgetIds.current.delete(widgetId);
    updateWidgetRecord(widgetId, (widget) =>
      widget.type === "richText"
        ? {
            ...widget,
            data: { document },
            frame: {
              ...(widget.frame ?? defaultWidgetFrame(0)),
              ...((widget.frame?.heightMode ?? "auto") === "auto" && contentHeight
                ? { height: Math.max(160, contentHeight), heightMode: "auto" as const }
                : {}),
            },
          }
        : widget,
    );
  }

  function discardEmptyProvisional(widgetId: string | null) {
    if (!widgetId) return;
    const widget = draft?.objects[widgetId];
    if (widget?.type !== "richText" || !isRichTextEmpty(documentToMarkdown(widget.data.document))) {
      provisionalWidgetIds.current.delete(widgetId);
      return;
    }
    provisionalWidgetIds.current.delete(widgetId);
    deleteWidget(widgetId);
  }

  function placementSize(type: InsertableWidgetType) {
    if (type === "pele") return { width: 680, height: 440 };
    if (type === "table") return { width: 620, height: 300 };
    if (type === "diagram") return { width: 520, height: 430 };
    if (type === "navigation") return { width: 620, height: 320 };
    if (type === "quiz") return { width: 560, height: 480 };
    if (type === "sorting") return { width: 640, height: 520 };
    if (type === "accordion") return { width: 560, height: 420 };
    if (type === "tabs") return { width: 600, height: 420 };
    if (type === "flashcards") return { width: 560, height: 430 };
    if (type === "timeline") return { width: 620, height: 520 };
    if (type === "hotspots") return { width: 680, height: 540 };
    return { width: 520, height: 340 };
  }

  function placementLabel(type: InsertableWidgetType, preset: WidgetPresetId = "default") {
    if (type === "timeline" && preset === "process") return "Proceso paso a paso";
    if (type === "table" && preset === "comparison") return "Comparación";
    if (type === "richText") return "Texto enriquecido";
    if (type === "image") return "Imagen";
    if (type === "diagram") return "Diagrama libre";
    if (type === "pele") return "Diagrama Mermaid";
    if (type === "navigation" && preset === "index") return "Menú / índice";
    if (type === "navigation" && preset === "bar") return "Barra de navegación";
    if (type === "navigation") return "Botón de navegación";
    if (type === "quiz") return "Ejercicio tipo test";
    if (type === "sorting" && preset === "order") return "Ordenar";
    if (type === "sorting" && preset === "match") return "Relacionar";
    if (type === "sorting") return "Clasificar";
    if (type === "accordion") return "Acordeón";
    if (type === "tabs") return "Pestañas";
    if (type === "flashcards") return "Tarjetas reversibles";
    if (type === "timeline") return "Línea temporal";
    if (type === "hotspots") return "Imagen interactiva";
    return "Tabla";
  }

  function placementFrame(type: InsertableWidgetType, point: { x: number; y: number }) {
    const size = placementSize(type);
    return {
      ...defaultWidgetFrame(widgets.length),
      ...size,
      x: Math.max(36, Math.round(point.x - size.width / 2)),
      y: Math.max(36, Math.round(point.y - size.height / 2)),
    };
  }

  function startWidgetPlacement(type: InsertableWidgetType, preset: WidgetPresetId = "default") {
    discardEmptyProvisional(editingWidgetId);
    setEditingWidgetId(null);
    setSelectedWidgetIds([]);
    onPlacementStarted();
    finishInsertion();
    setPendingPlacement({ type, preset });
    setPlacementPoint(lastCanvasPointer.current);
  }

  function prepareGroupPlacement(objects: CanvasObject[]) {
    if (objects.length === 0) return;
    const minX = Math.min(...objects.map((object) => object.frame?.x ?? 0));
    const minY = Math.min(...objects.map((object) => object.frame?.y ?? 0));
    const maxX = Math.max(
      ...objects.map((object) => {
        const frame = object.frame ?? defaultWidgetFrame(0);
        return frame.x + frame.width;
      }),
    );
    const maxY = Math.max(
      ...objects.map((object) => {
        const frame = object.frame ?? defaultWidgetFrame(0);
        return frame.y + frame.height;
      }),
    );
    const normalized = objects.map((object, index) => {
      const frame = object.frame ?? defaultWidgetFrame(index);
      return { ...object, frame: { ...frame, x: frame.x - minX, y: frame.y - minY } };
    });
    const width = maxX - minX;
    const height = maxY - minY;
    const scroll = canvasScrollRef.current;
    const nextZoom = scroll
      ? Math.min(
          1,
          Math.max(
            0.5,
            Math.floor(
              Math.min(
                (scroll.clientWidth - 96) / Math.max(1, width),
                (scroll.clientHeight - 140) / Math.max(1, height),
              ) * 10,
            ) / 10,
          ),
        )
      : canvasZoom;
    const center = scroll
      ? {
          x: (scroll.scrollLeft + scroll.clientWidth / 2) / canvasZoom,
          y: (scroll.scrollTop + scroll.clientHeight / 2) / canvasZoom,
        }
      : lastCanvasPointer.current;

    discardEmptyProvisional(editingWidgetId);
    setEditingWidgetId(null);
    clearWidgetSelection();
    onPlacementStarted();
    finishInsertion();
    setPendingPlacement(null);
    setPendingGroupPlacement({ objects: normalized, width, height });
    setCanvasZoom(nextZoom);
    setPlacementPoint(center);
    if (scroll && center) {
      window.requestAnimationFrame(() => {
        scroll.scrollLeft = Math.max(0, center.x * nextZoom - scroll.clientWidth / 2);
        scroll.scrollTop = Math.max(0, center.y * nextZoom - scroll.clientHeight / 2);
      });
    }
  }

  function groupPlacementFrame(placement: PendingGroupPlacement, point: { x: number; y: number }) {
    return {
      x: Math.max(36, Math.round(point.x - placement.width / 2)),
      y: Math.max(36, Math.round(point.y - placement.height / 2)),
      width: placement.width,
      height: placement.height,
    };
  }

  function placePendingGroup(point: { x: number; y: number }) {
    if (!pendingGroupPlacement) return;
    const placement = pendingGroupPlacement;
    const target = groupPlacementFrame(placement, point);
    const objects = placement.objects.map((object, index): CanvasObject => {
      const frame = object.frame ?? defaultWidgetFrame(index);
      return { ...object, frame: { ...frame, x: target.x + frame.x, y: target.y + frame.y } };
    });
    mutateDraft((current) => {
      const composition = current ?? { version: 2 as const, rootIds: [], objects: {} };
      return {
        ...composition,
        rootIds: [...composition.rootIds, ...objects.map((object) => object.id)],
        objects: Object.fromEntries([
          ...Object.entries(composition.objects),
          ...objects.map((object) => [object.id, object]),
        ]),
      };
    });
    const selectedIds = objects.map((object) => object.id);
    setPendingGroupPlacement(null);
    setPlacementPoint(null);
    setSelectedWidgetIds(selectedIds);
    const primary = objects.at(-1);
    if (primary) onSelectWidget({ widget: primary, frame: primary.frame ?? defaultWidgetFrame(0) });
  }

  function placePendingWidget(point: { x: number; y: number }) {
    if (!pendingPlacement) return;
    const { type, preset } = pendingPlacement;
    const frame = placementFrame(type, point);
    setPendingPlacement(null);
    setPlacementPoint(null);
    if (type === "richText") addRichText(frame);
    else if (type === "diagram") addDiagram(frame);
    else if (type === "pele") addPeleDiagram(frame);
    else if (type === "table") addTable(frame, preset);
    else if (type === "navigation") addNavigation(frame, preset);
    else if (type === "quiz") addQuiz(frame, preset);
    else if (type === "sorting") addSorting(frame, preset);
    else if (type === "accordion") addAccordion(frame, preset);
    else if (type === "tabs") addTabs(frame);
    else if (type === "flashcards") addFlashcards(frame);
    else if (type === "timeline") addTimeline(frame, preset);
    else if (type === "hotspots") addHotspots(frame);
    else {
      pendingImageFrame.current = frame;
      setImagePickerOpen(true);
    }
  }

  function addImage(image: SelectedImage) {
    const widget = {
      id: crypto.randomUUID(),
      type: "image" as const,
      schemaVersion: 1 as const,
      data: { ...image, caption: "", fit: "contain" as const },
      frame: pendingImageFrame.current ?? visibleInsertionFrame(),
    };
    const insertedWidget = appendRootWidget(widget);
    setSaveState("changed");
    setImagePickerOpen(false);
    pendingImageFrame.current = null;
    finishInsertion();
    selectInsertedWidget(
      insertedWidget,
      insertedWidget.frame ?? defaultWidgetFrame(widgets.length),
    );
  }

  function addDiagram(frameOverride?: WidgetFrame) {
    const widget = {
      id: crypto.randomUUID(),
      type: "diagram" as const,
      schemaVersion: 1 as const,
      data: { elements: [], appState: {}, files: {} },
      frame: frameOverride ?? visibleInsertionFrame({ height: 430 }),
    };
    const insertedWidget = appendRootWidget(widget);
    setSaveState("changed");
    finishInsertion();
    selectInsertedWidget(
      insertedWidget,
      insertedWidget.frame ?? defaultWidgetFrame(widgets.length),
    );
  }

  function visibleInsertionFrame(overrides: Partial<WidgetFrame> = {}): WidgetFrame {
    const scroll = canvasScrollRef.current;
    const base = defaultWidgetFrame(widgets.length);
    const width = overrides.width ?? base.width;
    const height = overrides.height ?? base.height;
    const pointer = lastCanvasPointer.current;
    if (pointer) {
      return {
        ...base,
        x: Math.max(36, Math.round(pointer.x - width / 2)),
        y: Math.max(36, Math.round(pointer.y - height / 2)),
        ...overrides,
      };
    }
    if (!scroll) return { ...base, ...overrides };

    return {
      ...base,
      x: Math.max(
        36,
        Math.round((scroll.scrollLeft + scroll.clientWidth / 2) / canvasZoom - width / 2),
      ),
      y: Math.max(
        36,
        Math.round((scroll.scrollTop + scroll.clientHeight / 2) / canvasZoom - height / 2),
      ),
      ...overrides,
    };
  }

  function addPeleDiagram(frameOverride?: WidgetFrame) {
    const widget = {
      id: crypto.randomUUID(),
      type: "pele" as const,
      schemaVersion: 1 as const,
      data: {
        source: "flowchart LR\n  A[Idea] --> B[Conexión]\n  B --> C[Conocimiento]",
        caption: "",
      },
      frame: frameOverride ?? visibleInsertionFrame({ width: 680, height: 440 }),
    };
    const insertedWidget = appendRootWidget(widget);
    setSaveState("changed");
    finishInsertion();
    selectInsertedWidget(
      insertedWidget,
      insertedWidget.frame ?? defaultWidgetFrame(widgets.length),
    );
  }

  function addTable(frameOverride?: WidgetFrame, preset: WidgetPresetId = "default") {
    const comparison = preset === "comparison";
    const tableValues = comparison
      ? ["Aspecto", "Opción A", "Opción B", "Definición", "Describe A", "Describe B"]
      : ["Concepto", "Descripción", "Primer elemento", "Explica aquí su significado"];
    const widget = {
      id: crypto.randomUUID(),
      type: "table" as const,
      schemaVersion: 2 as const,
      data: {
        rows: 2,
        columns: comparison ? 3 : 2,
        cells: tableValues.map((text) => ({ id: crypto.randomUUID(), text })),
      },
      frame: frameOverride ?? visibleInsertionFrame({ width: 620, height: 300 }),
    };
    const insertedWidget = appendRootWidget(widget);
    setSaveState("changed");
    finishInsertion();
    selectInsertedWidget(
      insertedWidget,
      insertedWidget.frame ?? defaultWidgetFrame(widgets.length),
    );
  }

  function addNavigation(frameOverride?: WidgetFrame, preset: WidgetPresetId = "default") {
    const firstDestination =
      internalPages.find((page) => page.id !== canvas?.id) ?? internalPages[0];
    const variant = preset === "index" ? "index" : preset === "bar" ? "bar" : "button";
    const items = internalPages.map((page) => ({
      id: crypto.randomUUID(),
      label: page.title,
      canvasId: page.id,
    }));
    const widget = {
      id: crypto.randomUUID(),
      type: "navigation" as const,
      schemaVersion: 1 as const,
      data: {
        label: "Continuar",
        destination: firstDestination
          ? { kind: "canvas" as const, canvasId: firstDestination.id }
          : { kind: "external" as const, url: "https://" },
        style: preset === "secondary" ? ("secondary" as const) : ("primary" as const),
        openInNewTab: false,
        variant: variant as "button" | "index" | "bar",
        title: variant === "index" ? "Contenido" : variant === "bar" ? "Recorrido" : "",
        items,
        showCurrent: true,
      },
      frame:
        frameOverride ??
        visibleInsertionFrame(
          variant === "index"
            ? { width: 520, height: 420 }
            : variant === "bar"
              ? { width: 720, height: 180 }
              : { width: 420, height: 180 },
        ),
    };
    const insertedWidget = appendRootWidget(widget);
    finishInsertion();
    selectInsertedWidget(insertedWidget, widget.frame);
  }

  function addQuiz(frameOverride?: WidgetFrame, preset: WidgetPresetId = "default") {
    const trueFalse = preset === "trueFalse";
    const multiple = preset === "multiple";
    const widget = {
      id: crypto.randomUUID(),
      type: "quiz" as const,
      schemaVersion: 1 as const,
      data: {
        question: trueFalse
          ? "Indica si esta afirmación es verdadera o falsa."
          : multiple
            ? "Selecciona todas las respuestas correctas."
            : "¿Cuál es la respuesta correcta?",
        options: trueFalse
          ? [
              { id: crypto.randomUUID(), label: "Verdadero", correct: true },
              { id: crypto.randomUUID(), label: "Falso", correct: false },
            ]
          : [
              { id: crypto.randomUUID(), label: "Primera opción", correct: true },
              { id: crypto.randomUUID(), label: "Segunda opción", correct: multiple },
              { id: crypto.randomUUID(), label: "Tercera opción", correct: false },
            ],
        explanation: "Explica aquí por qué esta es la respuesta correcta.",
        selectionMode: multiple ? ("multiple" as const) : ("single" as const),
        allowRetry: true,
        showExplanation: true,
      },
      frame: frameOverride ?? visibleInsertionFrame({ width: 560, height: 480 }),
    };
    const insertedWidget = appendRootWidget(widget);
    finishInsertion();
    selectInsertedWidget(insertedWidget, widget.frame);
  }

  function addSorting(frameOverride?: WidgetFrame, preset: WidgetPresetId = "classify") {
    const mode: "classify" | "order" | "match" =
      preset === "order" ? "order" : preset === "match" ? "match" : "classify";
    const firstTargetId = crypto.randomUUID();
    const secondTargetId = crypto.randomUUID();
    const targets =
      mode === "order"
        ? []
        : [
            {
              id: firstTargetId,
              label: mode === "match" ? "Produce energía" : "Estructuras celulares",
            },
            {
              id: secondTargetId,
              label: mode === "match" ? "Contiene el ADN" : "Procesos celulares",
            },
          ];
    const labels =
      mode === "order"
        ? ["Preparar los materiales", "Realizar el procedimiento", "Revisar el resultado"]
        : mode === "match"
          ? ["Mitocondria", "Núcleo"]
          : ["Núcleo", "Mitocondria", "Fotosíntesis", "Respiración celular"];
    const widget = {
      id: crypto.randomUUID(),
      type: "sorting" as const,
      schemaVersion: 1 as const,
      data: {
        title:
          mode === "order"
            ? "Ordena el proceso"
            : mode === "match"
              ? "Relaciona cada concepto"
              : "Clasifica los conceptos",
        prompt:
          mode === "order"
            ? "Coloca los pasos en el orden correcto."
            : mode === "match"
              ? "Selecciona un concepto y después su definición."
              : "Selecciona un concepto y después la categoría a la que pertenece.",
        mode,
        targets,
        items: labels.map((label, index) => ({
          id: crypto.randomUUID(),
          label,
          targetId: mode === "order" ? null : index % 2 === 0 ? firstTargetId : secondTargetId,
        })),
        allowRetry: true,
      },
      frame: frameOverride ?? visibleInsertionFrame({ width: 640, height: 520 }),
    };
    const insertedWidget = appendRootWidget(widget);
    finishInsertion();
    selectInsertedWidget(insertedWidget, widget.frame);
  }

  function addAccordion(frameOverride?: WidgetFrame, preset: WidgetPresetId = "default") {
    const widget = {
      id: crypto.randomUUID(),
      type: "accordion" as const,
      schemaVersion: 2 as const,
      data: {
        title: "Explora el contenido",
        items: [
          {
            id: crypto.randomUUID(),
            title: "Primer apartado",
            content: markdownToDocument(
              "Añade aquí la información que el lector descubrirá al desplegarlo.",
            ),
          },
          {
            id: crypto.randomUUID(),
            title: "Segundo apartado",
            content: markdownToDocument(
              "Organiza el contenido en fragmentos breves y fáciles de explorar.",
            ),
          },
        ],
        allowMultiple: preset === "openMultiple",
      },
      frame: frameOverride ?? visibleInsertionFrame({ width: 560, height: 420 }),
    };
    const insertedWidget = appendRootWidget(widget);
    finishInsertion();
    selectInsertedWidget(insertedWidget, widget.frame);
  }

  function addTabs(frameOverride?: WidgetFrame) {
    const widget = {
      id: crypto.randomUUID(),
      type: "tabs" as const,
      schemaVersion: 1 as const,
      data: {
        title: "Explora por temas",
        items: [
          {
            id: crypto.randomUUID(),
            title: "Idea principal",
            content: markdownToDocument("Presenta aquí el primer concepto."),
          },
          {
            id: crypto.randomUUID(),
            title: "Ejemplo",
            content: markdownToDocument("Amplía la explicación con un ejemplo relacionado."),
          },
        ],
      },
      frame: frameOverride ?? visibleInsertionFrame({ width: 600, height: 420 }),
    };
    const insertedWidget = appendRootWidget(widget);
    finishInsertion();
    selectInsertedWidget(insertedWidget, widget.frame);
  }

  function addFlashcards(frameOverride?: WidgetFrame) {
    const widget = {
      id: crypto.randomUUID(),
      type: "flashcards" as const,
      schemaVersion: 1 as const,
      data: {
        title: "Comprueba lo aprendido",
        cards: [
          {
            id: crypto.randomUUID(),
            front: markdownToDocument("¿Cuál es la idea principal?"),
            back: markdownToDocument("Escribe aquí una respuesta breve y memorable."),
          },
          {
            id: crypto.randomUUID(),
            front: markdownToDocument("¿Cómo se aplica este concepto?"),
            back: markdownToDocument("Añade un ejemplo que conecte la teoría con la práctica."),
          },
        ],
      },
      frame: frameOverride ?? visibleInsertionFrame({ width: 560, height: 430 }),
    };
    const insertedWidget = appendRootWidget(widget);
    finishInsertion();
    selectInsertedWidget(insertedWidget, widget.frame);
  }

  function addTimeline(frameOverride?: WidgetFrame, preset: WidgetPresetId = "default") {
    const process = preset === "process";
    const widget = {
      id: crypto.randomUUID(),
      type: "timeline" as const,
      schemaVersion: 1 as const,
      data: {
        title: process ? "Proceso paso a paso" : "Una historia paso a paso",
        items: [
          {
            id: crypto.randomUUID(),
            date: process ? "Paso 1" : "Inicio",
            title: process ? "Preparación" : "Primer hito",
            content: markdownToDocument(
              process
                ? "Describe qué se necesita antes de comenzar."
                : "Describe qué ocurrió y por qué fue importante.",
            ),
          },
          {
            id: crypto.randomUUID(),
            date: process ? "Paso 2" : "Después",
            title: process ? "Ejecución" : "Segundo hito",
            content: markdownToDocument(
              process
                ? "Explica la acción principal y el resultado esperado."
                : "Conecta este momento con el anterior.",
            ),
          },
        ],
      },
      frame: frameOverride ?? visibleInsertionFrame({ width: 620, height: 520 }),
    };
    const insertedWidget = appendRootWidget(widget);
    finishInsertion();
    selectInsertedWidget(insertedWidget, widget.frame);
  }

  function addHotspots(frameOverride?: WidgetFrame) {
    const widget = {
      id: crypto.randomUUID(),
      type: "hotspots" as const,
      schemaVersion: 1 as const,
      data: {
        title: "Explora la imagen",
        image: { resourceId: null, url: "", alt: "" },
        hotspots: [],
      },
      frame: frameOverride ?? visibleInsertionFrame({ width: 680, height: 540 }),
    };
    const insertedWidget = appendRootWidget(widget);
    finishInsertion();
    selectInsertedWidget(insertedWidget, widget.frame);
  }
  widgetAdder.current = startWidgetPlacement;
  aiProposalApplier.current = async (proposal) => {
    const importedImages = new Map<number, Awaited<ReturnType<typeof api.importRemoteResource>>>();
    for (const [index, item] of proposal.widgets.entries()) {
      if (item.type !== "image" && item.type !== "hotspots") continue;
      const pathName = new URL(item.sourceUrl).pathname.split("/").filter(Boolean).at(-1);
      importedImages.set(
        index,
        await api.importRemoteResource(
          item.sourceUrl,
          item.imageQuery,
          pathName || `imagen-ia-${index + 1}`,
        ),
      );
    }
    const baseFrame = {
      ...defaultWidgetFrame(widgets.length),
      x: 0,
      y: 0,
      width: 1_060,
      height: 360,
    };
    const rowHeights = new Map<number, number>();
    for (const item of proposal.widgets)
      rowHeights.set(
        item.layout.row,
        Math.max(rowHeights.get(item.layout.row) ?? 0, item.layout.minHeight),
      );
    const sortedRows = [...rowHeights.keys()].sort((a, b) => a - b);
    const rowY = new Map<number, number>();
    let nextY = 0;
    for (const row of sortedRows) {
      rowY.set(row, nextY);
      nextY += (rowHeights.get(row) ?? 360) + 28;
    }
    const objects = proposal.widgets.map((item, index): CanvasObject => {
      const column = Math.min(12, item.layout.column);
      const span = Math.min(item.layout.columnSpan, 13 - column);
      const common = {
        id: crypto.randomUUID(),
        parentId: null,
        slotId: null,
        order: widgets.length + index,
        frame: {
          ...baseFrame,
          x: baseFrame.x + (column - 1) * 90,
          y: rowY.get(item.layout.row) ?? baseFrame.y,
          width: Math.max(240, span * 90 - 20),
          height: item.layout.minHeight,
          z: baseFrame.z + index,
        },
      };
      if (item.type === "richText") {
        return {
          ...common,
          type: "richText",
          schemaVersion: 2,
          data: { document: markdownToDocument(item.markdown) },
        };
      }
      if (item.type === "image") {
        const resource = importedImages.get(index);
        if (!resource) throw new Error("No se pudo importar la imagen propuesta.");
        return {
          ...common,
          type: "image",
          schemaVersion: 1,
          data: {
            resourceId: resource.id,
            url: resource.url,
            alt: item.alt,
            caption: [item.caption, item.attribution].filter(Boolean).join(" · "),
            fit: "contain",
          },
        };
      }
      if (item.type === "diagram")
        return {
          ...common,
          type: "diagram",
          schemaVersion: 1,
          data: { elements: [], appState: {}, files: {} },
        };
      if (item.type === "pele")
        return {
          ...common,
          type: "pele",
          schemaVersion: 1,
          data: { source: item.source, caption: item.caption },
        };
      if (item.type === "table") {
        const values = [
          item.headers,
          ...item.rows.map((row) => item.headers.map((_, cell) => row[cell] ?? "")),
        ];
        return {
          ...common,
          type: "table",
          schemaVersion: 2,
          data: {
            rows: values.length,
            columns: item.headers.length,
            cells: values.flat().map((text) => ({ id: crypto.randomUUID(), text })),
          },
        };
      }
      if (item.type === "navigation") {
        const destination = internalPages.some((page) => page.id === item.canvasId)
          ? item.canvasId
          : (internalPages[0]?.id ?? item.canvasId);
        return {
          ...common,
          type: "navigation",
          schemaVersion: 1,
          data: {
            label: item.label,
            destination: { kind: "canvas", canvasId: destination },
            style: item.style,
            openInNewTab: false,
          },
        };
      }
      if (item.type === "quiz")
        return {
          ...common,
          type: "quiz",
          schemaVersion: 1,
          data: {
            question: item.question,
            options: item.options.map((option) => ({ ...option, id: crypto.randomUUID() })),
            explanation: item.explanation,
            selectionMode: item.selectionMode,
            allowRetry: true,
            showExplanation: true,
          },
        };
      if (item.type === "accordion")
        return {
          ...common,
          type: "accordion",
          schemaVersion: 2,
          data: {
            title: item.title,
            items: item.items.map((entry) => ({
              id: crypto.randomUUID(),
              title: entry.title,
              content: markdownToDocument(entry.markdown),
            })),
            allowMultiple: item.allowMultiple,
          },
        };
      if (item.type === "tabs")
        return {
          ...common,
          type: "tabs",
          schemaVersion: 1,
          data: {
            title: item.title,
            items: item.items.map((entry) => ({
              id: crypto.randomUUID(),
              title: entry.title,
              content: markdownToDocument(entry.markdown),
            })),
          },
        };
      if (item.type === "flashcards")
        return {
          ...common,
          type: "flashcards",
          schemaVersion: 1,
          data: {
            title: item.title,
            cards: item.cards.map((card) => ({
              id: crypto.randomUUID(),
              front: markdownToDocument(card.front),
              back: markdownToDocument(card.back),
            })),
          },
        };
      if (item.type === "timeline")
        return {
          ...common,
          type: "timeline",
          schemaVersion: 1,
          data: {
            title: item.title,
            items: item.items.map((entry) => ({
              id: crypto.randomUUID(),
              date: entry.date,
              title: entry.title,
              content: markdownToDocument(entry.markdown),
            })),
          },
        };
      if (item.type === "sorting") {
        const targetIds = item.targets.map(() => crypto.randomUUID());
        return {
          ...common,
          type: "sorting",
          schemaVersion: 1,
          data: {
            title: item.title,
            prompt: item.prompt,
            mode: item.mode,
            targets: item.targets.map((label, targetIndex) => ({
              id: targetIds[targetIndex] as string,
              label,
            })),
            items: item.items.map((entry) => ({
              id: crypto.randomUUID(),
              label: entry.label,
              targetId: entry.targetIndex === null ? null : (targetIds[entry.targetIndex] ?? null),
            })),
            allowRetry: true,
          },
        };
      }
      const resource = importedImages.get(index);
      if (!resource) throw new Error("No se pudo importar la imagen interactiva propuesta.");
      return {
        ...common,
        type: "hotspots",
        schemaVersion: 1,
        data: {
          title: item.title,
          image: { resourceId: resource.id, url: resource.url, alt: item.alt },
          hotspots: item.hotspots.map((spot) => ({
            id: crypto.randomUUID(),
            xPercent: spot.xPercent,
            yPercent: spot.yPercent,
            title: spot.title,
            content: markdownToDocument(spot.markdown),
          })),
        },
      };
    });
    prepareGroupPlacement(objects);
  };

  function updateTableCell(widgetId: string, cellIndex: number, value: string) {
    updateWidgetRecord(widgetId, (widget) => {
      if (widget.type !== "table") return widget;
      const cells = [...widget.data.cells];
      const cell = cells[cellIndex];
      if (!cell) return widget;
      cells[cellIndex] = { ...cell, text: value };
      return { ...widget, data: { ...widget.data, cells } };
    });
  }

  function moveWidgetToCell(widgetId: string, tableId: string, cellId: string) {
    if (widgetId === tableId) return;
    mutateDraft((current) => {
      if (!current) return current;
      const object = current.objects[widgetId];
      const table = current.objects[tableId];
      if (!object || !table || table.type !== "table" || object.type === "table") return current;
      if (!table.data.cells.some((cell) => cell.id === cellId)) return current;
      const siblings = Object.values(current.objects).filter(
        (candidate) => candidate.parentId === tableId && candidate.slotId === cellId,
      );
      const updated: CanvasObject = {
        ...object,
        parentId: tableId,
        slotId: cellId,
        order: siblings.length,
        frame: { ...(object.frame ?? defaultWidgetFrame(0)), x: 8, y: 8 },
      };
      return {
        ...current,
        rootIds: current.rootIds.filter((id) => id !== widgetId),
        objects: { ...current.objects, [widgetId]: updated },
      };
    });
    setEditingWidgetId(null);
    onClearSelection();
  }

  function detachWidget(widgetId: string) {
    mutateDraft((current) => {
      if (!current) return current;
      const object = current.objects[widgetId];
      if (!object || object.parentId === null) return current;
      const parent = current.objects[object.parentId];
      const parentFrame = parent?.frame ?? defaultWidgetFrame(current.rootIds.length);
      const updated: CanvasObject = {
        ...object,
        parentId: null,
        slotId: null,
        order: current.rootIds.length,
        frame: {
          ...(object.frame ?? defaultWidgetFrame(0)),
          x: parentFrame.x + 32,
          y: parentFrame.y + 32,
        },
      };
      return {
        ...current,
        rootIds: [...current.rootIds, widgetId],
        objects: { ...current.objects, [widgetId]: updated },
      };
    });
  }

  function updateDiagram(widgetId: string, data: DiagramWidgetData["data"]) {
    updateWidgetRecord(widgetId, (widget) =>
      widget.type === "diagram" ? { ...widget, data } : widget,
    );
  }

  function updateFrame(widgetId: string, frame: WidgetFrame) {
    const object = draft?.objects[widgetId];
    if (!object) return;
    const updated: CanvasObject = { ...object, frame };
    mutateDraft((current) => {
      if (!current) return current;
      if (!current.objects[widgetId]) return current;
      return { ...current, objects: { ...current.objects, [widgetId]: updated } };
    });
    onSelectWidget({ widget: updated, frame });
    setSaveState("changed");
  }
  frameUpdater.current = updateFrame;

  function updateWidgetRecord(widgetId: string, transform: (widget: Widget) => Widget) {
    const object = draft?.objects[widgetId];
    if (!object) return;
    const widget = transform(object);
    const updated: CanvasObject = {
      ...widget,
      parentId: object.parentId,
      slotId: object.slotId,
      order: object.order,
    };
    mutateDraft((current) => {
      if (!current) return current;
      if (!current.objects[widgetId]) return current;
      return {
        ...current,
        objects: { ...current.objects, [widgetId]: updated },
      };
    });
    onSelectWidget({ widget: updated, frame: updated.frame ?? defaultWidgetFrame(0) });
    setSaveState("changed");
  }
  widgetUpdater.current = (widget) => updateWidgetRecord(widget.id, () => widget);
  embeddedImageUpdater.current = (parentWidgetId, image) => {
    updateWidgetRecord(parentWidgetId, (widget) => {
      if (widget.type !== "richText") return widget;
      const updated = updateEmbeddedImage(widget.data.document, image.id, () => image);
      return updated.replaced ? { ...widget, data: { document: updated.document } } : widget;
    });
  };

  function duplicateWidget(widgetId: string) {
    const source = widgets.find((widget) => widget.id === widgetId);
    if (!source) return;
    const sourceFrame = source.frame ?? defaultWidgetFrame(widgets.indexOf(source));
    const frame = {
      ...sourceFrame,
      x: sourceFrame.x + 24,
      y: sourceFrame.y + 24,
      z: Math.max(0, ...widgets.map((widget) => widget.frame?.z ?? 0)) + 1,
    };
    const duplicate = {
      ...structuredClone(source),
      id: crypto.randomUUID(),
      frame,
    } as CanvasObject;
    mutateDraft((current) =>
      current
        ? {
            ...current,
            rootIds: [...current.rootIds, duplicate.id],
            objects: { ...current.objects, [duplicate.id]: duplicate },
          }
        : current,
    );
    setEditingWidgetId(null);
    selectWidget(duplicate, frame);
    setSaveState("changed");
  }

  function deleteWidget(widgetId: string) {
    provisionalWidgetIds.current.delete(widgetId);
    mutateDraft((current) => {
      if (!current) return current;
      const remove = new Set([widgetId]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const object of Object.values(current.objects)) {
          if (object.parentId && remove.has(object.parentId) && !remove.has(object.id)) {
            remove.add(object.id);
            changed = true;
          }
        }
      }
      return {
        ...current,
        rootIds: current.rootIds.filter((id) => !remove.has(id)),
        objects: Object.fromEntries(
          Object.entries(current.objects).filter(([id]) => !remove.has(id)),
        ) as Record<string, CanvasObject>,
      };
    });
    setEditingWidgetId(null);
    clearWidgetSelection();
    setSaveState("changed");
  }

  function deleteSelectedWidgets() {
    const selected = new Set(selectedWidgetIds);
    mutateDraft((current) => {
      if (!current) return current;
      const remove = new Set(selected);
      for (const object of Object.values(current.objects)) {
        if (object.parentId && remove.has(object.parentId)) remove.add(object.id);
      }
      return {
        ...current,
        rootIds: current.rootIds.filter((id) => !remove.has(id)),
        objects: Object.fromEntries(
          Object.entries(current.objects).filter(([id]) => !remove.has(id)),
        ) as Record<string, CanvasObject>,
      };
    });
    clearWidgetSelection();
  }

  function duplicateSelectedWidgets() {
    const sources = widgets.filter((widget) => selectedWidgetIds.includes(widget.id));
    if (sources.length === 0) return;
    const duplicatedGroups = new Map<string, string>();
    const duplicates = sources.map((source, index) => {
      const groupId = source.groupId
        ? (duplicatedGroups.get(source.groupId) ?? crypto.randomUUID())
        : undefined;
      if (source.groupId && groupId) duplicatedGroups.set(source.groupId, groupId);
      return {
        ...structuredClone(source),
        id: crypto.randomUUID(),
        ...(groupId ? { groupId } : {}),
        frame: {
          ...(source.frame ?? defaultWidgetFrame(index)),
          x: (source.frame ?? defaultWidgetFrame(index)).x + 24,
          y: (source.frame ?? defaultWidgetFrame(index)).y + 24,
        },
      };
    }) as CanvasObject[];
    mutateDraft((current) =>
      current
        ? {
            ...current,
            rootIds: [...current.rootIds, ...duplicates.map((item) => item.id)],
            objects: {
              ...current.objects,
              ...Object.fromEntries(duplicates.map((item) => [item.id, item])),
            },
          }
        : current,
    );
    setSelectedWidgetIds(duplicates.map((item) => item.id));
    const primary = duplicates.at(-1);
    if (primary) onSelectWidget({ widget: primary, frame: primary.frame ?? defaultWidgetFrame(0) });
  }

  function toggleSelectedGroup() {
    if (selectedRootWidgets.length < 2) return;
    const currentGroupIds = new Set(selectedRootWidgets.map((widget) => widget.groupId));
    const ungroup = currentGroupIds.size === 1 && !currentGroupIds.has(undefined);
    const nextGroupId = ungroup ? undefined : crypto.randomUUID();
    const selectedIds = [...selectedWidgetIds];
    const selected = new Set(selectedIds);
    mutateDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        objects: Object.fromEntries(
          Object.entries(current.objects).map(([id, object]) => {
            if (!selected.has(id)) return [id, object];
            const updated = { ...object };
            if (nextGroupId) updated.groupId = nextGroupId;
            else delete updated.groupId;
            return [id, updated];
          }),
        ) as Record<string, CanvasObject>,
      };
    });
    // Cambiar la relación de grupo no cambia la selección activa: el usuario
    // puede seguir moviendo u organizando el mismo conjunto tras desagrupar.
    setSelectedWidgetIds(selectedIds);
    const primary = selectedRootWidgets.at(-1);
    if (primary) {
      const updatedPrimary = { ...primary };
      if (nextGroupId) updatedPrimary.groupId = nextGroupId;
      else delete updatedPrimary.groupId;
      onSelectWidget({
        widget: updatedPrimary,
        frame: updatedPrimary.frame ?? defaultWidgetFrame(0),
      });
    }
  }

  function beginMoveSelectedWidgets(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!draft || event.button !== 0) return;
    const movable = widgets.filter(
      (widget) => selectedWidgetIds.includes(widget.id) && !widget.locked && widget.frame,
    );
    if (movable.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    target.onpointermove = null;
    target.onpointerup = null;
    target.onpointercancel = null;
    const pointerId = event.pointerId;
    target.setPointerCapture(pointerId);
    const startX = event.clientX;
    const startY = event.clientY;
    const original = structuredClone(draft);
    const origins = new Map(
      movable.map((widget) => [widget.id, structuredClone(widget.frame as WidgetFrame)]),
    );
    const minimumOriginX = Math.min(...Array.from(origins.values(), (frame) => frame.x));
    const minimumOriginY = Math.min(...Array.from(origins.values(), (frame) => frame.y));
    let moved = false;
    let latestDx = 0;
    let latestDy = 0;
    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();
      const requestedDx = (moveEvent.clientX - startX) / canvasZoom;
      const requestedDy = (moveEvent.clientY - startY) / canvasZoom;
      latestDx = Math.max(-minimumOriginX, requestedDx);
      latestDy = Math.max(-minimumOriginY, requestedDy);
      moved ||= Math.abs(latestDx) > 1 || Math.abs(latestDy) > 1;
      if (!moved) return;
      setDraft({
        ...original,
        objects: Object.fromEntries(
          Object.entries(original.objects).map(([id, object]) => {
            const origin = origins.get(id);
            if (!origin) return [id, object];
            return [
              id,
              {
                ...object,
                frame: {
                  ...origin,
                  x: origin.x + latestDx,
                  y: origin.y + latestDy,
                },
              },
            ];
          }),
        ) as Record<string, CanvasObject>,
      });
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
    };
    const finish = (finishEvent: PointerEvent) => {
      if (finishEvent.pointerId !== pointerId) return;
      cleanup();
      if (!moved) return;
      undoHistory.current = [...undoHistory.current.slice(-99), original];
      redoHistory.current = [];
      changeVersion.current += 1;
      setHistoryVersion((value) => value + 1);
      setSaveState("changed");
      const primaryId = selectedWidgetIds.at(-1);
      const primary = primaryId ? original.objects[primaryId] : null;
      const origin = primaryId ? origins.get(primaryId) : null;
      if (primary && origin) {
        const frame = {
          ...origin,
          x: origin.x + latestDx,
          y: origin.y + latestDy,
        };
        onSelectWidget({ widget: { ...primary, frame }, frame });
      }
    };
    const cancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId !== pointerId) return;
      cleanup();
      setDraft(original);
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
  }

  function toggleWidgetLock(widgetId: string) {
    updateWidgetRecord(widgetId, (widget) => ({ ...widget, locked: !widget.locked }));
    setEditingWidgetId(null);
  }

  function moveWidgetLayer(widgetId: string, direction: "front" | "back") {
    const levels = widgets.map((widget) => widget.frame?.z ?? 0);
    const nextZ = direction === "front" ? Math.max(0, ...levels) + 1 : Math.min(0, ...levels) - 1;
    updateWidgetRecord(widgetId, (widget) => ({
      ...widget,
      frame: { ...(widget.frame ?? defaultWidgetFrame(0)), z: nextZ },
    }));
  }

  function arrangeSelected(action: SelectionArrangeAction) {
    const selected = new Set(selectedWidgetIds);
    let nextPrimary: SelectedWidget | null = null;
    mutateDraft((current) => {
      if (!current) return current;
      const targets = current.rootIds
        .map((id) => current.objects[id])
        .filter(
          (object): object is CanvasObject =>
            !!object && selected.has(object.id) && !object.locked && !!object.frame,
        );
      if (targets.length < 2) return current;
      const frames = targets.map((target) => target.frame as WidgetFrame);
      const minX = Math.min(...frames.map((frame) => frame.x));
      const maxX = Math.max(...frames.map((frame) => frame.x + frame.width));
      const minY = Math.min(...frames.map((frame) => frame.y));
      const maxY = Math.max(...frames.map((frame) => frame.y + frame.height));
      const objects = { ...current.objects };

      if (action === "distribute-horizontal" && targets.length >= 3) {
        const ordered = [...targets].sort((a, b) => (a.frame?.x ?? 0) - (b.frame?.x ?? 0));
        const totalWidth = ordered.reduce((sum, target) => sum + (target.frame?.width ?? 0), 0);
        const gap = (maxX - minX - totalWidth) / (ordered.length - 1);
        let cursor = minX;
        for (const target of ordered) {
          const frame = { ...(target.frame as WidgetFrame), x: Math.max(0, cursor) };
          objects[target.id] = { ...target, frame };
          cursor += frame.width + gap;
        }
      } else if (action === "distribute-vertical" && targets.length >= 3) {
        const ordered = [...targets].sort((a, b) => (a.frame?.y ?? 0) - (b.frame?.y ?? 0));
        const totalHeight = ordered.reduce((sum, target) => sum + (target.frame?.height ?? 0), 0);
        const gap = (maxY - minY - totalHeight) / (ordered.length - 1);
        let cursor = minY;
        for (const target of ordered) {
          const frame = { ...(target.frame as WidgetFrame), y: Math.max(0, cursor) };
          objects[target.id] = { ...target, frame };
          cursor += frame.height + gap;
        }
      } else if (!action.startsWith("distribute")) {
        for (const target of targets) {
          const currentFrame = target.frame as WidgetFrame;
          const frame = {
            ...currentFrame,
            x:
              action === "left"
                ? minX
                : action === "center"
                  ? (minX + maxX - currentFrame.width) / 2
                  : action === "right"
                    ? maxX - currentFrame.width
                    : currentFrame.x,
            y:
              action === "top"
                ? minY
                : action === "middle"
                  ? (minY + maxY - currentFrame.height) / 2
                  : action === "bottom"
                    ? maxY - currentFrame.height
                    : currentFrame.y,
          };
          objects[target.id] = { ...target, frame };
        }
      } else {
        return current;
      }

      const primary = selectedWidgetId ? objects[selectedWidgetId] : null;
      if (primary?.frame) nextPrimary = { widget: primary, frame: primary.frame };
      return { ...current, objects };
    });
    if (nextPrimary) onSelectWidget(nextPrimary);
  }

  async function commit() {
    if (!canvas || !draft || (saveState !== "changed" && saveState !== "error") || saving.current)
      return;
    const hasEmptyProvisional = widgets.some(
      (widget) =>
        provisionalWidgetIds.current.has(widget.id) &&
        widget.type === "richText" &&
        isRichTextEmpty(documentToMarkdown(widget.data.document)),
    );
    if (hasEmptyProvisional) return;
    const snapshot = structuredClone(draft);
    const versionAtStart = changeVersion.current;
    saving.current = true;
    setSaveState("saving");
    try {
      const updated = await onSave(canvas.id, snapshot, revision);
      setRevision(updated.revision);
      if (changeVersion.current === versionAtStart) {
        setSaveState("saved");
      } else {
        setSaveState("changed");
      }
    } catch {
      setSaveState("error");
    } finally {
      saving.current = false;
    }
  }

  useEffect(() => {
    if (saveState !== "changed") return;
    const timer = window.setTimeout(() => void commit(), 900);
    return () => window.clearTimeout(timer);
  }, [draft, revision, saveState]);

  useEffect(() => {
    function handleHistoryShortcut(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, [contenteditable='true']")) return;
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    }
    window.addEventListener("keydown", handleHistoryShortcut);
    return () => window.removeEventListener("keydown", handleHistoryShortcut);
  });

  useEffect(() => {
    function clearWidgetWhenClickingOutside(event: PointerEvent) {
      if (!selectedWidgetId) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest(
          ".widget-window, .text-selection-menu, .embedded-image-selection, .multi-selection-toolbar, .side-panel.explorer, .properties, .canvas-toolbar, .editor-actions, .resource-picker, .modal-backdrop",
        )
      )
        return;
      if (editingWidgetId && hasActiveTextSelection()) {
        event.preventDefault();
        return;
      }
      if (editingWidgetId) {
        blockCanvasDoubleClick.current = true;
        window.setTimeout(() => {
          blockCanvasDoubleClick.current = false;
        }, 500);
      }
      discardEmptyProvisional(editingWidgetId);
      setEditingWidgetId(null);
      clearWidgetSelection();
    }
    document.addEventListener("pointerdown", clearWidgetWhenClickingOutside, true);
    return () => document.removeEventListener("pointerdown", clearWidgetWhenClickingOutside, true);
  }, [selectedWidgetId, editingWidgetId, onClearSelection]);

  const widgets =
    draft?.rootIds
      .map((id) => draft.objects[id])
      .filter((widget): widget is CanvasObject => !!widget) ?? [];
  const selectedRootWidgets = widgets.filter((widget) => selectedWidgetIds.includes(widget.id));
  const selectedAsGroup =
    selectedRootWidgets.length > 1 &&
    !!selectedRootWidgets[0]?.groupId &&
    selectedRootWidgets.every((widget) => widget.groupId === selectedRootWidgets[0]?.groupId);
  const selectedGroupBounds =
    selectedRootWidgets.length > 1
      ? selectedRootWidgets.reduce(
          (bounds, widget, index) => {
            const frame = widget.frame ?? defaultWidgetFrame(index);
            const right = frame.x + frame.width;
            const bottom = frame.y + frame.height;
            return {
              x: Math.min(bounds.x, frame.x),
              y: Math.min(bounds.y, frame.y),
              right: Math.max(bounds.right, right),
              bottom: Math.max(bounds.bottom, bottom),
            };
          },
          { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY, right: 0, bottom: 0 },
        )
      : null;
  multiSelectionActions.current = {
    arrange: arrangeSelected,
    duplicate: duplicateSelectedWidgets,
    remove: deleteSelectedWidgets,
    toggleGroup: toggleSelectedGroup,
  };
  useEffect(() => {
    onMultiSelectionChange(
      selectedRootWidgets.length > 1
        ? {
            count: selectedRootWidgets.length,
            grouped: selectedAsGroup,
            bounds: {
              x: selectedGroupBounds?.x ?? 0,
              y: selectedGroupBounds?.y ?? 0,
              width: (selectedGroupBounds?.right ?? 0) - (selectedGroupBounds?.x ?? 0),
              height: (selectedGroupBounds?.bottom ?? 0) - (selectedGroupBounds?.y ?? 0),
            },
          }
        : null,
    );
    if (selectedRootWidgets.length <= 1) setGroupActionsOpen(false);
  }, [onMultiSelectionChange, selectedAsGroup, selectedRootWidgets.length]);
  useEffect(
    () => () => {
      onMultiSelectionChange(null);
    },
    [onMultiSelectionChange],
  );
  const canvasContentHeight = Math.max(
    1200,
    ...widgets.map((widget, index) => {
      const frame = widget.frame ?? defaultWidgetFrame(index);
      return frame.y + frame.height + 72;
    }),
  );

  function changeCanvasZoom(nextZoom: number) {
    const scroll = canvasScrollRef.current;
    const normalized = Math.min(2, Math.max(0.5, Math.round(nextZoom * 10) / 10));
    if (!scroll || normalized === canvasZoom) return;
    const centerX = (scroll.scrollLeft + scroll.clientWidth / 2) / canvasZoom;
    const centerY = (scroll.scrollTop + scroll.clientHeight / 2) / canvasZoom;
    setCanvasZoom(normalized);
    window.requestAnimationFrame(() => {
      scroll.scrollLeft = centerX * normalized - scroll.clientWidth / 2;
      scroll.scrollTop = centerY * normalized - scroll.clientHeight / 2;
    });
  }

  function fitCanvasContent() {
    const scroll = canvasScrollRef.current;
    if (!scroll) return;
    const contentWidth = Math.max(
      720,
      ...widgets.map((widget, index) => {
        const frame = widget.frame ?? defaultWidgetFrame(index);
        return frame.x + frame.width + 72;
      }),
    );
    const contentHeight = Math.max(
      560,
      ...widgets.map((widget, index) => {
        const frame = widget.frame ?? defaultWidgetFrame(index);
        return frame.y + frame.height + 72;
      }),
    );
    const nextZoom = Math.min(
      1,
      Math.max(
        0.5,
        Math.floor(
          Math.min(scroll.clientWidth / contentWidth, scroll.clientHeight / contentHeight) * 10,
        ) / 10,
      ),
    );
    setCanvasZoom(nextZoom);
    window.requestAnimationFrame(() => {
      scroll.scrollLeft = 0;
      scroll.scrollTop = 0;
    });
  }

  function beginCanvasPan(event: ReactPointerEvent<HTMLElement>) {
    if (!(event.button === 1 || (event.button === 0 && spacePressed.current))) return false;
    const scroll = canvasScrollRef.current;
    if (!scroll) return false;
    event.preventDefault();
    event.stopPropagation();
    panCleanup.current?.();
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = scroll.scrollLeft;
    const startTop = scroll.scrollTop;
    const composition = compositionRef.current;
    const compositionStartLeft = composition?.scrollLeft ?? 0;
    const compositionStartTop = composition?.scrollTop ?? 0;
    setCanvasPanning(true);
    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();
      scroll.scrollLeft = startLeft - (moveEvent.clientX - startX);
      scroll.scrollTop = startTop - (moveEvent.clientY - startY);
      if (composition) {
        composition.scrollLeft = compositionStartLeft - (moveEvent.clientX - startX);
        composition.scrollTop = compositionStartTop - (moveEvent.clientY - startY);
      }
    };
    const finish = (finishEvent: PointerEvent) => {
      if (finishEvent.pointerId !== pointerId) return;
      panCleanup.current?.();
      panCleanup.current = null;
      setCanvasPanning(false);
    };
    panCleanup.current = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return true;
  }

  function beginMarqueeSelection(event: ReactPointerEvent<HTMLElement>) {
    if (
      event.button !== 0 ||
      spacePressed.current ||
      interactionState.kind === "object" ||
      interactionState.kind === "tool"
    )
      return false;
    const target = event.target;
    if (
      target instanceof Element &&
      target.closest(".widget-window, .editor-actions, .multi-selection-toolbar")
    )
      return false;
    const surface = event.currentTarget;
    const bounds = surface.getBoundingClientRect();
    const startX = (event.clientX - bounds.left) / canvasZoom + surface.scrollLeft;
    const startY = (event.clientY - bounds.top) / canvasZoom + surface.scrollTop;
    let moved = false;
    const move = (moveEvent: PointerEvent) => {
      const x = (moveEvent.clientX - bounds.left) / canvasZoom + surface.scrollLeft;
      const y = (moveEvent.clientY - bounds.top) / canvasZoom + surface.scrollTop;
      moved ||= Math.abs(x - startX) > 4 || Math.abs(y - startY) > 4;
      if (!moved) {
        clearWidgetSelection();
        return;
      }
      setMarquee({
        x: Math.min(startX, x),
        y: Math.min(startY, y),
        width: Math.abs(x - startX),
        height: Math.abs(y - startY),
      });
    };
    const finish = (finishEvent: PointerEvent) => {
      const x = (finishEvent.clientX - bounds.left) / canvasZoom + surface.scrollLeft;
      const y = (finishEvent.clientY - bounds.top) / canvasZoom + surface.scrollTop;
      marqueeCleanup.current?.();
      marqueeCleanup.current = null;
      setMarquee(null);
      if (!moved) {
        clearWidgetSelection();
        onSelectCanvas();
        return;
      }
      const box = {
        x: Math.min(startX, x),
        y: Math.min(startY, y),
        right: Math.max(startX, x),
        bottom: Math.max(startY, y),
      };
      const directMatches = widgets.filter((widget, index) => {
        const frame = widget.frame ?? defaultWidgetFrame(index);
        return (
          frame.x < box.right &&
          frame.x + frame.width > box.x &&
          frame.y < box.bottom &&
          frame.y + frame.height > box.y
        );
      });
      const matchedGroups = new Set(
        directMatches
          .map((widget) => widget.groupId)
          .filter((groupId): groupId is string => !!groupId),
      );
      const matches = widgets.filter(
        (widget) =>
          directMatches.includes(widget) || (!!widget.groupId && matchedGroups.has(widget.groupId)),
      );
      setSelectedWidgetIds(matches.map((widget) => widget.id));
      const primary = matches.at(-1);
      if (primary)
        onSelectWidget({ widget: primary, frame: primary.frame ?? defaultWidgetFrame(0) });
      else onClearSelection();
    };
    marqueeCleanup.current = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    return true;
  }

  const interactionState = useMemo<EditorInteractionState>(() => {
    if (
      imagePickerOpen ||
      insertMenuOpen ||
      pendingPlacement ||
      pendingGroupPlacement ||
      toolWidgetId
    ) {
      return { kind: "tool", widgetId: toolWidgetId ?? editingWidgetId };
    }
    if (editingWidgetId) return { kind: "object", widgetId: editingWidgetId };
    if (selectedWidgetIds.length > 0) {
      return {
        kind: "selection",
        primaryId: selectedWidgetId,
        widgetIds: selectedWidgetIds,
      };
    }
    return { kind: "canvas" };
  }, [
    editingWidgetId,
    imagePickerOpen,
    insertMenuOpen,
    pendingGroupPlacement,
    pendingPlacement,
    selectedWidgetId,
    selectedWidgetIds,
    toolWidgetId,
  ]);
  const insertionItems = [
    {
      id: "text",
      label: "Texto enriquecido",
      description: "Escribe y da formato con Markdown",
      icon: Type,
      action: () => startWidgetPlacement("richText"),
    },
    {
      id: "image",
      label: "Imagen",
      description: "Biblioteca, archivo o URL",
      icon: Image,
      action: () => startWidgetPlacement("image"),
    },
    {
      id: "diagram",
      label: "Diagrama",
      description: "Lienzo visual con Excalidraw",
      icon: Network,
      action: () => startWidgetPlacement("diagram"),
    },
    {
      id: "pele",
      label: "Diagrama Mermaid",
      description: "Diagramas textuales renderizados con Pele",
      icon: Share2,
      action: () => startWidgetPlacement("pele"),
    },
    {
      id: "table",
      label: "Tabla",
      description: "Filas y columnas para organizar contenido",
      icon: Table2,
      action: () => startWidgetPlacement("table"),
    },
    {
      id: "navigation",
      label: "Botón de navegación",
      description: "Continúa a otro lienzo o abre un recurso",
      icon: ArrowRight,
      action: () => startWidgetPlacement("navigation"),
    },
    {
      id: "quiz",
      label: "Ejercicio tipo test",
      description: "Pregunta con respuestas y feedback inmediato",
      icon: CircleHelp,
      action: () => startWidgetPlacement("quiz"),
    },
    {
      id: "sorting",
      label: "Actividad de clasificación",
      description: "Clasifica, ordena o relaciona conceptos",
      icon: LayoutGrid,
      action: () => startWidgetPlacement("sorting", "classify"),
    },
    {
      id: "accordion",
      label: "Acordeón",
      description: "Apartados desplegables para presentar contenido por capas",
      icon: ChevronDown,
      action: () => startWidgetPlacement("accordion"),
    },
    {
      id: "tabs",
      label: "Pestañas",
      description: "Contenido organizado en paneles temáticos",
      icon: LayoutGrid,
      action: () => startWidgetPlacement("tabs"),
    },
    {
      id: "flashcards",
      label: "Tarjetas reversibles",
      description: "Pregunta y respuesta para practicar recuperación activa",
      icon: Copy,
      action: () => startWidgetPlacement("flashcards"),
    },
    {
      id: "timeline",
      label: "Línea temporal",
      description: "Secuencia cronológica de hitos con contenido enriquecido",
      icon: ArrowDown,
      action: () => startWidgetPlacement("timeline"),
    },
    {
      id: "hotspots",
      label: "Imagen interactiva",
      description: "Añade puntos explicativos sobre una imagen",
      icon: Image,
      action: () => startWidgetPlacement("hotspots"),
    },
  ].filter((item) =>
    `${item.label} ${item.description}`.toLowerCase().includes(insertQuery.toLowerCase()),
  );

  return (
    <main className="canvas-area" id="canvas-main" tabIndex={-1}>
      <div className="canvas-toolbar">
        <div className="breadcrumbs" aria-label="Ruta actual">
          <span>Lienzo</span>
          <ChevronRight size={14} />
          <strong>{canvas?.title ?? "Selecciona un lienzo"}</strong>
        </div>
        <div className="canvas-actions">
          {mode === "edit" ? (
            <div className="canvas-zoom-controls" role="group" aria-label="Zoom del lienzo">
              <button
                className="icon-button"
                type="button"
                aria-label="Alejar lienzo"
                title="Alejar (Ctrl/Cmd −)"
                disabled={canvasZoom <= 0.5}
                onClick={() => changeCanvasZoom(canvasZoom - 0.1)}
              >
                <Minus size={15} />
              </button>
              <output aria-live="polite" aria-label="Nivel de zoom">
                {Math.round(canvasZoom * 100)}%
              </output>
              <button
                className="icon-button"
                type="button"
                aria-label="Acercar lienzo"
                title="Acercar (Ctrl/Cmd +)"
                disabled={canvasZoom >= 2}
                onClick={() => changeCanvasZoom(canvasZoom + 0.1)}
              >
                <Plus size={15} />
              </button>
              <button
                className="icon-button"
                type="button"
                aria-label="Encajar contenido"
                title="Encajar contenido (Ctrl/Cmd 0)"
                onClick={fitCanvasContent}
              >
                <Maximize2 size={15} />
              </button>
            </div>
          ) : null}
          {mode === "study" ? (
            <div
              className="study-layout-switcher"
              role="group"
              aria-label="Diseño del modo estudio"
            >
              {(
                [
                  ["outline", Network, "Árbol y hoja"],
                  ["reader", BookOpen, "Lectura"],
                  ["magazine", LayoutGrid, "Revista"],
                  ["presentation", Maximize2, "Presentación"],
                ] as const
              ).map(([layout, Icon, label]) => (
                <button
                  key={layout}
                  type="button"
                  className={studyLayout === layout ? "active" : ""}
                  aria-pressed={studyLayout === layout}
                  title={label}
                  onClick={() => onStudyLayoutChange(layout)}
                >
                  <Icon size={15} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          ) : null}
          {mode === "edit" ? (
            <button
              className="icon-button"
              type="button"
              aria-label="Deshacer"
              title="Deshacer"
              disabled={undoHistory.current.length === 0}
              onClick={undo}
            >
              <Undo2 size={16} />
            </button>
          ) : null}
          {mode === "edit" ? (
            <button
              className="icon-button"
              type="button"
              aria-label="Rehacer"
              title="Rehacer"
              disabled={redoHistory.current.length === 0}
              onClick={redo}
            >
              <Redo2 size={16} />
            </button>
          ) : null}
          {mode === "edit" ? (
            <span
              className="foundation-badge"
              role="status"
              aria-live="polite"
              aria-atomic="true"
              data-state={saveState}
            >
              {saveState === "saving"
                ? "Guardando…"
                : saveState === "changed"
                  ? "Sin guardar"
                  : saveState === "error"
                    ? "Error al guardar"
                    : "Guardado"}
            </span>
          ) : null}
          {mode === "edit" ? (
            <button className="icon-button" type="button" disabled aria-label="Opciones del lienzo">
              <MoreHorizontal size={18} />
            </button>
          ) : null}
        </div>
      </div>

      <section
        ref={canvasScrollRef}
        className="canvas-scroll"
        aria-label="Lienzo actual"
        data-panning={canvasPanning ? "true" : "false"}
        onPointerDownCapture={(event) => beginCanvasPan(event)}
      >
        <article
          className={`canvas-document ${mode} ${mode === "study" ? `study-${studyLayout}` : ""}`}
          style={
            {
              "--canvas-content-height": `${canvasContentHeight}px`,
              "--canvas-scaled-overflow": `${Math.max(0, canvasContentHeight * (canvasZoom - 1))}px`,
            } as CSSProperties
          }
        >
          <header className="document-header">
            <span className="document-kicker">Lienzo</span>
            <h2>{canvas?.title ?? "Tu libro está listo"}</h2>
            <p>
              {canvas?.description ||
                "Selecciona o crea un lienzo para empezar a organizar el conocimiento."}
            </p>
          </header>

          <section
            ref={compositionRef}
            className={`composition-editor ${mode === "edit" ? "spatial" : "study-flow"}`}
            aria-label="Contenido del lienzo"
            style={{ "--canvas-zoom": canvasZoom } as CSSProperties}
            data-interaction-mode={interactionState.kind}
            data-placement={
              pendingPlacement ? pendingPlacement.type : pendingGroupPlacement ? "group" : undefined
            }
            data-active-widget-id={
              interactionState.kind === "object" || interactionState.kind === "tool"
                ? (interactionState.widgetId ?? undefined)
                : interactionState.kind === "selection"
                  ? (interactionState.primaryId ?? undefined)
                  : undefined
            }
            onPointerMove={(event) => {
              const scroll = canvasScrollRef.current;
              if (!scroll) return;
              const bounds = scroll.getBoundingClientRect();
              lastCanvasPointer.current = {
                x: (event.clientX - bounds.left + scroll.scrollLeft) / canvasZoom,
                y: (event.clientY - bounds.top + scroll.scrollTop) / canvasZoom,
              };
              if (pendingPlacement || pendingGroupPlacement)
                setPlacementPoint(lastCanvasPointer.current);
            }}
            onPointerDown={(event) => {
              if (pendingGroupPlacement) {
                event.preventDefault();
                event.stopPropagation();
                const scroll = canvasScrollRef.current;
                if (!scroll) return;
                const bounds = scroll.getBoundingClientRect();
                placePendingGroup({
                  x: (event.clientX - bounds.left + scroll.scrollLeft) / canvasZoom,
                  y: (event.clientY - bounds.top + scroll.scrollTop) / canvasZoom,
                });
                return;
              }
              if (pendingPlacement) {
                event.preventDefault();
                event.stopPropagation();
                const scroll = canvasScrollRef.current;
                if (!scroll) return;
                const bounds = scroll.getBoundingClientRect();
                placePendingWidget({
                  x: (event.clientX - bounds.left + scroll.scrollLeft) / canvasZoom,
                  y: (event.clientY - bounds.top + scroll.scrollTop) / canvasZoom,
                });
                return;
              }
              if (beginMarqueeSelection(event)) return;
              const target = event.target;
              if (
                target instanceof Element &&
                target.closest(
                  ".widget-window, .text-selection-menu, .embedded-image-selection, .multi-selection-toolbar, .resource-picker, .modal-backdrop, .editor-actions",
                )
              )
                return;
              if (editingWidgetId && hasActiveTextSelection()) {
                event.preventDefault();
                return;
              }
              if (editingWidgetId) {
                blockCanvasDoubleClick.current = true;
                window.setTimeout(() => {
                  blockCanvasDoubleClick.current = false;
                }, 500);
              }
              discardEmptyProvisional(editingWidgetId);
              setEditingWidgetId(null);
              clearWidgetSelection();
            }}
            onDoubleClick={(event) => {
              if (mode !== "edit" || !canvas) return;
              const target = event.target;
              if (
                target instanceof Element &&
                target.closest(
                  ".widget-window, .text-selection-menu, .embedded-image-selection, .multi-selection-toolbar, .resource-picker, .modal-backdrop, .editor-actions",
                )
              )
                return;
              event.preventDefault();
              event.stopPropagation();
              if (blockCanvasDoubleClick.current || editingWidgetId || hasActiveTextSelection()) {
                blockCanvasDoubleClick.current = false;
                return;
              }
              const bounds = event.currentTarget.getBoundingClientRect();
              const base = defaultWidgetFrame(widgets.length);
              addRichText(
                {
                  ...base,
                  x: Math.max(36, event.clientX - bounds.left + event.currentTarget.scrollLeft),
                  y: Math.max(36, event.clientY - bounds.top + event.currentTarget.scrollTop),
                  height: 180,
                },
                true,
                true,
              );
            }}
            onDragOver={(event) => {
              if (
                mode === "edit" &&
                Array.from(event.dataTransfer.items).some((item) => item.type.startsWith("image/"))
              ) {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
              }
            }}
            onDrop={(event) => {
              const file = Array.from(event.dataTransfer.files).find((item) =>
                item.type.startsWith("image/"),
              );
              if (!file) return;
              event.preventDefault();
              setDroppedImage(file);
              setImagePickerOpen(true);
            }}
            onPaste={(event) => {
              if (event.target !== event.currentTarget) return;
              const imageFile = Array.from(event.clipboardData.items)
                .find((item) => item.kind === "file" && item.type.startsWith("image/"))
                ?.getAsFile();
              if (imageFile) {
                event.preventDefault();
                event.stopPropagation();
                setDroppedImage(imageFile);
                setImagePickerOpen(true);
                return;
              }
              const value = event.clipboardData.getData("text/plain").trim();
              if (!/^https?:\/\//u.test(value)) return;
              event.preventDefault();
              setPastedUrl(value);
              setImagePickerOpen(true);
            }}
          >
            {pendingPlacement && placementPoint ? (
              <div
                className="widget-placement-preview"
                aria-hidden="true"
                style={(() => {
                  const frame = placementFrame(pendingPlacement.type, placementPoint);
                  return {
                    left: frame.x,
                    top: frame.y,
                    width: frame.width,
                    height: frame.height,
                  };
                })()}
              >
                <strong>{placementLabel(pendingPlacement.type, pendingPlacement.preset)}</strong>
                <span>Clic para colocar</span>
              </div>
            ) : null}
            {pendingGroupPlacement && placementPoint ? (
              <div
                className="group-placement-preview"
                aria-hidden="true"
                style={(() => {
                  const frame = groupPlacementFrame(pendingGroupPlacement, placementPoint);
                  return {
                    left: frame.x,
                    top: frame.y,
                    width: frame.width,
                    height: frame.height,
                  };
                })()}
              >
                {pendingGroupPlacement.objects.map((object, index) => {
                  const frame = object.frame ?? defaultWidgetFrame(index);
                  return (
                    <span
                      key={object.id}
                      style={{
                        left: frame.x,
                        top: frame.y,
                        width: frame.width,
                        height: frame.height,
                      }}
                    >
                      {placementLabel(object.type)}
                    </span>
                  );
                })}
              </div>
            ) : null}
            {pendingPlacement ? (
              <div className="widget-placement-hint" role="status">
                Colocando {placementLabel(pendingPlacement.type, pendingPlacement.preset)} · Clic
                para situar · Esc para cancelar
              </div>
            ) : null}
            {pendingGroupPlacement ? (
              <div className="widget-placement-hint" role="status">
                Colocando {pendingGroupPlacement.objects.length} elementos · Clic para situar · Esc
                para cancelar
              </div>
            ) : null}
            {marquee ? (
              <span
                className="selection-marquee"
                aria-hidden="true"
                style={{
                  left: marquee.x,
                  top: marquee.y,
                  width: marquee.width,
                  height: marquee.height,
                }}
              />
            ) : null}
            {mode === "edit" && interactionState.kind === "selection" && selectedGroupBounds ? (
              <div
                className={`multi-selection-box ${selectedGroupBounds.y < 64 ? "toolbar-below" : ""}`}
                data-testid="multi-selection-box"
                style={{
                  left: selectedGroupBounds.x,
                  top: selectedGroupBounds.y,
                  width: selectedGroupBounds.right - selectedGroupBounds.x,
                  height: selectedGroupBounds.bottom - selectedGroupBounds.y,
                }}
              >
                <div
                  className="multi-selection-toolbar"
                  role="toolbar"
                  aria-label="Organizar selección"
                >
                  <button
                    className="selection-drag-handle"
                    type="button"
                    aria-label="Arrastrar selección"
                    title="Arrastrar selección"
                    onPointerDown={beginMoveSelectedWidgets}
                  >
                    <GripVertical size={15} />
                  </button>
                  <strong>
                    {selectedAsGroup ? "Grupo" : `${selectedRootWidgets.length} seleccionados`}
                  </strong>
                  <button
                    className="selection-group-action"
                    type="button"
                    onClick={toggleSelectedGroup}
                  >
                    {selectedAsGroup ? "Desagrupar" : "Agrupar"}
                  </button>
                  <button
                    ref={groupActionsTrigger}
                    className="selection-more-action"
                    type="button"
                    aria-label="Más acciones de la selección"
                    aria-haspopup="menu"
                    aria-expanded={groupActionsOpen}
                    onClick={() => setGroupActionsOpen((current) => !current)}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {groupActionsOpen ? (
                    <AccessibleMenu
                      className="multi-selection-menu"
                      label="Más acciones de la selección"
                      onDismiss={() => setGroupActionsOpen(false)}
                      returnFocusRef={groupActionsTrigger}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          duplicateSelectedWidgets();
                          setGroupActionsOpen(false);
                        }}
                      >
                        <Copy size={15} /> Duplicar
                      </button>
                      <div className="selection-menu-section" role="presentation">
                        <span>ALINEAR</span>
                        <div className="selection-menu-grid">
                          {(
                            [
                              ["left", "Izquierda"],
                              ["center", "Centro horizontal"],
                              ["right", "Derecha"],
                              ["top", "Arriba"],
                              ["middle", "Centro vertical"],
                              ["bottom", "Abajo"],
                            ] as const
                          ).map(([action, label]) => (
                            <button
                              key={action}
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                arrangeSelected(action);
                                setGroupActionsOpen(false);
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={selectedRootWidgets.length < 3}
                        onClick={() => {
                          arrangeSelected("distribute-horizontal");
                          setGroupActionsOpen(false);
                        }}
                      >
                        Distribuir horizontalmente
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={selectedRootWidgets.length < 3}
                        onClick={() => {
                          arrangeSelected("distribute-vertical");
                          setGroupActionsOpen(false);
                        }}
                      >
                        Distribuir verticalmente
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="danger"
                        onClick={() => {
                          deleteSelectedWidgets();
                          setGroupActionsOpen(false);
                        }}
                      >
                        <Trash2 size={15} /> Eliminar selección
                      </button>
                    </AccessibleMenu>
                  ) : null}
                </div>
              </div>
            ) : null}
            {widgets.map((widget, index) => {
              const frame = widget.frame ?? defaultWidgetFrame(index);
              const isPrimarySelected =
                selectedWidgetId === widget.id ||
                (!selectedWidgetId && selectedWidgetIds.at(-1) === widget.id);
              const content = (
                <>
                  <span className="widget-kind">
                    {widget.type === "richText"
                      ? "Texto enriquecido"
                      : widget.type === "image"
                        ? "Imagen"
                        : widget.type === "diagram"
                          ? "Diagrama"
                          : widget.type === "pele"
                            ? "Diagrama Mermaid"
                            : widget.type === "table"
                              ? "Tabla"
                              : widget.type === "navigation"
                                ? widget.data.variant === "index"
                                  ? "Menú / índice"
                                  : widget.data.variant === "bar"
                                    ? "Barra de navegación"
                                    : "Botón de navegación"
                                : widget.type === "quiz"
                                  ? "Ejercicio tipo test"
                                  : widget.type === "accordion"
                                    ? "Acordeón"
                                    : widget.type === "tabs"
                                      ? "Pestañas"
                                      : widget.type === "flashcards"
                                        ? "Tarjetas reversibles"
                                        : widget.type === "timeline"
                                          ? "Línea temporal"
                                          : widget.type === "hotspots"
                                            ? "Imagen interactiva"
                                            : "Actividad interactiva"}
                  </span>
                  {widget.type === "richText" ? (
                    <RichTextEditor
                      value={widget.data.document}
                      internalPages={internalPages}
                      readOnly={
                        mode === "study" || editingWidgetId !== widget.id || !isPrimarySelected
                      }
                      onChange={(value, contentHeight) =>
                        updateWidget(widget.id, value, contentHeight)
                      }
                      onCommit={() => discardEmptyProvisional(widget.id)}
                      onInteractionModeChange={(active) =>
                        setToolWidgetId((current) =>
                          active ? widget.id : current === widget.id ? null : current,
                        )
                      }
                      onEmbeddedImageSelect={(image) => {
                        setContentElementWidgetId(image ? widget.id : null);
                        onSelectEmbeddedImage(image ? { parentWidgetId: widget.id, image } : null);
                      }}
                    />
                  ) : widget.type === "image" ? (
                    <figure className="image-widget" data-image-fit={widget.data.fit}>
                      <img src={widget.data.url} alt={widget.data.alt} />
                      {widget.data.caption ? <figcaption>{widget.data.caption}</figcaption> : null}
                    </figure>
                  ) : widget.type === "diagram" ? (
                    <DiagramWidget
                      value={widget.data}
                      readOnly={mode === "study"}
                      activeEdit={editingWidgetId === widget.id && isPrimarySelected}
                      onExitEdit={() => setEditingWidgetId(null)}
                      onChange={(value) => updateDiagram(widget.id, value)}
                    />
                  ) : widget.type === "pele" ? (
                    <PeleWidget
                      value={widget.data}
                      editing={editingWidgetId === widget.id && isPrimarySelected}
                      onChange={(data) =>
                        updateWidgetRecord(widget.id, (current) =>
                          current.type === "pele" ? { ...current, data } : current,
                        )
                      }
                    />
                  ) : widget.type === "table" ? (
                    <CanvasTableWidget
                      value={widget}
                      children={Object.values(draft?.objects ?? {}).filter(
                        (candidate) => candidate.parentId === widget.id,
                      )}
                      readOnly={mode === "study" || editingWidgetId !== widget.id}
                      allowDrop={mode === "edit"}
                      movableWidgetId={
                        selectedWidgetId && selectedWidgetId !== widget.id ? selectedWidgetId : null
                      }
                      onCellChange={(cellIndex, value) =>
                        updateTableCell(widget.id, cellIndex, value)
                      }
                      onWidgetDrop={(cellId, childId) =>
                        moveWidgetToCell(childId, widget.id, cellId)
                      }
                      onDetach={detachWidget}
                    />
                  ) : widget.type === "navigation" ? (
                    <NavigationWidget
                      value={widget.data}
                      interactive={mode === "study"}
                      currentCanvasId={canvas?.id}
                    />
                  ) : widget.type === "quiz" ? (
                    <QuizWidget value={widget.data} interactive={mode === "study"} />
                  ) : widget.type === "sorting" ? (
                    <SortingWidget value={widget.data} interactive={mode === "study"} />
                  ) : widget.type === "accordion" ? (
                    <AccordionWidget
                      value={widget.data}
                      interactive={mode === "study"}
                      editing={mode === "edit" && editingWidgetId === widget.id}
                      internalPages={internalPages}
                      onChange={(data) =>
                        updateWidgetRecord(widget.id, (current) =>
                          current.type === "accordion" ? { ...current, data } : current,
                        )
                      }
                    />
                  ) : widget.type === "tabs" ? (
                    <TabsWidget
                      value={widget.data}
                      interactive={mode === "study"}
                      editing={mode === "edit" && editingWidgetId === widget.id}
                      internalPages={internalPages}
                      onChange={(data) =>
                        updateWidgetRecord(widget.id, (current) =>
                          current.type === "tabs" ? { ...current, data } : current,
                        )
                      }
                    />
                  ) : widget.type === "flashcards" ? (
                    <FlashcardsWidget value={widget.data} interactive={mode === "study"} />
                  ) : widget.type === "timeline" ? (
                    <TimelineWidget value={widget.data} />
                  ) : widget.type === "hotspots" ? (
                    <HotspotsWidget
                      value={widget.data}
                      editing={mode === "edit" && editingWidgetId === widget.id}
                      onChange={(data) =>
                        updateWidgetRecord(widget.id, (current) =>
                          current.type === "hotspots" ? { ...current, data } : current,
                        )
                      }
                    />
                  ) : null}
                </>
              );
              return mode === "edit" ? (
                <SpatialWidget
                  key={widget.id}
                  widget={widget}
                  frame={frame}
                  selected={selectedWidgetIds.includes(widget.id)}
                  primarySelected={isPrimarySelected}
                  multipleSelected={selectedWidgetIds.length > 1}
                  editing={editingWidgetId === widget.id && isPrimarySelected}
                  canvasControlsVisible={interactionState.kind === "selection"}
                  resizeControlsVisible={
                    interactionState.kind === "object" && !contentElementWidgetId
                  }
                  toolActive={toolWidgetId === widget.id}
                  onSelect={(additive) => {
                    setContentElementWidgetId(null);
                    onSelectEmbeddedImage(null);
                    if (editingWidgetId !== widget.id) {
                      discardEmptyProvisional(editingWidgetId);
                      setEditingWidgetId(null);
                    }
                    selectWidget(widget, frame, additive);
                  }}
                  onEnterEdit={() => {
                    selectWidget(widget, frame, false, false);
                    setEditingWidgetId(widget.id);
                  }}
                  onExitEdit={() => {
                    discardEmptyProvisional(widget.id);
                    setContentElementWidgetId(null);
                    onSelectEmbeddedImage(null);
                    setEditingWidgetId(null);
                    if (widget.groupId) selectWidget(widget, frame);
                  }}
                  onClearSelection={clearWidgetSelection}
                  onFrameChange={(nextFrame) => updateFrame(widget.id, nextFrame)}
                  onMoveSelectionStart={beginMoveSelectedWidgets}
                  onOpenSelectionMenu={() => setGroupActionsOpen(true)}
                  onDuplicate={() => duplicateWidget(widget.id)}
                  onDelete={() =>
                    selectedWidgetIds.length > 1 ? deleteSelectedWidgets() : deleteWidget(widget.id)
                  }
                  onToggleLock={() => toggleWidgetLock(widget.id)}
                  onBringToFront={() => moveWidgetLayer(widget.id, "front")}
                  onSendToBack={() => moveWidgetLayer(widget.id, "back")}
                  onAddText={() => addRichText()}
                  onAddImage={() => setImagePickerOpen(true)}
                  onAddDiagram={addDiagram}
                  onAddTable={addTable}
                  otherFrames={widgets
                    .filter((candidate) => candidate.id !== widget.id)
                    .map(
                      (candidate, candidateIndex) =>
                        candidate.frame ?? defaultWidgetFrame(candidateIndex),
                    )}
                >
                  {content}
                </SpatialWidget>
              ) : (
                <article
                  className="widget-card"
                  key={widget.id}
                  style={widgetAppearanceStyle(widget)}
                >
                  {content}
                </article>
              );
            })}
            {mode === "edit" ? (
              <div className="editor-actions">
                <button
                  className="add-block"
                  type="button"
                  onClick={() => setInsertMenuOpen((current) => !current)}
                  disabled={!canvas}
                  aria-expanded={insertMenuOpen}
                  aria-label="Insertar widget"
                  title="Insertar widget"
                >
                  <Plus size={18} />
                </button>
                {insertMenuOpen ? (
                  <div className="insertion-menu" role="dialog" aria-label="Catálogo de widgets">
                    <label>
                      <Search size={15} />
                      <input
                        autoFocus
                        value={insertQuery}
                        onChange={(event) => setInsertQuery(event.target.value)}
                        placeholder="Buscar un widget…"
                        aria-label="Buscar widgets"
                      />
                    </label>
                    <div>
                      {insertionItems.map(({ id, label, description, icon: Icon, action }) => (
                        <button key={id} type="button" onClick={action}>
                          <Icon size={17} />
                          <span>
                            <strong>{label}</strong>
                            <small>{description}</small>
                          </span>
                        </button>
                      ))}
                      {insertionItems.length === 0 ? <p>No hay widgets que coincidan.</p> : null}
                    </div>
                  </div>
                ) : null}
                {saveState === "changed" || saveState === "error" ? (
                  <button className="primary-button" type="button" onClick={() => void commit()}>
                    {saveState === "error" ? "Reintentar guardado" : "Guardar cambios"}
                  </button>
                ) : null}
              </div>
            ) : null}
            {canvas && widgets.length === 0 ? (
              <div className="empty-canvas-copy">
                <Type size={24} />
                <strong>Este lienzo está vacío</strong>
                <p>Añade el primer bloque de texto para empezar.</p>
              </div>
            ) : null}
          </section>
          {mode === "study" ? (
            <nav className="study-pagination" aria-label="Navegación entre hojas">
              <button
                type="button"
                disabled={!previousStudyPage}
                onClick={() => previousStudyPage && onStudyNavigate(previousStudyPage.canvasId)}
              >
                <ArrowLeft size={17} />
                <span>
                  <small>Anterior</small>
                  <strong>{previousStudyPage?.title ?? "Primera hoja"}</strong>
                </span>
              </button>
              <div aria-live="polite">
                <span>
                  {studyPosition} de {studyTotal}
                </span>
                <progress value={studyPosition} max={Math.max(1, studyTotal)}>
                  {studyPosition} de {studyTotal}
                </progress>
              </div>
              <button
                type="button"
                disabled={!nextStudyPage}
                onClick={() => nextStudyPage && onStudyNavigate(nextStudyPage.canvasId)}
              >
                <span>
                  <small>Siguiente</small>
                  <strong>{nextStudyPage?.title ?? "Última hoja"}</strong>
                </span>
                <ArrowRight size={17} />
              </button>
            </nav>
          ) : null}
        </article>
      </section>
      {imagePickerOpen ? (
        <ImagePicker
          initialFile={droppedImage}
          initialUrl={pastedUrl}
          onClose={() => {
            setImagePickerOpen(false);
            pendingImageFrame.current = null;
            setDroppedImage(null);
            setPastedUrl("");
          }}
          onSelect={addImage}
        />
      ) : null}
    </main>
  );
}

function CanvasTableWidget({
  value,
  children,
  readOnly,
  allowDrop,
  movableWidgetId,
  onCellChange,
  onWidgetDrop,
  onDetach,
}: {
  value: TableWidgetData;
  children: CanvasObject[];
  readOnly: boolean;
  allowDrop: boolean;
  movableWidgetId: string | null;
  onCellChange: (cellIndex: number, value: string) => void;
  onWidgetDrop: (cellId: string, widgetId: string) => void;
  onDetach: (widgetId: string) => void;
}) {
  return (
    <div
      className="canvas-table-widget"
      style={{ "--table-columns": value.data.columns } as CSSProperties}
      aria-label={`${value.data.rows} filas por ${value.data.columns} columnas`}
    >
      {value.data.cells.map((cell, index) => {
        const row = Math.floor(index / value.data.columns) + 1;
        const column = (index % value.data.columns) + 1;
        const contained = children
          .filter((child) => child.slotId === cell.id)
          .sort((a, b) => a.order - b.order);
        return (
          <div
            className="canvas-table-cell"
            key={cell.id}
            onDragOver={(event) => {
              if (allowDrop) event.preventDefault();
            }}
            onDrop={(event) => {
              if (!allowDrop) return;
              event.preventDefault();
              const childId = event.dataTransfer.getData("application/x-knowcanvas-widget");
              if (childId) onWidgetDrop(cell.id, childId);
            }}
          >
            {readOnly ? (
              cell.text
            ) : (
              <textarea
                aria-label={`Celda ${row}, ${column}`}
                value={cell.text}
                placeholder="Añadir contenido o arrastrar un widget"
                onChange={(event) => onCellChange(index, event.target.value)}
              />
            )}
            {allowDrop && movableWidgetId ? (
              <button
                className="place-widget-in-cell"
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onWidgetDrop(cell.id, movableWidgetId)}
              >
                Colocar widget aquí
              </button>
            ) : null}
            {contained.map((child) => (
              <div className="contained-widget" key={child.id} data-widget-type={child.type}>
                <div className="contained-widget-content">
                  {child.type === "richText" ? (
                    <RichTextPreview value={child.data.document} />
                  ) : child.type === "image" ? (
                    <img src={child.data.url} alt={child.data.alt} />
                  ) : child.type === "diagram" ? (
                    <span>
                      <Network size={15} /> Diagrama
                    </span>
                  ) : child.type === "pele" ? (
                    <span>
                      <Share2 size={15} /> Diagrama Mermaid
                    </span>
                  ) : null}
                </div>
                {allowDrop ? (
                  <button
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => onDetach(child.id)}
                    aria-label="Sacar al lienzo"
                  >
                    Sacar
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function SpatialWidget({
  widget,
  frame,
  selected,
  primarySelected,
  multipleSelected,
  editing,
  canvasControlsVisible,
  resizeControlsVisible,
  toolActive,
  onSelect,
  onEnterEdit,
  onExitEdit,
  onClearSelection,
  onFrameChange,
  onMoveSelectionStart,
  onOpenSelectionMenu,
  onDuplicate,
  onDelete,
  onToggleLock,
  onBringToFront,
  onSendToBack,
  onAddText,
  onAddImage,
  onAddDiagram,
  onAddTable,
  otherFrames,
  children,
}: {
  widget: CanvasObject;
  frame: WidgetFrame;
  selected: boolean;
  primarySelected: boolean;
  multipleSelected: boolean;
  editing: boolean;
  canvasControlsVisible: boolean;
  resizeControlsVisible: boolean;
  toolActive: boolean;
  onSelect: (additive?: boolean) => void;
  onEnterEdit: () => void;
  onExitEdit: () => void;
  onClearSelection: () => void;
  onFrameChange: (frame: WidgetFrame) => void;
  onMoveSelectionStart: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onOpenSelectionMenu: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleLock: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onAddText: () => void;
  onAddImage: () => void;
  onAddDiagram: () => void;
  onAddTable: () => void;
  otherFrames: WidgetFrame[];
  children: ReactNode;
}) {
  const [activeGuides, setActiveGuides] = useState<{ x?: number; y?: number }>({});
  const [liveSize, setLiveSize] = useState<{ width: number; height: number } | null>(null);
  const [liveFrame, setLiveFrame] = useState<WidgetFrame | null>(null);
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const blockMenuTrigger = useRef<HTMLButtonElement>(null);
  const resizeCleanup = useRef<(() => void) | null>(null);

  useEffect(() => () => resizeCleanup.current?.(), []);

  function beginContainerDrag(event: React.DragEvent<HTMLButtonElement>) {
    if (widget.locked || editing) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData("application/x-knowcanvas-widget", widget.id);
    event.dataTransfer.effectAllowed = "move";
  }

  function beginMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (widget.locked || multipleSelected) return;
    event.preventDefault();
    if (!selected) onSelect();
    event.currentTarget.setPointerCapture(event.pointerId);
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = frame;
    const target = event.currentTarget;
    const cleanup = () => {
      target.onpointermove = null;
      target.onpointerup = null;
      target.onpointercancel = null;
      if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
      setActiveGuides({});
    };
    target.onpointermove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const lockHorizontal = moveEvent.shiftKey && Math.abs(deltaX) >= Math.abs(deltaY);
      const lockVertical = moveEvent.shiftKey && Math.abs(deltaY) > Math.abs(deltaX);
      let x = Math.max(0, origin.x + (lockVertical ? 0 : deltaX));
      let y = Math.max(0, origin.y + (lockHorizontal ? 0 : deltaY));
      let guideX: number | undefined;
      let guideY: number | undefined;
      for (const candidate of otherFrames) {
        for (const line of [
          candidate.x,
          candidate.x + candidate.width / 2,
          candidate.x + candidate.width,
        ]) {
          const ownLines = [x, x + origin.width / 2, x + origin.width];
          const match = ownLines.findIndex((own) => Math.abs(own - line) <= 6);
          if (match >= 0) {
            x += line - (ownLines[match] ?? line);
            guideX = line;
            break;
          }
        }
        for (const line of [
          candidate.y,
          candidate.y + candidate.height / 2,
          candidate.y + candidate.height,
        ]) {
          const ownLines = [y, y + origin.height / 2, y + origin.height];
          const match = ownLines.findIndex((own) => Math.abs(own - line) <= 6);
          if (match >= 0) {
            y += line - (ownLines[match] ?? line);
            guideY = line;
            break;
          }
        }
      }
      setActiveGuides({
        ...(guideX === undefined ? {} : { x: guideX }),
        ...(guideY === undefined ? {} : { y: guideY }),
      });
      onFrameChange({ ...origin, x, y });
    };
    target.onpointerup = cleanup;
    target.onpointercancel = cleanup;
  }

  function beginResize(
    event: ReactPointerEvent<HTMLButtonElement>,
    direction: "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw",
  ) {
    if (widget.locked) return;
    event.preventDefault();
    event.stopPropagation();
    if (!selected || multipleSelected) onSelect(false);
    resizeCleanup.current?.();
    event.currentTarget.setPointerCapture(event.pointerId);
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    const origin = frame;
    let latestFrame = origin;
    let changed = false;
    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      let width = origin.width + (direction.includes("e") ? dx : direction.includes("w") ? -dx : 0);
      let height =
        origin.height + (direction.includes("s") ? dy : direction.includes("n") ? -dy : 0);
      if (moveEvent.shiftKey && direction.length === 2) {
        const ratio = origin.width / origin.height;
        if (Math.abs(dx) >= Math.abs(dy)) height = width / ratio;
        else width = height * ratio;
      }
      width = Math.min(1600, Math.max(240, width));
      height = Math.min(1400, Math.max(160, height));
      const x = direction.includes("w") ? origin.x + origin.width - width : origin.x;
      const y = direction.includes("n") ? origin.y + origin.height - height : origin.y;
      latestFrame = {
        ...origin,
        x: Math.max(0, x),
        y: Math.max(0, y),
        width,
        height,
        heightMode: "fixed",
      };
      changed = true;
      setLiveSize({ width, height });
      setLiveFrame(latestFrame);
    };
    const finish = (finishEvent: PointerEvent) => {
      if (finishEvent.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      resizeCleanup.current = null;
      if (changed) onFrameChange(latestFrame);
      setLiveFrame(null);
      setLiveSize(null);
    };
    const cancel = (cancelEvent: PointerEvent) => {
      if (cancelEvent.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      resizeCleanup.current = null;
      setLiveFrame(null);
      setLiveSize(null);
    };
    resizeCleanup.current = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
  }

  const displayedFrame = liveFrame ?? frame;

  return (
    <article
      className={`widget-window ${selected && !multipleSelected && (canvasControlsVisible || (editing && resizeControlsVisible)) ? "selected" : ""} ${widget.locked ? "locked" : ""}`}
      style={{
        left: displayedFrame.x,
        top: displayedFrame.y,
        width: displayedFrame.width,
        height: displayedFrame.height,
        zIndex: displayedFrame.z,
      }}
      onPointerDown={(event) => {
        const target = event.target;
        if (target instanceof Element && target.closest(".widget-selection-layer")) return;
        if (!selected && !editing) onSelect(event.shiftKey);
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        if (!widget.locked) onEnterEdit();
      }}
      onKeyDown={(event) => {
        if (
          (event.key === "Delete" || event.key === "Backspace") &&
          selected &&
          !editing &&
          !widget.locked
        ) {
          event.preventDefault();
          event.stopPropagation();
          onDelete();
          return;
        }
        if (event.key === "Enter" && !editing && !widget.locked) {
          event.preventDefault();
          onEnterEdit();
        }
        if (event.key === "Escape") {
          if (editing) {
            event.preventDefault();
            onExitEdit();
            event.currentTarget.focus();
          } else if (selected) {
            event.preventDefault();
            onClearSelection();
          }
        }
        if (
          !editing &&
          !widget.locked &&
          ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
        ) {
          event.preventDefault();
          const step = event.shiftKey ? 10 : 1;
          if (event.altKey) {
            onFrameChange({
              ...frame,
              width: Math.min(
                1600,
                Math.max(
                  240,
                  frame.width +
                    (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0),
                ),
              ),
              height: Math.min(
                1400,
                Math.max(
                  160,
                  frame.height +
                    (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0),
                ),
              ),
              heightMode: "fixed",
            });
            return;
          }
          onFrameChange({
            ...frame,
            x: Math.max(
              0,
              frame.x + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0),
            ),
            y: Math.max(
              0,
              frame.y + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0),
            ),
          });
        }
      }}
      tabIndex={0}
      aria-label={`${widget.type === "richText" ? "Texto" : widget.type === "image" ? "Imagen" : widget.type === "diagram" ? "Diagrama" : widget.type === "pele" ? "Diagrama Mermaid" : widget.type === "table" ? "Tabla" : widget.type === "navigation" ? "Botón de navegación" : widget.type === "quiz" ? "Ejercicio tipo test" : widget.type === "accordion" ? "Acordeón" : widget.type === "tabs" ? "Pestañas" : widget.type === "flashcards" ? "Tarjetas reversibles" : widget.type === "timeline" ? "Línea temporal" : widget.type === "hotspots" ? "Imagen interactiva" : "Actividad interactiva"}${editing ? ", editando" : selected ? ", seleccionado" : ""}`}
      aria-keyshortcuts="Enter Escape Delete ArrowLeft ArrowRight ArrowUp ArrowDown Alt+ArrowLeft Alt+ArrowRight Alt+ArrowUp Alt+ArrowDown"
      data-widget-type={widget.type}
      data-editing={editing && !toolActive ? "true" : "false"}
      data-active-editor={editing ? "true" : "false"}
      data-interaction-state={toolActive ? "tool" : editing ? "object" : "canvas"}
      data-selected={selected ? "true" : "false"}
      data-height-mode={widget.type === "richText" ? (frame.heightMode ?? "auto") : "fixed"}
      data-locked={widget.locked ? "true" : "false"}
      data-group-id={widget.groupId}
    >
      {canvasControlsVisible &&
      primarySelected &&
      !multipleSelected &&
      widget.type === "richText" ? (
        <div className="block-side-controls">
          <button
            ref={blockMenuTrigger}
            type="button"
            aria-label="Añadir bloque junto a este"
            aria-expanded={blockMenuOpen}
            aria-haspopup="menu"
            aria-controls={blockMenuOpen ? `block-menu-${widget.id}` : undefined}
            onClick={(event) => {
              event.stopPropagation();
              setBlockMenuOpen((current) => !current);
            }}
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            aria-label="Mover bloque"
            disabled={widget.locked}
            onPointerDown={beginMove}
            draggable={!editing && !widget.locked}
            onDragStart={beginContainerDrag}
          >
            <GripVertical size={18} />
          </button>
          {blockMenuOpen ? (
            <AccessibleMenu
              id={`block-menu-${widget.id}`}
              className="block-type-menu"
              label="Tipos de bloque"
              onDismiss={() => setBlockMenuOpen(false)}
              returnFocusRef={blockMenuTrigger}
            >
              <span>Bloques básicos</span>
              <button type="button" role="menuitem" onClick={onAddText}>
                <Type size={17} /> Texto
              </button>
              <button type="button" role="menuitem" onClick={onAddImage}>
                <Image size={17} /> Imagen
              </button>
              <button type="button" role="menuitem" onClick={onAddDiagram}>
                <Network size={17} /> Diagrama
              </button>
              <button type="button" role="menuitem" onClick={onAddTable}>
                <Table2 size={17} /> Tabla
              </button>
            </AccessibleMenu>
          ) : null}
        </div>
      ) : null}
      {activeGuides.x !== undefined ? (
        <span className="alignment-guide vertical" style={{ left: activeGuides.x - frame.x }} />
      ) : null}
      {activeGuides.y !== undefined ? (
        <span className="alignment-guide horizontal" style={{ top: activeGuides.y - frame.y }} />
      ) : null}
      {liveSize ? (
        <output className="widget-size-readout">
          {Math.round(liveSize.width)} × {Math.round(liveSize.height)}
        </output>
      ) : null}
      {canvasControlsVisible && primarySelected && !multipleSelected ? (
        <div className="widget-context-toolbar" role="toolbar" aria-label="Acciones del widget">
          <button
            type="button"
            aria-label="Mover widget"
            title={widget.locked ? "Desbloquea el widget para moverlo" : "Mover"}
            disabled={widget.locked}
            onPointerDown={beginMove}
            draggable={!editing && !widget.locked}
            onDragStart={beginContainerDrag}
          >
            <GripVertical size={16} />
          </button>
          <span className="widget-toolbar-divider" />
          <button type="button" aria-label="Duplicar widget" title="Duplicar" onClick={onDuplicate}>
            <Copy size={15} />
          </button>
          <button
            type="button"
            aria-label="Traer al frente"
            title="Traer al frente"
            onClick={onBringToFront}
          >
            <BringToFront size={15} />
          </button>
          <button
            type="button"
            aria-label="Enviar al fondo"
            title="Enviar al fondo"
            onClick={onSendToBack}
          >
            <SendToBack size={15} />
          </button>
          <button
            type="button"
            aria-label={widget.locked ? "Desbloquear widget" : "Bloquear widget"}
            title={widget.locked ? "Desbloquear" : "Bloquear"}
            onClick={onToggleLock}
          >
            {widget.locked ? <Unlock size={15} /> : <Lock size={15} />}
          </button>
          <span className="widget-toolbar-divider" />
          <button
            className="danger"
            type="button"
            aria-label="Eliminar widget"
            title="Eliminar"
            onClick={onDelete}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ) : null}
      <div className="widget-window-content" style={widgetAppearanceStyle(widget)}>
        {children}
      </div>
      {!editing ? (
        <button
          className="widget-selection-layer"
          type="button"
          aria-label="Seleccionar widget; doble clic para editar"
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            if (event.shiftKey) return;
            if (selected && multipleSelected) {
              onMoveSelectionStart(event);
              return;
            }
            if (!selected) onSelect(false);
            if (!widget.locked) beginMove(event);
          }}
          onClick={(event) => {
            event.stopPropagation();
            if (event.shiftKey) onSelect(true);
          }}
          onContextMenu={(event) => {
            if (!selected || !multipleSelected) return;
            event.preventDefault();
            event.stopPropagation();
            onOpenSelectionMenu();
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            if (!widget.locked) onEnterEdit();
          }}
        />
      ) : null}
      {resizeControlsVisible && primarySelected && !multipleSelected
        ? (["n", "ne", "e", "se", "s", "sw", "w", "nw"] as const).map((direction) => (
            <button
              key={direction}
              className={`widget-resize-handle ${direction}`}
              type="button"
              aria-label={`Redimensionar widget ${direction}`}
              onPointerDown={(event) => beginResize(event, direction)}
              disabled={widget.locked}
            />
          ))
        : null}
    </article>
  );
}

function PropertiesPanel({
  project,
  projectSelected,
  onProjectSave,
  canvasTitle,
  internalPages,
  selectedWidget,
  multiSelection,
  selectedEmbeddedImage,
  onFrameChange,
  onWidgetChange,
  onEmbeddedImageChange,
  canInsert,
  onAddWidget,
  onOpenAi,
  open,
  onClose,
}: {
  project: ProjectDetail;
  projectSelected: boolean;
  onProjectSave: (input: {
    name: string;
    description: string;
    viewerTemplate: ProjectViewerTemplate;
    theme: ProjectTheme;
    accessLevel: ProjectAccessLevel;
  }) => Promise<void>;
  canvasTitle: string | null;
  internalPages: { id: string; title: string }[];
  selectedWidget: SelectedWidget | null;
  multiSelection: MultiSelectionInfo | null;
  selectedEmbeddedImage: SelectedEmbeddedImage | null;
  onFrameChange: (frame: WidgetFrame) => void;
  onWidgetChange: (widget: Widget) => void;
  onEmbeddedImageChange: (image: EmbeddedImageData) => void;
  canInsert: boolean;
  onAddWidget: (type: InsertableWidgetType, preset?: WidgetPresetId) => void;
  onOpenAi: (intent: AiCreationIntent) => void;
  open: boolean;
  onClose: () => void;
}) {
  const [activeInspectorTab, setActiveInspectorTab] = useState<"tools" | "properties">(
    selectedWidget || multiSelection || projectSelected ? "properties" : "tools",
  );
  const [toolQuery, setToolQuery] = useState("");
  const [previewedToolId, setPreviewedToolId] = useState<WidgetCatalogId>("richText");
  const [toolPresets, setToolPresets] = useState<Partial<Record<WidgetCatalogId, WidgetPresetId>>>(
    {},
  );
  const [activeTab, setActiveTab] = useState<"content" | "design" | "behavior">("content");
  const [imagePickerTarget, setImagePickerTarget] = useState<"image" | "hotspots" | null>(null);
  const inspectorTabs = [
    { id: "tools", label: "Herramientas" },
    { id: "properties", label: "Propiedades" },
  ] as const;
  const propertyTabs = [
    { id: "content", label: "Contenido" },
    { id: "design", label: "Apariencia" },
    { id: "behavior", label: "Comportamiento" },
  ] as const;

  useEffect(
    () => setActiveTab("content"),
    [selectedEmbeddedImage?.image.id, selectedWidget?.widget.id],
  );

  useEffect(() => {
    setActiveInspectorTab(
      selectedWidget || selectedEmbeddedImage || multiSelection || projectSelected
        ? "properties"
        : "tools",
    );
  }, [multiSelection, projectSelected, selectedEmbeddedImage, selectedWidget]);

  function updateImageContent(field: "alt" | "caption", value: string) {
    if (selectedEmbeddedImage) {
      onEmbeddedImageChange({
        ...selectedEmbeddedImage.image,
        [field]: value,
      });
      return;
    }
    const widget = selectedWidget?.widget;
    if (widget?.type === "image") {
      onWidgetChange({ ...widget, data: { ...widget.data, [field]: value } });
    }
  }
  const selectedQuizOptionCount =
    selectedWidget?.widget.type === "quiz" ? selectedWidget.widget.data.options.length : 0;
  const selectedQuizMode =
    selectedWidget?.widget.type === "quiz" ? selectedWidget.widget.data.selectionMode : "single";
  const selectedAccordionItemCount =
    selectedWidget?.widget.type === "accordion" ? selectedWidget.widget.data.items.length : 0;
  const selectedTabsItemCount =
    selectedWidget?.widget.type === "tabs" ? selectedWidget.widget.data.items.length : 0;
  const selectedFlashcardCount =
    selectedWidget?.widget.type === "flashcards" ? selectedWidget.widget.data.cards.length : 0;
  const selectedTimelineItemCount =
    selectedWidget?.widget.type === "timeline" ? selectedWidget.widget.data.items.length : 0;
  const selectedHotspotCount =
    selectedWidget?.widget.type === "hotspots" ? selectedWidget.widget.data.hotspots.length : 0;
  const selectedWidgetLabel = selectedWidget
    ? selectedWidget.widget.type === "sorting"
      ? selectedWidget.widget.data.mode === "classify"
        ? "Clasificar"
        : selectedWidget.widget.data.mode === "order"
          ? "Ordenar"
          : "Relacionar"
      : selectedWidget.widget.type === "navigation"
        ? selectedWidget.widget.data.variant === "index"
          ? "Menú / índice"
          : selectedWidget.widget.data.variant === "bar"
            ? "Barra de navegación"
            : "Botón de navegación"
        : (widgetTypes.find((item) => item.id === selectedWidget.widget.type)?.label ?? "Widget")
    : null;
  const normalizedToolQuery = toolQuery.trim().toLocaleLowerCase("es");
  const filteredWidgetTypes = widgetTypes.filter(
    (widget) =>
      !normalizedToolQuery ||
      `${widget.label} ${widget.category} ${widget.description} ${widget.keywords}`
        .toLocaleLowerCase("es")
        .includes(normalizedToolQuery),
  );
  const previewedTool =
    filteredWidgetTypes.find((widget) => widget.id === previewedToolId) ??
    filteredWidgetTypes[0] ??
    null;

  function updateAppearance(patch: Partial<WidgetAppearance>) {
    if (!selectedWidget) return;
    onWidgetChange({
      ...selectedWidget.widget,
      appearance: {
        ...defaultWidgetAppearance(selectedWidget.widget.type),
        ...selectedWidget.widget.appearance,
        ...patch,
      },
    });
  }

  return (
    <aside
      className={`side-panel properties ${open ? "mobile-open" : ""}`}
      aria-label="Propiedades"
      data-inspector-context={
        projectSelected
          ? "project"
          : multiSelection
            ? "group"
            : (selectedWidget?.widget.type ?? "canvas")
      }
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Contexto</span>
          <h2>Inspector</h2>
        </div>
        <button
          className="icon-button mobile-only"
          type="button"
          aria-label="Cerrar propiedades"
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <button
          className="icon-button desktop-only"
          type="button"
          aria-label="Cerrar propiedades"
          title="Cerrar propiedades"
          onClick={onClose}
        >
          <PanelRightClose size={18} />
        </button>
      </div>

      <div className="property-summary">
        <span className="summary-icon">
          {projectSelected ? (
            <BookOpen size={15} />
          ) : multiSelection ? (
            <LayoutGrid size={15} />
          ) : selectedWidget ? (
            <MousePointer2 size={15} />
          ) : (
            <LayoutGrid size={15} />
          )}
        </span>
        <div>
          <strong>
            {projectSelected
              ? "Proyecto"
              : multiSelection
                ? multiSelection.grouped
                  ? "Grupo"
                  : "Selección múltiple"
                : (selectedWidgetLabel ?? "Lienzo")}
          </strong>
          <p>{projectSelected ? project.name : (canvasTitle ?? "Ningún lienzo seleccionado")}</p>
        </div>
      </div>

      <div className="inspector-primary-navigation">
        <Tabs
          idPrefix="inspector"
          label="Secciones del inspector"
          options={inspectorTabs}
          value={activeInspectorTab}
          onChange={setActiveInspectorTab}
          className="inspector-primary-tabs"
        />
      </div>

      {activeInspectorTab === "tools" ? (
        <section
          id="inspector-panel-tools"
          className="property-section inspector-main-panel"
          role="tabpanel"
          aria-labelledby="inspector-tab-tools"
          tabIndex={0}
        >
          <div className="section-title-row">
            <h3>Biblioteca de widgets</h3>
            <span>
              {canInsert
                ? `${widgetTypes.filter((widget) => widget.id).length} disponibles`
                : "Solo en edición"}
            </span>
          </div>
          <label className="tool-search">
            <Search size={15} aria-hidden="true" />
            <input
              type="search"
              value={toolQuery}
              onChange={(event) => setToolQuery(event.target.value)}
              placeholder="Buscar herramientas…"
              aria-label="Buscar herramientas"
            />
          </label>
          <div className="widget-ai-creator" aria-label="Crear con IA según intención">
            <div className="widget-ai-creator-heading">
              <Sparkles size={15} aria-hidden="true" />
              <div>
                <strong>Crear con IA</strong>
                <span>Empieza por lo que quieres conseguir.</span>
              </div>
            </div>
            <div className="widget-ai-intents">
              {(
                [
                  ["explain", "Explicar"],
                  ["visualize", "Visualizar"],
                  ["practice", "Practicar"],
                  ["assess", "Evaluar"],
                  ["transform", "Transformar"],
                ] as const
              ).map(([intent, label]) => (
                <button
                  key={intent}
                  type="button"
                  disabled={!canInsert}
                  onClick={() => onOpenAi(intent)}
                  aria-label={`Crear con IA: ${label}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {previewedTool ? (
            <div className="widget-catalog-preview">
              <WidgetCatalogPreview type={catalogInsertionType(previewedTool)} />
              <div className="widget-catalog-preview-copy">
                <span>{previewedTool.category}</span>
                <strong>{previewedTool.label}</strong>
                <p>{previewedTool.description}</p>
                <small>Incluye contenido inicial editable</small>
                {"variants" in previewedTool ? (
                  <div
                    className="widget-variant-picker"
                    aria-label={`Variantes de ${previewedTool.label}`}
                  >
                    {previewedTool.variants.map((variant) => {
                      const activePreset =
                        toolPresets[previewedTool.id] ?? catalogDefaultPreset(previewedTool);
                      return (
                        <button
                          type="button"
                          className={activePreset === variant.id ? "active" : ""}
                          aria-pressed={activePreset === variant.id}
                          key={variant.id}
                          onClick={() =>
                            setToolPresets((current) => ({
                              ...current,
                              [previewedTool.id]: variant.id,
                            }))
                          }
                        >
                          {variant.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          {widgetCategories.map((category) => {
            const categoryWidgets = filteredWidgetTypes.filter(
              (widget) => widget.category === category.id,
            );
            if (categoryWidgets.length === 0) return null;
            return (
              <div className="widget-category" key={category.id}>
                <div className="widget-category-heading">
                  <span>{category.label}</span>
                  <small>{category.description}</small>
                </div>
                <div className="widget-list">
                  {categoryWidgets.map((item) => {
                    const { id, label, icon: Icon, tone, description } = item;
                    return (
                      <button
                        className="widget-row"
                        type="button"
                        disabled={!canInsert}
                        key={id}
                        aria-label={label}
                        onFocus={() => setPreviewedToolId(id)}
                        onMouseEnter={() => setPreviewedToolId(id)}
                        onClick={() =>
                          onAddWidget(
                            catalogInsertionType(item),
                            toolPresets[id] ?? catalogDefaultPreset(item),
                          )
                        }
                        title={`Añadir ${label}`}
                      >
                        <span className={`widget-icon ${tone}`}>
                          <Icon size={17} aria-hidden="true" />
                        </span>
                        <span className="widget-row-copy">
                          <strong>{label}</strong>
                          <small>{description}</small>
                        </span>
                        <Plus size={15} aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {filteredWidgetTypes.length === 0 ? (
            <div className="tool-empty-state" role="status">
              <Search size={18} aria-hidden="true" />
              <span>No hay herramientas que coincidan.</span>
            </div>
          ) : null}
        </section>
      ) : null}

      {activeInspectorTab === "properties" ? (
        <section
          id="inspector-panel-properties"
          className="property-section muted-section inspector-main-panel"
          role="tabpanel"
          aria-labelledby="inspector-tab-properties"
          tabIndex={0}
        >
          {projectSelected ? (
            project.isOwner ? (
              <ProjectPropertiesInspector project={project} onSave={onProjectSave} />
            ) : (
              <div className="tool-empty-state" role="status">
                <BookOpen size={18} aria-hidden="true" />
                <span>
                  Libro de {project.ownerName}. Solo el autor puede cambiar sus propiedades y
                  permisos.
                </span>
              </div>
            )
          ) : multiSelection ? (
            <div className="widget-properties selection-properties">
              <div className="properties-heading">
                <span>
                  {multiSelection.grouped ? "PROPIEDADES DEL GRUPO" : "SELECCIÓN MÚLTIPLE"}
                </span>
                <small>{multiSelection.count} elementos</small>
              </div>
              <div className="selection-property-section" aria-label="Composición">
                <div className="property-grid-label">Composición</div>
                <div className="property-readout compact">
                  <span>Tipo</span>
                  <strong>{multiSelection.grouped ? "Grupo" : "Selección temporal"}</strong>
                </div>
                <div className="property-readout compact">
                  <span>Elementos</span>
                  <strong>{multiSelection.count}</strong>
                </div>
              </div>
              <div className="selection-property-section" aria-label="Geometría">
                <div className="property-grid-label">Posición</div>
                <div className="selection-property-metrics">
                  <div className="property-readout compact">
                    <span>X</span>
                    <strong>{Math.round(multiSelection.bounds.x)}</strong>
                  </div>
                  <div className="property-readout compact">
                    <span>Y</span>
                    <strong>{Math.round(multiSelection.bounds.y)}</strong>
                  </div>
                </div>
                <div className="property-grid-label">Tamaño</div>
                <div className="selection-property-metrics">
                  <div className="property-readout compact">
                    <span>W</span>
                    <strong>{Math.round(multiSelection.bounds.width)}</strong>
                  </div>
                  <div className="property-readout compact">
                    <span>H</span>
                    <strong>{Math.round(multiSelection.bounds.height)}</strong>
                  </div>
                </div>
              </div>
              <p className="selection-properties-hint">
                Usa la barra sobre la selección o el menú contextual para organizar, duplicar o
                eliminar el conjunto.
              </p>
            </div>
          ) : selectedWidget ? (
            <div className="widget-properties">
              <div className="properties-heading">
                <span>{selectedEmbeddedImage ? "Elemento interno" : "Propiedades"}</span>
                <small>{selectedEmbeddedImage ? "Imagen" : selectedWidgetLabel}</small>
              </div>
              <Tabs
                idPrefix="widget-properties"
                label="Categorías de propiedades"
                options={propertyTabs}
                value={activeTab}
                onChange={setActiveTab}
              />

              {activeTab === "content" ? (
                <div
                  id="widget-properties-panel-content"
                  className="property-tab-panel"
                  role="tabpanel"
                  aria-labelledby="widget-properties-tab-content"
                  tabIndex={0}
                >
                  {!selectedEmbeddedImage && isPresentationWidget(selectedWidget.widget) ? (
                    <PresentationTransformer
                      widget={selectedWidget.widget}
                      onTransform={(target) => {
                        const current = selectedWidget.widget;
                        if (!isPresentationWidget(current)) return;
                        onWidgetChange(transformPresentationWidget(current, target));
                      }}
                    />
                  ) : null}
                  {selectedEmbeddedImage ? (
                    <>
                      <label className="property-field">
                        Texto alternativo
                        <input
                          value={selectedEmbeddedImage.image.alt}
                          maxLength={500}
                          onChange={(event) => updateImageContent("alt", event.target.value)}
                        />
                      </label>
                      <label className="property-field">
                        Pie de imagen
                        <textarea
                          value={selectedEmbeddedImage.image.caption}
                          maxLength={1000}
                          onChange={(event) => updateImageContent("caption", event.target.value)}
                        />
                      </label>
                      <p className="property-help">
                        Imagen dentro del widget de contenido · Origen:{" "}
                        {selectedEmbeddedImage.image.resourceId
                          ? "Biblioteca privada"
                          : "URL externa"}
                      </p>
                    </>
                  ) : selectedWidget.widget.type === "richText" ? (
                    <>
                      <section className="widget-transformer" aria-labelledby="transform-title">
                        <div>
                          <span className="property-grid-label" id="transform-title">
                            Transformar contenido
                          </span>
                          <p>Convierte este texto conservando el objeto y su posición.</p>
                        </div>
                        <div className="widget-transformer-actions">
                          {(
                            [
                              ["accordion", "Acordeón"],
                              ["flashcards", "Tarjetas"],
                              ["timeline", "Proceso"],
                            ] as const
                          ).map(([target, label]) => (
                            <button
                              className="secondary-button"
                              type="button"
                              key={target}
                              onClick={() => {
                                const current = selectedWidget.widget;
                                if (current.type !== "richText") return;
                                onWidgetChange(transformRichTextWidget(current, target));
                              }}
                            >
                              <Sparkles size={13} aria-hidden="true" />
                              {label}
                            </button>
                          ))}
                        </div>
                        <small>La operación se puede deshacer desde la barra superior.</small>
                      </section>
                      <RichTextEditor
                        ariaLabel="Contenido desde Propiedades"
                        autoFocus={false}
                        toolbarMode="fixed"
                        value={selectedWidget.widget.data.document}
                        internalPages={internalPages}
                        onChange={(document) => {
                          const current = selectedWidget.widget;
                          if (current.type !== "richText") return;
                          onWidgetChange({ ...current, data: { document } });
                        }}
                      />
                    </>
                  ) : selectedWidget.widget.type === "image" ? (
                    <>
                      <button
                        className="secondary-button inspector-resource-action"
                        type="button"
                        onClick={() => setImagePickerTarget("image")}
                      >
                        <Image size={15} /> Cambiar imagen
                      </button>
                      <label className="property-field">
                        Texto alternativo
                        <input
                          value={selectedWidget.widget.data.alt}
                          maxLength={500}
                          onChange={(event) => updateImageContent("alt", event.target.value)}
                        />
                      </label>
                      <label className="property-field">
                        Pie de imagen
                        <textarea
                          value={selectedWidget.widget.data.caption}
                          maxLength={1000}
                          onChange={(event) => updateImageContent("caption", event.target.value)}
                        />
                      </label>
                      <p className="property-help">
                        Origen:{" "}
                        {selectedWidget.widget.data.resourceId
                          ? "Biblioteca privada"
                          : "URL externa"}
                      </p>
                    </>
                  ) : selectedWidget.widget.type === "diagram" ? (
                    <div className="property-readout">
                      <span>Elementos</span>
                      <strong>{selectedWidget.widget.data.elements.length}</strong>
                      <p>Doble clic en el widget para editar el diagrama con Excalidraw.</p>
                    </div>
                  ) : selectedWidget.widget.type === "pele" ? (
                    <>
                      <label className="property-field">
                        Pie del diagrama
                        <textarea
                          value={selectedWidget.widget.data.caption}
                          maxLength={1000}
                          onChange={(event) => {
                            const current = selectedWidget.widget;
                            if (current.type !== "pele") return;
                            onWidgetChange({
                              ...current,
                              data: { ...current.data, caption: event.target.value },
                            });
                          }}
                        />
                      </label>
                      <p className="property-help">
                        Doble clic para editar el código Mermaid. Pele genera un SVG adaptable.
                      </p>
                    </>
                  ) : selectedWidget.widget.type === "table" ? (
                    <div className="property-readout">
                      <span>Estructura</span>
                      <strong>
                        {selectedWidget.widget.data.rows} × {selectedWidget.widget.data.columns}
                      </strong>
                      <p>Doble clic en el widget para editar el contenido de sus celdas.</p>
                    </div>
                  ) : selectedWidget.widget.type === "navigation" ? (
                    <>
                      <label className="property-field">
                        Presentación
                        <select
                          value={selectedWidget.widget.data.variant ?? "button"}
                          onChange={(event) => {
                            const current = selectedWidget.widget;
                            if (current.type !== "navigation") return;
                            onWidgetChange({
                              ...current,
                              data: {
                                ...current.data,
                                variant: event.target.value as "button" | "index" | "bar",
                              },
                            });
                          }}
                        >
                          <option value="button">Botón</option>
                          <option value="index">Menú / índice</option>
                          <option value="bar">Barra anterior / siguiente</option>
                        </select>
                      </label>
                      {(selectedWidget.widget.data.variant ?? "button") === "button" ? (
                        <label className="property-field">
                          Texto del botón
                          <input
                            value={selectedWidget.widget.data.label}
                            maxLength={120}
                            onChange={(event) => {
                              const current = selectedWidget.widget;
                              if (current.type !== "navigation") return;
                              onWidgetChange({
                                ...current,
                                data: { ...current.data, label: event.target.value },
                              });
                            }}
                          />
                        </label>
                      ) : (
                        <>
                          <label className="property-field">
                            Título
                            <input
                              value={selectedWidget.widget.data.title ?? ""}
                              maxLength={120}
                              onChange={(event) => {
                                const current = selectedWidget.widget;
                                if (current.type !== "navigation") return;
                                onWidgetChange({
                                  ...current,
                                  data: { ...current.data, title: event.target.value },
                                });
                              }}
                            />
                          </label>
                          <section className="navigation-page-list" aria-label="Páginas incluidas">
                            <div className="property-grid-label">Páginas del recorrido</div>
                            {(selectedWidget.widget.data.items ?? []).map((item, index) => (
                              <label className="property-field" key={item.id}>
                                Página {index + 1}
                                <input
                                  value={item.label}
                                  maxLength={120}
                                  onChange={(event) => {
                                    const current = selectedWidget.widget;
                                    if (current.type !== "navigation") return;
                                    onWidgetChange({
                                      ...current,
                                      data: {
                                        ...current.data,
                                        items: (current.data.items ?? []).map((candidate) =>
                                          candidate.id === item.id
                                            ? { ...candidate, label: event.target.value }
                                            : candidate,
                                        ),
                                      },
                                    });
                                  }}
                                />
                              </label>
                            ))}
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => {
                                const current = selectedWidget.widget;
                                if (current.type !== "navigation") return;
                                onWidgetChange({
                                  ...current,
                                  data: {
                                    ...current.data,
                                    items: internalPages.map((page) => ({
                                      id:
                                        current.data.items?.find(
                                          (item) => item.canvasId === page.id,
                                        )?.id ?? crypto.randomUUID(),
                                      label: page.title,
                                      canvasId: page.id,
                                    })),
                                  },
                                });
                              }}
                            >
                              <ListTree size={15} aria-hidden="true" />
                              Actualizar desde el libro
                            </button>
                          </section>
                        </>
                      )}
                    </>
                  ) : selectedWidget.widget.type === "sorting" ? (
                    <SortingPropertiesEditor
                      value={selectedWidget.widget.data}
                      onChange={(data) => {
                        const current = selectedWidget.widget;
                        if (current.type !== "sorting") return;
                        onWidgetChange({ ...current, data });
                      }}
                    />
                  ) : selectedWidget.widget.type === "hotspots" ? (
                    <div className="quiz-properties">
                      <label className="property-field">
                        Título
                        <input
                          value={selectedWidget.widget.data.title}
                          maxLength={500}
                          onChange={(event) => {
                            const current = selectedWidget.widget;
                            if (current.type !== "hotspots") return;
                            onWidgetChange({
                              ...current,
                              data: { ...current.data, title: event.target.value },
                            });
                          }}
                        />
                      </label>
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => setImagePickerTarget("hotspots")}
                      >
                        <Image size={15} />
                        {selectedWidget.widget.data.image.url ? "Cambiar imagen" : "Elegir imagen"}
                      </button>
                      <label className="property-field">
                        Texto alternativo
                        <input
                          value={selectedWidget.widget.data.image.alt}
                          maxLength={500}
                          onChange={(event) => {
                            const current = selectedWidget.widget;
                            if (current.type !== "hotspots") return;
                            onWidgetChange({
                              ...current,
                              data: {
                                ...current.data,
                                image: { ...current.data.image, alt: event.target.value },
                              },
                            });
                          }}
                        />
                      </label>
                      <div className="quiz-option-editor">
                        <span>Puntos interactivos</span>
                        {selectedWidget.widget.data.hotspots.map((hotspot, index) => (
                          <div className="accordion-item-editor" key={hotspot.id}>
                            <label className="property-field">
                              Título
                              <input
                                aria-label={`Título del punto ${index + 1}`}
                                value={hotspot.title}
                                maxLength={500}
                                onChange={(event) => {
                                  const current = selectedWidget.widget;
                                  if (current.type !== "hotspots") return;
                                  onWidgetChange({
                                    ...current,
                                    data: {
                                      ...current.data,
                                      hotspots: current.data.hotspots.map((candidate) =>
                                        candidate.id === hotspot.id
                                          ? { ...candidate, title: event.target.value }
                                          : candidate,
                                      ),
                                    },
                                  });
                                }}
                              />
                            </label>
                            <div className="property-number-pair">
                              <label>
                                X %
                                <input
                                  aria-label={`Posición X del punto ${index + 1}`}
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={Math.round(hotspot.xPercent)}
                                  onChange={(event) => {
                                    const current = selectedWidget.widget;
                                    if (current.type !== "hotspots") return;
                                    const xPercent = Math.max(
                                      0,
                                      Math.min(100, Number(event.target.value)),
                                    );
                                    onWidgetChange({
                                      ...current,
                                      data: {
                                        ...current.data,
                                        hotspots: current.data.hotspots.map((candidate) =>
                                          candidate.id === hotspot.id
                                            ? { ...candidate, xPercent }
                                            : candidate,
                                        ),
                                      },
                                    });
                                  }}
                                />
                              </label>
                              <label>
                                Y %
                                <input
                                  aria-label={`Posición Y del punto ${index + 1}`}
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={Math.round(hotspot.yPercent)}
                                  onChange={(event) => {
                                    const current = selectedWidget.widget;
                                    if (current.type !== "hotspots") return;
                                    const yPercent = Math.max(
                                      0,
                                      Math.min(100, Number(event.target.value)),
                                    );
                                    onWidgetChange({
                                      ...current,
                                      data: {
                                        ...current.data,
                                        hotspots: current.data.hotspots.map((candidate) =>
                                          candidate.id === hotspot.id
                                            ? { ...candidate, yPercent }
                                            : candidate,
                                        ),
                                      },
                                    });
                                  }}
                                />
                              </label>
                            </div>
                            <RichTextEditor
                              ariaLabel={`Contenido del punto ${index + 1}`}
                              autoFocus={false}
                              toolbarMode="fixed"
                              value={hotspot.content}
                              internalPages={internalPages}
                              onChange={(content) => {
                                const current = selectedWidget.widget;
                                if (current.type !== "hotspots") return;
                                onWidgetChange({
                                  ...current,
                                  data: {
                                    ...current.data,
                                    hotspots: current.data.hotspots.map((candidate) =>
                                      candidate.id === hotspot.id
                                        ? { ...candidate, content }
                                        : candidate,
                                    ),
                                  },
                                });
                              }}
                            />
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() => {
                                const current = selectedWidget.widget;
                                if (current.type !== "hotspots") return;
                                onWidgetChange({
                                  ...current,
                                  data: {
                                    ...current.data,
                                    hotspots: current.data.hotspots.filter(
                                      (candidate) => candidate.id !== hotspot.id,
                                    ),
                                  },
                                });
                              }}
                            >
                              <Trash2 size={14} /> Eliminar punto
                            </button>
                          </div>
                        ))}
                        <button
                          className="secondary-button"
                          type="button"
                          disabled={
                            selectedHotspotCount >= 30 || !selectedWidget.widget.data.image.url
                          }
                          onClick={() => {
                            const current = selectedWidget.widget;
                            if (current.type !== "hotspots") return;
                            onWidgetChange({
                              ...current,
                              data: {
                                ...current.data,
                                hotspots: [
                                  ...current.data.hotspots,
                                  {
                                    id: crypto.randomUUID(),
                                    xPercent: 50,
                                    yPercent: 50,
                                    title: `Punto ${current.data.hotspots.length + 1}`,
                                    content: markdownToDocument(""),
                                  },
                                ],
                              },
                            });
                          }}
                        >
                          <Plus size={15} /> Añadir punto
                        </button>
                      </div>
                    </div>
                  ) : selectedWidget.widget.type === "timeline" ? (
                    <div className="quiz-properties">
                      <label className="property-field">
                        Título
                        <input
                          value={selectedWidget.widget.data.title}
                          maxLength={500}
                          onChange={(event) => {
                            const current = selectedWidget.widget;
                            if (current.type !== "timeline") return;
                            onWidgetChange({
                              ...current,
                              data: { ...current.data, title: event.target.value },
                            });
                          }}
                        />
                      </label>
                      <div className="quiz-option-editor">
                        <span>Hitos</span>
                        {selectedWidget.widget.data.items.map((item, index) => (
                          <div className="accordion-item-editor" key={item.id}>
                            <label className="property-field">
                              Fecha o periodo
                              <input
                                aria-label={`Fecha del hito ${index + 1}`}
                                value={item.date}
                                maxLength={120}
                                onChange={(event) => {
                                  const current = selectedWidget.widget;
                                  if (current.type !== "timeline") return;
                                  onWidgetChange({
                                    ...current,
                                    data: {
                                      ...current.data,
                                      items: current.data.items.map((candidate) =>
                                        candidate.id === item.id
                                          ? { ...candidate, date: event.target.value }
                                          : candidate,
                                      ),
                                    },
                                  });
                                }}
                              />
                            </label>
                            <label className="property-field">
                              Nombre del hito
                              <input
                                aria-label={`Nombre del hito ${index + 1}`}
                                value={item.title}
                                maxLength={500}
                                onChange={(event) => {
                                  const current = selectedWidget.widget;
                                  if (current.type !== "timeline") return;
                                  onWidgetChange({
                                    ...current,
                                    data: {
                                      ...current.data,
                                      items: current.data.items.map((candidate) =>
                                        candidate.id === item.id
                                          ? { ...candidate, title: event.target.value }
                                          : candidate,
                                      ),
                                    },
                                  });
                                }}
                              />
                            </label>
                            <RichTextEditor
                              ariaLabel={`Contenido del hito ${index + 1}`}
                              autoFocus={false}
                              toolbarMode="fixed"
                              value={item.content}
                              internalPages={internalPages}
                              onChange={(content) => {
                                const current = selectedWidget.widget;
                                if (current.type !== "timeline") return;
                                onWidgetChange({
                                  ...current,
                                  data: {
                                    ...current.data,
                                    items: current.data.items.map((candidate) =>
                                      candidate.id === item.id
                                        ? { ...candidate, content }
                                        : candidate,
                                    ),
                                  },
                                });
                              }}
                            />
                            <button
                              className="secondary-button"
                              type="button"
                              disabled={selectedTimelineItemCount <= 1}
                              onClick={() => {
                                const current = selectedWidget.widget;
                                if (current.type !== "timeline") return;
                                onWidgetChange({
                                  ...current,
                                  data: {
                                    ...current.data,
                                    items: current.data.items.filter(
                                      (candidate) => candidate.id !== item.id,
                                    ),
                                  },
                                });
                              }}
                            >
                              <Trash2 size={14} /> Eliminar hito
                            </button>
                          </div>
                        ))}
                        <button
                          className="secondary-button"
                          type="button"
                          disabled={selectedTimelineItemCount >= 30}
                          onClick={() => {
                            const current = selectedWidget.widget;
                            if (current.type !== "timeline") return;
                            onWidgetChange({
                              ...current,
                              data: {
                                ...current.data,
                                items: [
                                  ...current.data.items,
                                  {
                                    id: crypto.randomUUID(),
                                    date: "Nueva fecha",
                                    title: `Hito ${current.data.items.length + 1}`,
                                    content: markdownToDocument(""),
                                  },
                                ],
                              },
                            });
                          }}
                        >
                          <Plus size={15} /> Añadir hito
                        </button>
                      </div>
                    </div>
                  ) : selectedWidget.widget.type === "flashcards" ? (
                    <div className="quiz-properties">
                      <label className="property-field">
                        Título
                        <input
                          value={selectedWidget.widget.data.title}
                          maxLength={500}
                          onChange={(event) => {
                            const current = selectedWidget.widget;
                            if (current.type !== "flashcards") return;
                            onWidgetChange({
                              ...current,
                              data: { ...current.data, title: event.target.value },
                            });
                          }}
                        />
                      </label>
                      <div className="quiz-option-editor">
                        <span>Tarjetas</span>
                        {selectedWidget.widget.data.cards.map((card, index) => (
                          <div className="accordion-item-editor" key={card.id}>
                            <strong>Tarjeta {index + 1}</strong>
                            <span className="property-help">Anverso</span>
                            <RichTextEditor
                              ariaLabel={`Anverso de la tarjeta ${index + 1}`}
                              autoFocus={false}
                              toolbarMode="fixed"
                              value={card.front}
                              internalPages={internalPages}
                              onChange={(front) => {
                                const current = selectedWidget.widget;
                                if (current.type !== "flashcards") return;
                                onWidgetChange({
                                  ...current,
                                  data: {
                                    ...current.data,
                                    cards: current.data.cards.map((candidate) =>
                                      candidate.id === card.id
                                        ? { ...candidate, front }
                                        : candidate,
                                    ),
                                  },
                                });
                              }}
                            />
                            <span className="property-help">Reverso</span>
                            <RichTextEditor
                              ariaLabel={`Reverso de la tarjeta ${index + 1}`}
                              autoFocus={false}
                              toolbarMode="fixed"
                              value={card.back}
                              internalPages={internalPages}
                              onChange={(back) => {
                                const current = selectedWidget.widget;
                                if (current.type !== "flashcards") return;
                                onWidgetChange({
                                  ...current,
                                  data: {
                                    ...current.data,
                                    cards: current.data.cards.map((candidate) =>
                                      candidate.id === card.id ? { ...candidate, back } : candidate,
                                    ),
                                  },
                                });
                              }}
                            />
                            <button
                              className="secondary-button"
                              type="button"
                              disabled={selectedFlashcardCount <= 1}
                              onClick={() => {
                                const current = selectedWidget.widget;
                                if (current.type !== "flashcards") return;
                                onWidgetChange({
                                  ...current,
                                  data: {
                                    ...current.data,
                                    cards: current.data.cards.filter(
                                      (candidate) => candidate.id !== card.id,
                                    ),
                                  },
                                });
                              }}
                            >
                              <Trash2 size={14} /> Eliminar tarjeta
                            </button>
                          </div>
                        ))}
                        <button
                          className="secondary-button"
                          type="button"
                          disabled={selectedFlashcardCount >= 30}
                          onClick={() => {
                            const current = selectedWidget.widget;
                            if (current.type !== "flashcards") return;
                            onWidgetChange({
                              ...current,
                              data: {
                                ...current.data,
                                cards: [
                                  ...current.data.cards,
                                  {
                                    id: crypto.randomUUID(),
                                    front: markdownToDocument("Nueva pregunta"),
                                    back: markdownToDocument("Nueva respuesta"),
                                  },
                                ],
                              },
                            });
                          }}
                        >
                          <Plus size={15} /> Añadir tarjeta
                        </button>
                      </div>
                    </div>
                  ) : selectedWidget.widget.type === "tabs" ? (
                    <div className="quiz-properties">
                      <label className="property-field">
                        Título
                        <input
                          value={selectedWidget.widget.data.title}
                          maxLength={500}
                          onChange={(event) => {
                            const current = selectedWidget.widget;
                            if (current.type !== "tabs") return;
                            onWidgetChange({
                              ...current,
                              data: { ...current.data, title: event.target.value },
                            });
                          }}
                        />
                      </label>
                      <div className="quiz-option-editor">
                        <span>Pestañas</span>
                        {selectedWidget.widget.data.items.map((item, index) => (
                          <div className="accordion-item-editor" key={item.id}>
                            <input
                              aria-label={`Título de la pestaña ${index + 1}`}
                              value={item.title}
                              maxLength={500}
                              onChange={(event) => {
                                const current = selectedWidget.widget;
                                if (current.type !== "tabs") return;
                                onWidgetChange({
                                  ...current,
                                  data: {
                                    ...current.data,
                                    items: current.data.items.map((candidate) =>
                                      candidate.id === item.id
                                        ? { ...candidate, title: event.target.value }
                                        : candidate,
                                    ),
                                  },
                                });
                              }}
                            />
                            <RichTextEditor
                              ariaLabel={`Contenido de la pestaña ${index + 1}`}
                              autoFocus={false}
                              toolbarMode="fixed"
                              value={item.content}
                              internalPages={internalPages}
                              onChange={(content) => {
                                const current = selectedWidget.widget;
                                if (current.type !== "tabs") return;
                                onWidgetChange({
                                  ...current,
                                  data: {
                                    ...current.data,
                                    items: current.data.items.map((candidate) =>
                                      candidate.id === item.id
                                        ? { ...candidate, content }
                                        : candidate,
                                    ),
                                  },
                                });
                              }}
                            />
                            <button
                              className="secondary-button"
                              type="button"
                              disabled={selectedTabsItemCount <= 1}
                              onClick={() => {
                                const current = selectedWidget.widget;
                                if (current.type !== "tabs") return;
                                onWidgetChange({
                                  ...current,
                                  data: {
                                    ...current.data,
                                    items: current.data.items.filter(
                                      (candidate) => candidate.id !== item.id,
                                    ),
                                  },
                                });
                              }}
                            >
                              <Trash2 size={14} /> Eliminar pestaña
                            </button>
                          </div>
                        ))}
                        <button
                          className="secondary-button"
                          type="button"
                          disabled={selectedTabsItemCount >= 12}
                          onClick={() => {
                            const current = selectedWidget.widget;
                            if (current.type !== "tabs") return;
                            onWidgetChange({
                              ...current,
                              data: {
                                ...current.data,
                                items: [
                                  ...current.data.items,
                                  {
                                    id: crypto.randomUUID(),
                                    title: `Pestaña ${current.data.items.length + 1}`,
                                    content: markdownToDocument(""),
                                  },
                                ],
                              },
                            });
                          }}
                        >
                          <Plus size={15} /> Añadir pestaña
                        </button>
                      </div>
                    </div>
                  ) : selectedWidget.widget.type === "accordion" ? (
                    <div className="quiz-properties">
                      <label className="property-field">
                        Título
                        <input
                          value={selectedWidget.widget.data.title}
                          maxLength={500}
                          onChange={(event) => {
                            const current = selectedWidget.widget;
                            if (current.type !== "accordion") return;
                            onWidgetChange({
                              ...current,
                              data: { ...current.data, title: event.target.value },
                            });
                          }}
                        />
                      </label>
                      <div className="quiz-option-editor">
                        <span>Apartados</span>
                        {selectedWidget.widget.data.items.map((item, index) => (
                          <div className="accordion-item-editor" key={item.id}>
                            <input
                              aria-label={`Título del apartado ${index + 1}`}
                              value={item.title}
                              maxLength={500}
                              onChange={(event) => {
                                const current = selectedWidget.widget;
                                if (current.type !== "accordion") return;
                                onWidgetChange({
                                  ...current,
                                  data: {
                                    ...current.data,
                                    items: current.data.items.map((candidate) =>
                                      candidate.id === item.id
                                        ? { ...candidate, title: event.target.value }
                                        : candidate,
                                    ),
                                  },
                                });
                              }}
                            />
                            <RichTextEditor
                              ariaLabel={`Contenido del apartado ${index + 1}`}
                              autoFocus={false}
                              toolbarMode="fixed"
                              value={item.content}
                              internalPages={internalPages}
                              onChange={(content) => {
                                const current = selectedWidget.widget;
                                if (current.type !== "accordion") return;
                                onWidgetChange({
                                  ...current,
                                  data: {
                                    ...current.data,
                                    items: current.data.items.map((candidate) =>
                                      candidate.id === item.id
                                        ? { ...candidate, content }
                                        : candidate,
                                    ),
                                  },
                                });
                              }}
                            />
                            <button
                              className="secondary-button"
                              type="button"
                              disabled={selectedAccordionItemCount <= 1}
                              onClick={() => {
                                const current = selectedWidget.widget;
                                if (current.type !== "accordion") return;
                                onWidgetChange({
                                  ...current,
                                  data: {
                                    ...current.data,
                                    items: current.data.items.filter(
                                      (candidate) => candidate.id !== item.id,
                                    ),
                                  },
                                });
                              }}
                            >
                              <Trash2 size={14} /> Eliminar apartado
                            </button>
                          </div>
                        ))}
                        <button
                          className="secondary-button"
                          type="button"
                          disabled={selectedAccordionItemCount >= 20}
                          onClick={() => {
                            const current = selectedWidget.widget;
                            if (current.type !== "accordion") return;
                            onWidgetChange({
                              ...current,
                              data: {
                                ...current.data,
                                items: [
                                  ...current.data.items,
                                  {
                                    id: crypto.randomUUID(),
                                    title: `Apartado ${current.data.items.length + 1}`,
                                    content: markdownToDocument(""),
                                  },
                                ],
                              },
                            });
                          }}
                        >
                          <Plus size={15} /> Añadir apartado
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="quiz-properties">
                      <label className="property-field">
                        Pregunta
                        <textarea
                          value={selectedWidget.widget.data.question}
                          maxLength={2000}
                          onChange={(event) => {
                            const current = selectedWidget.widget;
                            if (current.type !== "quiz") return;
                            onWidgetChange({
                              ...current,
                              data: { ...current.data, question: event.target.value },
                            });
                          }}
                        />
                      </label>
                      <div className="quiz-option-editor">
                        <span>
                          Respuestas · marca{" "}
                          {selectedQuizMode === "multiple" ? "todas las correctas" : "la correcta"}
                        </span>
                        {selectedWidget.widget.data.options.map((option, index) => (
                          <div className="quiz-option-row" key={option.id}>
                            <input
                              type={selectedQuizMode === "multiple" ? "checkbox" : "radio"}
                              name={`correct-${selectedWidget.widget.id}`}
                              aria-label={`Marcar respuesta ${index + 1} como correcta`}
                              checked={option.correct}
                              onChange={() => {
                                const current = selectedWidget.widget;
                                if (current.type !== "quiz") return;
                                onWidgetChange({
                                  ...current,
                                  data: {
                                    ...current.data,
                                    options: current.data.options.map((item) => ({
                                      ...item,
                                      correct:
                                        current.data.selectionMode === "multiple"
                                          ? item.id === option.id
                                            ? !item.correct
                                            : item.correct
                                          : item.id === option.id,
                                    })),
                                  },
                                });
                              }}
                            />
                            <input
                              value={option.label}
                              aria-label={`Respuesta ${index + 1}`}
                              maxLength={1000}
                              onChange={(event) => {
                                const current = selectedWidget.widget;
                                if (current.type !== "quiz") return;
                                onWidgetChange({
                                  ...current,
                                  data: {
                                    ...current.data,
                                    options: current.data.options.map((item) =>
                                      item.id === option.id
                                        ? { ...item, label: event.target.value }
                                        : item,
                                    ),
                                  },
                                });
                              }}
                            />
                            <button
                              className="icon-button"
                              type="button"
                              aria-label={`Eliminar respuesta ${index + 1}`}
                              disabled={selectedQuizOptionCount <= 2}
                              onClick={() => {
                                const current = selectedWidget.widget;
                                if (current.type !== "quiz") return;
                                const options = current.data.options.filter(
                                  (item) => item.id !== option.id,
                                );
                                if (option.correct && options[0])
                                  options[0] = { ...options[0], correct: true };
                                onWidgetChange({ ...current, data: { ...current.data, options } });
                              }}
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ))}
                        <button
                          className="secondary-button"
                          type="button"
                          disabled={selectedQuizOptionCount >= 8}
                          onClick={() => {
                            const current = selectedWidget.widget;
                            if (current.type !== "quiz") return;
                            onWidgetChange({
                              ...current,
                              data: {
                                ...current.data,
                                options: [
                                  ...current.data.options,
                                  {
                                    id: crypto.randomUUID(),
                                    label: `Opción ${current.data.options.length + 1}`,
                                    correct: false,
                                  },
                                ],
                              },
                            });
                          }}
                        >
                          <Plus size={15} /> Añadir respuesta
                        </button>
                      </div>
                      <label className="property-field">
                        Explicación después de responder
                        <textarea
                          value={selectedWidget.widget.data.explanation}
                          maxLength={2000}
                          onChange={(event) => {
                            const current = selectedWidget.widget;
                            if (current.type !== "quiz") return;
                            onWidgetChange({
                              ...current,
                              data: { ...current.data, explanation: event.target.value },
                            });
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              ) : null}

              {activeTab === "design" ? (
                <div
                  id="widget-properties-panel-design"
                  className="property-tab-panel"
                  role="tabpanel"
                  aria-labelledby="widget-properties-tab-design"
                  tabIndex={0}
                >
                  {selectedEmbeddedImage ? (
                    <>
                      <div className="property-grid-label">Tamaño dentro del contenido</div>
                      <label className="property-field">
                        Ancho
                        <input
                          aria-label="Ancho de imagen interna"
                          type="number"
                          min="80"
                          max="1600"
                          value={Math.round(selectedEmbeddedImage.image.width)}
                          onChange={(event) =>
                            onEmbeddedImageChange({
                              ...selectedEmbeddedImage.image,
                              width: Math.min(1600, Math.max(80, Number(event.target.value))),
                            })
                          }
                        />
                      </label>
                      <label className="property-field">
                        Alineación
                        <select
                          value={selectedEmbeddedImage.image.alignment}
                          onChange={(event) =>
                            onEmbeddedImageChange({
                              ...selectedEmbeddedImage.image,
                              alignment: event.target.value as EmbeddedImageData["alignment"],
                            })
                          }
                        >
                          <option value="left">Izquierda</option>
                          <option value="center">Centro</option>
                          <option value="right">Derecha</option>
                        </select>
                      </label>
                      <p className="property-help">
                        La imagen participa en el flujo y no tiene coordenadas X/Y propias.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="property-grid-label">Estilo visual</div>
                      {selectedWidget.widget.type === "navigation" &&
                      (selectedWidget.widget.data.variant ?? "button") === "button" ? (
                        <label className="property-field">
                          Estilo del botón
                          <select
                            value={selectedWidget.widget.data.style}
                            onChange={(event) => {
                              const current = selectedWidget.widget;
                              if (current.type !== "navigation") return;
                              onWidgetChange({
                                ...current,
                                data: {
                                  ...current.data,
                                  style: event.target.value as "primary" | "secondary",
                                },
                              });
                            }}
                          >
                            <option value="primary">Principal</option>
                            <option value="secondary">Secundario</option>
                          </select>
                        </label>
                      ) : null}
                      {selectedWidget.widget.type === "image" ? (
                        <>
                          <label className="property-field">
                            Ajuste dentro del marco
                            <select
                              value={selectedWidget.widget.data.fit}
                              onChange={(event) => {
                                const current = selectedWidget.widget;
                                if (current.type !== "image") return;
                                onWidgetChange({
                                  ...current,
                                  data: {
                                    ...current.data,
                                    fit: event.target.value as "contain" | "cover" | "fill",
                                  },
                                });
                              }}
                            >
                              <option value="contain">Ver completa</option>
                              <option value="cover">Rellenar y recortar</option>
                              <option value="fill">Estirar al marco</option>
                            </select>
                          </label>
                          <p className="property-help">
                            Controla cómo ocupa la imagen el marco sin crear barras de
                            desplazamiento.
                          </p>
                        </>
                      ) : null}
                      <div className="property-color-grid">
                        <label>
                          Fondo
                          <input
                            type="color"
                            aria-label="Color de fondo"
                            value={
                              selectedWidget.widget.appearance?.backgroundColor ??
                              defaultWidgetAppearance(selectedWidget.widget.type).backgroundColor
                            }
                            onChange={(event) =>
                              updateAppearance({ backgroundColor: event.target.value })
                            }
                          />
                        </label>
                        <label>
                          Texto
                          <input
                            type="color"
                            aria-label="Color de texto"
                            value={
                              selectedWidget.widget.appearance?.textColor ??
                              defaultWidgetAppearance(selectedWidget.widget.type).textColor
                            }
                            onChange={(event) =>
                              updateAppearance({ textColor: event.target.value })
                            }
                          />
                        </label>
                        <label>
                          Acento
                          <input
                            type="color"
                            aria-label="Color de acento"
                            value={
                              selectedWidget.widget.appearance?.accentColor ??
                              defaultWidgetAppearance(selectedWidget.widget.type).accentColor
                            }
                            onChange={(event) =>
                              updateAppearance({ accentColor: event.target.value })
                            }
                          />
                        </label>
                      </div>
                      <label className="property-field">
                        Borde
                        <select
                          value={
                            selectedWidget.widget.appearance?.border ??
                            defaultWidgetAppearance(selectedWidget.widget.type).border
                          }
                          onChange={(event) =>
                            updateAppearance({ border: event.target.value as "none" | "subtle" })
                          }
                        >
                          <option value="none">Sin borde</option>
                          <option value="subtle">Borde sutil</option>
                        </select>
                      </label>
                      <div className="property-number-pair">
                        <label>
                          Radio
                          <input
                            aria-label="Radio de esquina"
                            type="number"
                            min="0"
                            max="32"
                            value={
                              selectedWidget.widget.appearance?.borderRadius ??
                              defaultWidgetAppearance(selectedWidget.widget.type).borderRadius
                            }
                            onChange={(event) =>
                              updateAppearance({
                                borderRadius: Math.min(32, Math.max(0, Number(event.target.value))),
                              })
                            }
                          />
                        </label>
                        <label>
                          Relleno
                          <input
                            aria-label="Relleno interior"
                            type="number"
                            min="0"
                            max="48"
                            value={
                              selectedWidget.widget.appearance?.padding ??
                              defaultWidgetAppearance(selectedWidget.widget.type).padding
                            }
                            onChange={(event) =>
                              updateAppearance({
                                padding: Math.min(48, Math.max(0, Number(event.target.value))),
                              })
                            }
                          />
                        </label>
                      </div>
                      <button
                        className="quiet-button property-reset-button"
                        type="button"
                        disabled={!selectedWidget.widget.appearance}
                        onClick={() =>
                          onWidgetChange({ ...selectedWidget.widget, appearance: undefined })
                        }
                      >
                        Restablecer apariencia
                      </button>
                      <div className="property-grid-label">Posición</div>
                      <div className="property-number-pair">
                        <label>
                          X
                          <input
                            aria-label="Posición X"
                            type="number"
                            min="0"
                            value={Math.round(selectedWidget.frame.x)}
                            onChange={(event) =>
                              onFrameChange({
                                ...selectedWidget.frame,
                                x: Math.max(0, Number(event.target.value)),
                              })
                            }
                          />
                        </label>
                        <label>
                          Y
                          <input
                            aria-label="Posición Y"
                            type="number"
                            min="0"
                            value={Math.round(selectedWidget.frame.y)}
                            onChange={(event) =>
                              onFrameChange({
                                ...selectedWidget.frame,
                                y: Math.max(0, Number(event.target.value)),
                              })
                            }
                          />
                        </label>
                      </div>
                      <div className="property-grid-label">Tamaño</div>
                      <div className="property-number-pair">
                        <label>
                          W
                          <input
                            aria-label="Ancho"
                            type="number"
                            min="240"
                            max="1600"
                            value={Math.round(selectedWidget.frame.width)}
                            onChange={(event) =>
                              onFrameChange({
                                ...selectedWidget.frame,
                                width: Math.min(1600, Math.max(240, Number(event.target.value))),
                                heightMode: "fixed",
                              })
                            }
                          />
                        </label>
                        <label>
                          H
                          <input
                            aria-label="Alto"
                            type="number"
                            min="160"
                            max="1400"
                            value={Math.round(selectedWidget.frame.height)}
                            onChange={(event) =>
                              onFrameChange({
                                ...selectedWidget.frame,
                                height: Math.min(1400, Math.max(160, Number(event.target.value))),
                                heightMode: "fixed",
                              })
                            }
                          />
                        </label>
                      </div>
                      {selectedWidget.widget.type === "richText" ? (
                        <label className="property-toggle compact-toggle">
                          <span>
                            <strong>Altura automática</strong>
                            <small>El marco crece con el contenido y evita scroll interno.</small>
                          </span>
                          <input
                            type="checkbox"
                            checked={(selectedWidget.frame.heightMode ?? "auto") === "auto"}
                            onChange={(event) =>
                              onFrameChange({
                                ...selectedWidget.frame,
                                heightMode: event.target.checked ? "auto" : "fixed",
                              })
                            }
                          />
                        </label>
                      ) : null}
                      <div className="property-readout compact">
                        <span>Profundidad</span>
                        <strong>{selectedWidget.frame.z}</strong>
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {activeTab === "behavior" ? (
                <div
                  id="widget-properties-panel-behavior"
                  className="property-tab-panel"
                  role="tabpanel"
                  aria-labelledby="widget-properties-tab-behavior"
                  tabIndex={0}
                >
                  {selectedEmbeddedImage ? (
                    <div className="property-readout">
                      <span>Ámbito</span>
                      <strong>Contenido</strong>
                      <p>Se mueve con el documento y queda limitada por el ancho del contenedor.</p>
                    </div>
                  ) : (
                    <>
                      {selectedWidget.widget.type === "navigation" &&
                      (selectedWidget.widget.data.variant ?? "button") === "button" ? (
                        <div className="behavior-group">
                          <div className="property-grid-label">Al hacer clic</div>
                          <label className="property-field">
                            Acción
                            <select
                              value={selectedWidget.widget.data.destination.kind}
                              onChange={(event) => {
                                const current = selectedWidget.widget;
                                if (current.type !== "navigation") return;
                                const destination =
                                  event.target.value === "canvas"
                                    ? {
                                        kind: "canvas" as const,
                                        canvasId: internalPages[0]?.id ?? "missing",
                                      }
                                    : { kind: "external" as const, url: "https://" };
                                onWidgetChange({
                                  ...current,
                                  data: { ...current.data, destination },
                                });
                              }}
                            >
                              <option value="canvas">Ir a otro lienzo</option>
                              <option value="external">Abrir un enlace externo</option>
                            </select>
                          </label>
                          {selectedWidget.widget.data.destination.kind === "canvas" ? (
                            <label className="property-field">
                              Lienzo de destino
                              <select
                                value={selectedWidget.widget.data.destination.canvasId}
                                onChange={(event) => {
                                  const current = selectedWidget.widget;
                                  if (current.type !== "navigation") return;
                                  onWidgetChange({
                                    ...current,
                                    data: {
                                      ...current.data,
                                      destination: {
                                        kind: "canvas",
                                        canvasId: event.target.value,
                                      },
                                    },
                                  });
                                }}
                              >
                                {internalPages.map((page) => (
                                  <option key={page.id} value={page.id}>
                                    {page.title}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : (
                            <>
                              <label className="property-field">
                                URL
                                <input
                                  type="url"
                                  value={selectedWidget.widget.data.destination.url}
                                  placeholder="https://ejemplo.com"
                                  onChange={(event) => {
                                    const current = selectedWidget.widget;
                                    if (current.type !== "navigation") return;
                                    onWidgetChange({
                                      ...current,
                                      data: {
                                        ...current.data,
                                        destination: {
                                          kind: "external",
                                          url: event.target.value,
                                        },
                                      },
                                    });
                                  }}
                                />
                              </label>
                              <label className="property-toggle">
                                <span>
                                  <strong>Abrir en pestaña nueva</strong>
                                  <small>Mantiene KnowCanvas abierto en la pestaña actual.</small>
                                </span>
                                <input
                                  type="checkbox"
                                  checked={selectedWidget.widget.data.openInNewTab}
                                  onChange={(event) => {
                                    const current = selectedWidget.widget;
                                    if (current.type !== "navigation") return;
                                    onWidgetChange({
                                      ...current,
                                      data: {
                                        ...current.data,
                                        openInNewTab: event.target.checked,
                                      },
                                    });
                                  }}
                                />
                              </label>
                            </>
                          )}
                        </div>
                      ) : null}
                      {selectedWidget.widget.type === "navigation" &&
                      (selectedWidget.widget.data.variant ?? "button") !== "button" ? (
                        <div className="behavior-group">
                          <div className="property-grid-label">Orientación del lector</div>
                          <label className="property-toggle">
                            <span>
                              <strong>Marcar la página actual</strong>
                              <small>
                                El índice y la barra indican dónde se encuentra el lector.
                              </small>
                            </span>
                            <input
                              type="checkbox"
                              checked={selectedWidget.widget.data.showCurrent !== false}
                              onChange={(event) => {
                                const current = selectedWidget.widget;
                                if (current.type !== "navigation") return;
                                onWidgetChange({
                                  ...current,
                                  data: { ...current.data, showCurrent: event.target.checked },
                                });
                              }}
                            />
                          </label>
                          <p className="property-help">
                            Los destinos se mantienen como enlaces internos y respetan el orden
                            configurado en Contenido.
                          </p>
                        </div>
                      ) : null}
                      {selectedWidget.widget.type === "quiz" ? (
                        <div className="behavior-group">
                          <div className="property-grid-label">Tipo de respuesta</div>
                          <label className="property-toggle">
                            <span>
                              <strong>Permitir varias respuestas</strong>
                              <small>
                                El alumno deberá marcar exactamente todas las correctas.
                              </small>
                            </span>
                            <input
                              type="checkbox"
                              checked={selectedWidget.widget.data.selectionMode === "multiple"}
                              onChange={(event) => {
                                const current = selectedWidget.widget;
                                if (current.type !== "quiz") return;
                                onWidgetChange({
                                  ...current,
                                  data: {
                                    ...current.data,
                                    selectionMode: event.target.checked ? "multiple" : "single",
                                    options: event.target.checked
                                      ? current.data.options
                                      : current.data.options.map((option, index) => ({
                                          ...option,
                                          correct: index === 0,
                                        })),
                                  },
                                });
                              }}
                            />
                          </label>
                          <div className="property-grid-label">Después de responder</div>
                          <label className="property-toggle">
                            <span>
                              <strong>Permitir reintento</strong>
                              <small>
                                La persona podrá limpiar su respuesta y probar otra vez.
                              </small>
                            </span>
                            <input
                              type="checkbox"
                              checked={selectedWidget.widget.data.allowRetry}
                              onChange={(event) => {
                                const current = selectedWidget.widget;
                                if (current.type !== "quiz") return;
                                onWidgetChange({
                                  ...current,
                                  data: { ...current.data, allowRetry: event.target.checked },
                                });
                              }}
                            />
                          </label>
                          <label className="property-toggle">
                            <span>
                              <strong>Mostrar explicación</strong>
                              <small>Enseña el texto explicativo después de comprobar.</small>
                            </span>
                            <input
                              type="checkbox"
                              checked={selectedWidget.widget.data.showExplanation}
                              onChange={(event) => {
                                const current = selectedWidget.widget;
                                if (current.type !== "quiz") return;
                                onWidgetChange({
                                  ...current,
                                  data: { ...current.data, showExplanation: event.target.checked },
                                });
                              }}
                            />
                          </label>
                        </div>
                      ) : selectedWidget.widget.type === "sorting" ? (
                        <div className="behavior-group">
                          <div className="property-grid-label">Después de comprobar</div>
                          <label className="property-toggle">
                            <span>
                              <strong>Permitir reintento</strong>
                              <small>
                                La persona podrá limpiar la actividad y probar otra vez.
                              </small>
                            </span>
                            <input
                              type="checkbox"
                              checked={selectedWidget.widget.data.allowRetry}
                              onChange={(event) => {
                                const current = selectedWidget.widget;
                                if (current.type !== "sorting") return;
                                onWidgetChange({
                                  ...current,
                                  data: { ...current.data, allowRetry: event.target.checked },
                                });
                              }}
                            />
                          </label>
                        </div>
                      ) : selectedWidget.widget.type === "accordion" ? (
                        <div className="behavior-group">
                          <div className="property-grid-label">Expansión</div>
                          <label className="property-toggle">
                            <span>
                              <strong>Permitir varios apartados abiertos</strong>
                              <small>Si se desactiva, abrir un apartado cerrará el anterior.</small>
                            </span>
                            <input
                              type="checkbox"
                              checked={selectedWidget.widget.data.allowMultiple}
                              onChange={(event) => {
                                const current = selectedWidget.widget;
                                if (current.type !== "accordion") return;
                                onWidgetChange({
                                  ...current,
                                  data: { ...current.data, allowMultiple: event.target.checked },
                                });
                              }}
                            />
                          </label>
                        </div>
                      ) : (
                        selectedWidget.widget.type !== "navigation" && (
                          <div className="property-readout compact">
                            <span>En modo Estudiar</span>
                            <strong>
                              {selectedWidget.widget.type === "richText"
                                ? "Lectura y enlaces"
                                : selectedWidget.widget.type === "image"
                                  ? "Visualización"
                                  : selectedWidget.widget.type === "table"
                                    ? "Consulta"
                                    : "Visualización"}
                            </strong>
                          </div>
                        )
                      )}
                      <label className="property-toggle">
                        <span>
                          <strong>Bloquear widget</strong>
                          <small>Evita mover, redimensionar o editar por accidente.</small>
                        </span>
                        <input
                          type="checkbox"
                          checked={Boolean(selectedWidget.widget.locked)}
                          onChange={(event) =>
                            onWidgetChange({
                              ...selectedWidget.widget,
                              locked: event.target.checked,
                            })
                          }
                        />
                      </label>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="empty-properties">
              <Settings2 size={22} />
              <h3>Selecciona un widget</h3>
              <p>Sus propiedades de posición, tamaño y contenido aparecerán aquí.</p>
            </div>
          )}
        </section>
      ) : null}
      {imagePickerTarget ? (
        <ImagePicker
          initialUrl={
            selectedWidget?.widget.type === "image"
              ? selectedWidget.widget.data.url
              : selectedWidget?.widget.type === "hotspots"
                ? selectedWidget.widget.data.image.url
                : ""
          }
          onClose={() => setImagePickerTarget(null)}
          onSelect={(image) => {
            const current = selectedWidget?.widget;
            if (imagePickerTarget === "image" && current?.type === "image") {
              onWidgetChange({
                ...current,
                data: { ...current.data, ...image },
              });
            }
            if (imagePickerTarget === "hotspots" && current?.type === "hotspots") {
              onWidgetChange({ ...current, data: { ...current.data, image } });
            }
            setImagePickerTarget(null);
          }}
        />
      ) : null}
    </aside>
  );
}
