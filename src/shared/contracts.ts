import { z } from "zod";

const trimmedString = (max: number) => z.string().trim().min(1).max(max);

export const widgetFrameSchema = z.object({
  x: z.number().min(0),
  y: z.number().min(0),
  width: z.number().min(240).max(1600),
  height: z.number().min(160).max(10_000),
  z: z.number().int().nonnegative(),
  heightMode: z.enum(["auto", "fixed"]).optional(),
});

export const widgetAppearanceSchema = z.object({
  backgroundColor: z.string().max(32),
  textColor: z.string().max(32),
  accentColor: z.string().max(32),
  border: z.enum(["none", "subtle"]),
  borderRadius: z.number().int().min(0).max(32),
  padding: z.number().int().min(0).max(48),
});

export const userSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  avatarUrl: z.string().url().nullable(),
});

export const aiCredentialStatusSchema = z.object({
  configured: z.boolean(),
  lastFour: z.string().length(4).nullable(),
  updatedAt: z.string().datetime().nullable(),
});

export const saveAiCredentialInputSchema = z.object({
  apiKey: z.string().trim().min(20).max(500),
});

export const aiWidgetLayoutSchema = z.object({
  row: z.number().int().min(1).max(20),
  column: z.number().int().min(1).max(12),
  columnSpan: z.number().int().min(2).max(12),
  minHeight: z.number().int().min(160).max(1_200),
  group: z.string().max(100),
  emphasis: z.enum(["primary", "normal", "supporting"]),
});

const aiLayout = { layout: aiWidgetLayoutSchema };
const aiRichItem = z.object({ title: z.string().max(500), markdown: z.string().max(10_000) });
const aiImage = {
  imageQuery: z.string().min(3).max(500),
  sourceUrl: z.string().url().max(4_000),
  sourcePageUrl: z.string().url().max(4_000),
  alt: z.string().min(1).max(500),
  caption: z.string().max(1_000),
  attribution: z.string().max(1_000),
};

export const aiProposalWidgetSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("richText"), markdown: z.string().min(1).max(20_000), ...aiLayout }),
  z.object({ type: z.literal("image"), ...aiImage, ...aiLayout }),
  z.object({ type: z.literal("diagram"), description: z.string().min(1).max(2_000), ...aiLayout }),
  z.object({
    type: z.literal("pele"),
    source: z.string().min(1).max(50_000),
    caption: z.string().max(1_000),
    ...aiLayout,
  }),
  z.object({
    type: z.literal("table"),
    headers: z.array(z.string().max(500)).min(1).max(6),
    rows: z
      .array(z.array(z.string().max(2_000)).min(1).max(6))
      .min(1)
      .max(6),
    ...aiLayout,
  }),
  z.object({
    type: z.literal("navigation"),
    label: z.string().min(1).max(120),
    canvasId: z.string().min(1),
    style: z.enum(["primary", "secondary"]),
    ...aiLayout,
  }),
  z.object({
    type: z.literal("quiz"),
    question: z.string().trim().min(1).max(2_000),
    options: z
      .array(z.object({ label: z.string().trim().min(1).max(1_000), correct: z.boolean() }))
      .min(2)
      .max(8),
    explanation: z.string().max(2_000),
    selectionMode: z.enum(["single", "multiple"]),
    ...aiLayout,
  }),
  z.object({
    type: z.literal("accordion"),
    title: z.string().max(500),
    items: z.array(aiRichItem).min(1).max(12),
    allowMultiple: z.boolean(),
    ...aiLayout,
  }),
  z.object({
    type: z.literal("tabs"),
    title: z.string().max(500),
    items: z.array(aiRichItem).min(1).max(8),
    ...aiLayout,
  }),
  z.object({
    type: z.literal("flashcards"),
    title: z.string().max(500),
    cards: z
      .array(z.object({ front: z.string().max(5_000), back: z.string().max(5_000) }))
      .min(1)
      .max(20),
    ...aiLayout,
  }),
  z.object({
    type: z.literal("timeline"),
    title: z.string().max(500),
    items: z
      .array(
        z.object({
          date: z.string().max(120),
          title: z.string().max(500),
          markdown: z.string().max(10_000),
        }),
      )
      .min(1)
      .max(20),
    ...aiLayout,
  }),
  z.object({
    type: z.literal("hotspots"),
    title: z.string().max(500),
    ...aiImage,
    hotspots: z
      .array(
        z.object({
          xPercent: z.number().min(0).max(100),
          yPercent: z.number().min(0).max(100),
          title: z.string().max(500),
          markdown: z.string().max(10_000),
        }),
      )
      .max(20),
    ...aiLayout,
  }),
  z.object({
    type: z.literal("sorting"),
    title: z.string().max(500),
    prompt: z.string().max(1_000),
    mode: z.enum(["classify", "order", "match"]),
    targets: z.array(z.string().max(500)).min(0).max(8),
    items: z
      .array(
        z.object({
          label: z.string().max(500),
          targetIndex: z.number().int().min(0).max(7).nullable(),
        }),
      )
      .min(2)
      .max(12),
    ...aiLayout,
  }),
]);

export const aiProposalSchema = z.object({
  summary: z.string().trim().min(1).max(1_000),
  widgets: z.array(aiProposalWidgetSchema).min(1).max(8),
});

export const createAiProposalInputSchema = z.object({
  prompt: z.string().trim().min(3).max(4_000),
  canvasTitle: z.string().max(500),
  pages: z.array(z.object({ id: z.string().min(1), title: z.string().max(500) })).max(500),
});

export const importRemoteResourceInputSchema = z.object({
  sourceUrl: z.string().url().max(4_000),
  imageQuery: z.string().trim().min(3).max(500).optional(),
  name: z.string().trim().min(1).max(180),
});

export const projectAccessLevelSchema = z.enum(["private", "public_read", "public_edit"]);

export const projectSummarySchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: z.string(),
  accessLevel: projectAccessLevelSchema,
  ownerId: z.string().min(1),
  ownerName: z.string().min(1),
  isOwner: z.boolean(),
  canEdit: z.boolean(),
  revision: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const projectViewerTemplateSchema = z.enum([
  "outline",
  "reader",
  "magazine",
  "presentation",
]);

export const projectThemeSchema = z.enum(["minimal", "editorial", "classroom", "nature", "night"]);

export const projectSettingsSchema = z.object({
  viewerTemplate: projectViewerTemplateSchema.default("outline"),
  theme: projectThemeSchema.default("minimal"),
});

export const nodeKindSchema = z.enum(["container", "canvas"]);

export const nodeSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  parentId: z.string().min(1).nullable(),
  kind: nodeKindSchema,
  title: z.string(),
  position: z.number().int().nonnegative(),
  canvasId: z.string().min(1).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type RichTextMark = {
  type: "bold" | "italic" | "underline" | "strike" | "code" | "link" | "textStyle";
  href?: string | undefined;
  color?: string | undefined;
  fontFamily?: string | undefined;
  fontSize?: number | undefined;
};
export type RichTextNode = {
  type: string;
  text?: string | undefined;
  attrs?: Record<string, string | number | boolean> | undefined;
  marks?: RichTextMark[] | undefined;
  content?: RichTextNode[] | undefined;
};

export const richTextNodeSchema: z.ZodType<RichTextNode> = z.lazy(() =>
  z.object({
    type: z.string().min(1).max(40),
    text: z.string().max(200_000).optional(),
    attrs: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
    marks: z
      .array(
        z.object({
          type: z.enum(["bold", "italic", "underline", "strike", "code", "link", "textStyle"]),
          href: z.string().max(4_000).optional(),
          color: z
            .string()
            .regex(/^#[0-9a-f]{6}$/iu)
            .optional(),
          fontFamily: z.enum(["system", "serif", "mono", "arial", "verdana"]).optional(),
          fontSize: z.number().int().min(10).max(72).optional(),
        }),
      )
      .optional(),
    content: z.array(richTextNodeSchema).max(10_000).optional(),
  }),
);

export const richTextDocumentSchema = richTextNodeSchema.refine((node) => node.type === "doc", {
  message: "El nodo raíz debe ser doc.",
});

const legacyRichTextWidgetSchema = z.object({
  id: z.string().min(1),
  type: z.literal("richText"),
  schemaVersion: z.literal(1),
  data: z.object({ markdown: z.string().max(200_000) }),
  frame: widgetFrameSchema.optional(),
  locked: z.boolean().optional(),
});

export const richTextWidgetSchema = z.object({
  id: z.string().min(1),
  type: z.literal("richText"),
  schemaVersion: z.literal(2),
  data: z.object({ document: richTextDocumentSchema }),
  frame: widgetFrameSchema.optional(),
  locked: z.boolean().optional(),
  appearance: widgetAppearanceSchema.optional(),
});

export const imageWidgetSchema = z.object({
  id: z.string().min(1),
  type: z.literal("image"),
  schemaVersion: z.literal(1),
  data: z.object({
    resourceId: z.string().min(1).nullable(),
    url: z.string().min(1),
    alt: z.string().max(500),
    caption: z.string().max(1000).default(""),
    fit: z.enum(["contain", "cover", "fill"]).default("contain"),
  }),
  frame: widgetFrameSchema.optional(),
  locked: z.boolean().optional(),
  appearance: widgetAppearanceSchema.optional(),
});

export const diagramWidgetSchema = z.object({
  id: z.string().min(1),
  type: z.literal("diagram"),
  schemaVersion: z.literal(1),
  data: z.object({
    elements: z.array(z.record(z.string(), z.unknown())),
    appState: z.record(z.string(), z.unknown()),
    files: z.record(z.string(), z.unknown()),
  }),
  frame: widgetFrameSchema.optional(),
  locked: z.boolean().optional(),
  appearance: widgetAppearanceSchema.optional(),
});

export const peleWidgetSchema = z.object({
  id: z.string().min(1),
  type: z.literal("pele"),
  schemaVersion: z.literal(1),
  data: z.object({
    source: z.string().max(50_000),
    caption: z.string().max(1000).default(""),
  }),
  frame: widgetFrameSchema.optional(),
  locked: z.boolean().optional(),
  appearance: widgetAppearanceSchema.optional(),
});

const legacyTableWidgetSchema = z.object({
  id: z.string().min(1),
  type: z.literal("table"),
  schemaVersion: z.literal(1),
  data: z.object({
    rows: z.number().int().min(1).max(20),
    columns: z.number().int().min(1).max(12),
    cells: z.array(z.string().max(20_000)).max(240),
  }),
  frame: widgetFrameSchema.optional(),
  locked: z.boolean().optional(),
});

export const tableWidgetSchema = z.object({
  id: z.string().min(1),
  type: z.literal("table"),
  schemaVersion: z.literal(2),
  data: z.object({
    rows: z.number().int().min(1).max(20),
    columns: z.number().int().min(1).max(12),
    cells: z.array(z.object({ id: z.string().min(1), text: z.string().max(20_000) })).max(240),
  }),
  frame: widgetFrameSchema.optional(),
  locked: z.boolean().optional(),
  appearance: widgetAppearanceSchema.optional(),
});

export const navigationWidgetSchema = z.object({
  id: z.string().min(1),
  type: z.literal("navigation"),
  schemaVersion: z.literal(1),
  data: z.object({
    label: z.string().max(120),
    destination: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("canvas"), canvasId: z.string().min(1) }),
      z.object({ kind: z.literal("external"), url: z.string().max(4_000) }),
    ]),
    style: z.enum(["primary", "secondary"]),
    openInNewTab: z.boolean(),
    variant: z.enum(["button", "index", "bar"]).optional(),
    title: z.string().max(120).optional(),
    items: z
      .array(
        z.object({
          id: z.string().min(1),
          label: z.string().min(1).max(120),
          canvasId: z.string().min(1),
        }),
      )
      .max(100)
      .optional(),
    showCurrent: z.boolean().optional(),
  }),
  frame: widgetFrameSchema.optional(),
  locked: z.boolean().optional(),
  appearance: widgetAppearanceSchema.optional(),
});

export const quizWidgetSchema = z.object({
  id: z.string().min(1),
  type: z.literal("quiz"),
  schemaVersion: z.literal(1),
  data: z.object({
    question: z.string().max(2_000),
    options: z
      .array(
        z.object({
          id: z.string().min(1),
          label: z.string().max(1_000),
          correct: z.boolean(),
        }),
      )
      .min(2)
      .max(8),
    explanation: z.string().max(2_000),
    selectionMode: z.enum(["single", "multiple"]).default("single"),
    allowRetry: z.boolean().default(true),
    showExplanation: z.boolean().default(true),
  }),
  frame: widgetFrameSchema.optional(),
  locked: z.boolean().optional(),
  appearance: widgetAppearanceSchema.optional(),
});

const legacyAccordionWidgetSchema = z.object({
  id: z.string().min(1),
  type: z.literal("accordion"),
  schemaVersion: z.literal(1),
  data: z.object({
    title: z.string().max(500),
    items: z
      .array(
        z.object({
          id: z.string().min(1),
          title: z.string().max(500),
          content: z.string().max(10_000),
        }),
      )
      .min(1)
      .max(20),
    allowMultiple: z.boolean().default(false),
  }),
  frame: widgetFrameSchema.optional(),
  locked: z.boolean().optional(),
  appearance: widgetAppearanceSchema.optional(),
});

export const accordionWidgetSchema = z.object({
  id: z.string().min(1),
  type: z.literal("accordion"),
  schemaVersion: z.literal(2),
  data: z.object({
    title: z.string().max(500),
    items: z
      .array(
        z.object({
          id: z.string().min(1),
          title: z.string().max(500),
          content: richTextDocumentSchema,
        }),
      )
      .min(1)
      .max(20),
    allowMultiple: z.boolean().default(false),
  }),
  frame: widgetFrameSchema.optional(),
  locked: z.boolean().optional(),
  appearance: widgetAppearanceSchema.optional(),
});

export const tabsWidgetSchema = z.object({
  id: z.string().min(1),
  type: z.literal("tabs"),
  schemaVersion: z.literal(1),
  data: z.object({
    title: z.string().max(500),
    items: z
      .array(
        z.object({
          id: z.string().min(1),
          title: z.string().max(500),
          content: richTextDocumentSchema,
        }),
      )
      .min(1)
      .max(12),
  }),
  frame: widgetFrameSchema.optional(),
  locked: z.boolean().optional(),
  appearance: widgetAppearanceSchema.optional(),
});

export const flashcardsWidgetSchema = z.object({
  id: z.string().min(1),
  type: z.literal("flashcards"),
  schemaVersion: z.literal(1),
  data: z.object({
    title: z.string().max(500),
    cards: z
      .array(
        z.object({
          id: z.string().min(1),
          front: richTextDocumentSchema,
          back: richTextDocumentSchema,
        }),
      )
      .min(1)
      .max(30),
  }),
  frame: widgetFrameSchema.optional(),
  locked: z.boolean().optional(),
  appearance: widgetAppearanceSchema.optional(),
});

export const timelineWidgetSchema = z.object({
  id: z.string().min(1),
  type: z.literal("timeline"),
  schemaVersion: z.literal(1),
  data: z.object({
    title: z.string().max(500),
    items: z
      .array(
        z.object({
          id: z.string().min(1),
          date: z.string().max(120),
          title: z.string().max(500),
          content: richTextDocumentSchema,
        }),
      )
      .min(1)
      .max(30),
  }),
  frame: widgetFrameSchema.optional(),
  locked: z.boolean().optional(),
  appearance: widgetAppearanceSchema.optional(),
});

export const hotspotsWidgetSchema = z.object({
  id: z.string().min(1),
  type: z.literal("hotspots"),
  schemaVersion: z.literal(1),
  data: z.object({
    title: z.string().max(500),
    image: z.object({
      resourceId: z.string().min(1).nullable(),
      url: z.string().max(4_000),
      alt: z.string().max(500),
    }),
    hotspots: z
      .array(
        z.object({
          id: z.string().min(1),
          xPercent: z.number().min(0).max(100),
          yPercent: z.number().min(0).max(100),
          title: z.string().max(500),
          content: richTextDocumentSchema,
        }),
      )
      .max(30),
  }),
  frame: widgetFrameSchema.optional(),
  locked: z.boolean().optional(),
  appearance: widgetAppearanceSchema.optional(),
});

export const sortingWidgetSchema = z.object({
  id: z.string().min(1),
  type: z.literal("sorting"),
  schemaVersion: z.literal(1),
  data: z.object({
    title: z.string().max(500),
    prompt: z.string().max(1_000),
    mode: z.enum(["classify", "order", "match"]),
    targets: z.array(z.object({ id: z.string().min(1), label: z.string().max(500) })).max(8),
    items: z
      .array(
        z.object({
          id: z.string().min(1),
          label: z.string().max(500),
          targetId: z.string().min(1).nullable(),
        }),
      )
      .min(2)
      .max(12),
    allowRetry: z.boolean().default(true),
  }),
  frame: widgetFrameSchema.optional(),
  locked: z.boolean().optional(),
  appearance: widgetAppearanceSchema.optional(),
});

export const widgetSchema = z.discriminatedUnion("type", [
  richTextWidgetSchema,
  imageWidgetSchema,
  diagramWidgetSchema,
  peleWidgetSchema,
  tableWidgetSchema,
  navigationWidgetSchema,
  quizWidgetSchema,
  accordionWidgetSchema,
  tabsWidgetSchema,
  flashcardsWidgetSchema,
  timelineWidgetSchema,
  hotspotsWidgetSchema,
  sortingWidgetSchema,
]);

export const legacyCanvasCompositionSchema = z.object({
  version: z.literal(1),
  sections: z.array(
    z.object({
      id: z.string().min(1),
      columns: z.array(
        z.object({
          id: z.string().min(1),
          width: z.number().int().min(1).max(12),
          widgets: z.array(
            z.discriminatedUnion("type", [
              legacyRichTextWidgetSchema,
              imageWidgetSchema,
              diagramWidgetSchema,
              peleWidgetSchema,
              legacyTableWidgetSchema,
              navigationWidgetSchema,
              quizWidgetSchema,
              legacyAccordionWidgetSchema,
              tabsWidgetSchema,
              flashcardsWidgetSchema,
              timelineWidgetSchema,
              hotspotsWidgetSchema,
              sortingWidgetSchema,
            ]),
          ),
        }),
      ),
    }),
  ),
});

const objectPlacementSchema = z.object({
  parentId: z.string().min(1).nullable(),
  slotId: z.string().min(1).nullable(),
  order: z.number().int().nonnegative(),
  groupId: z.string().min(1).max(100).optional(),
});

export const canvasObjectSchema = z.discriminatedUnion("type", [
  richTextWidgetSchema.extend(objectPlacementSchema.shape),
  imageWidgetSchema.extend(objectPlacementSchema.shape),
  diagramWidgetSchema.extend(objectPlacementSchema.shape),
  peleWidgetSchema.extend(objectPlacementSchema.shape),
  tableWidgetSchema.extend(objectPlacementSchema.shape),
  navigationWidgetSchema.extend(objectPlacementSchema.shape),
  quizWidgetSchema.extend(objectPlacementSchema.shape),
  accordionWidgetSchema.extend(objectPlacementSchema.shape),
  tabsWidgetSchema.extend(objectPlacementSchema.shape),
  flashcardsWidgetSchema.extend(objectPlacementSchema.shape),
  timelineWidgetSchema.extend(objectPlacementSchema.shape),
  hotspotsWidgetSchema.extend(objectPlacementSchema.shape),
  sortingWidgetSchema.extend(objectPlacementSchema.shape),
]);

export const canvasCompositionSchema = z.object({
  version: z.literal(2),
  rootIds: z.array(z.string().min(1)),
  objects: z.record(z.string(), canvasObjectSchema),
});

export const persistedCanvasCompositionSchema = z.union([
  legacyCanvasCompositionSchema,
  canvasCompositionSchema,
]);

export const canvasSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  title: z.string(),
  description: z.string(),
  composition: canvasCompositionSchema,
  schemaVersion: z.number().int().positive(),
  revision: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const projectDetailSchema = projectSummarySchema.extend({
  settings: projectSettingsSchema,
  nodes: z.array(nodeSchema),
  canvases: z.array(canvasSchema),
});

export const createProjectInputSchema = z.object({
  name: trimmedString(120),
  description: z.string().trim().max(1000).default(""),
});

export const updateProjectInputSchema = z
  .object({
    name: trimmedString(120).optional(),
    description: z.string().trim().max(1000).optional(),
    settings: projectSettingsSchema.optional(),
    accessLevel: projectAccessLevelSchema.optional(),
    revision: z.number().int().positive(),
  })
  .refine(
    ({ name, description, settings, accessLevel }) =>
      name !== undefined ||
      description !== undefined ||
      settings !== undefined ||
      accessLevel !== undefined,
    {
      message: "Incluye al menos un campo para actualizar.",
    },
  );

export const createNodeInputSchema = z.object({
  kind: nodeKindSchema,
  title: trimmedString(160),
  parentId: z.string().min(1).nullable().default(null),
  projectRevision: z.number().int().positive(),
});

export const updateNodeInputSchema = z.object({
  title: trimmedString(160),
  projectRevision: z.number().int().positive(),
});

export const moveNodeInputSchema = z.object({
  parentId: z.string().min(1).nullable(),
  position: z.number().int().nonnegative(),
  projectRevision: z.number().int().positive(),
});

export const mutateNodeInputSchema = z.object({
  projectRevision: z.number().int().positive(),
});

export const updateCanvasInputSchema = z.object({
  composition: canvasCompositionSchema,
  revision: z.number().int().positive(),
});

export const resourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  mimeType: z.string().min(1),
  byteSize: z.number().int().positive(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  url: z.string().min(1),
  createdAt: z.string().datetime(),
});

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    requestId: z.string().optional(),
  }),
});

export type User = z.infer<typeof userSchema>;
export type AiCredentialStatus = z.infer<typeof aiCredentialStatusSchema>;
export type AiProposal = z.infer<typeof aiProposalSchema>;
export type ProjectSummary = z.infer<typeof projectSummarySchema>;
export type ProjectDetail = z.infer<typeof projectDetailSchema>;
export type ProjectSettings = z.infer<typeof projectSettingsSchema>;
export type ProjectViewerTemplate = z.infer<typeof projectViewerTemplateSchema>;
export type ProjectTheme = z.infer<typeof projectThemeSchema>;
export type ProjectAccessLevel = z.infer<typeof projectAccessLevelSchema>;
export type NodeItem = z.infer<typeof nodeSchema>;
export type Canvas = z.infer<typeof canvasSchema>;
export type CanvasComposition = z.infer<typeof canvasCompositionSchema>;
export type LegacyCanvasComposition = z.infer<typeof legacyCanvasCompositionSchema>;
export type CanvasObject = z.infer<typeof canvasObjectSchema>;
export type RichTextWidget = z.infer<typeof richTextWidgetSchema>;
export type ImageWidget = z.infer<typeof imageWidgetSchema>;
export type DiagramWidget = z.infer<typeof diagramWidgetSchema>;
export type PeleWidget = z.infer<typeof peleWidgetSchema>;
export type TableWidget = z.infer<typeof tableWidgetSchema>;
export type NavigationWidget = z.infer<typeof navigationWidgetSchema>;
export type QuizWidget = z.infer<typeof quizWidgetSchema>;
export type AccordionWidget = z.infer<typeof accordionWidgetSchema>;
export type TabsWidget = z.infer<typeof tabsWidgetSchema>;
export type FlashcardsWidget = z.infer<typeof flashcardsWidgetSchema>;
export type TimelineWidget = z.infer<typeof timelineWidgetSchema>;
export type HotspotsWidget = z.infer<typeof hotspotsWidgetSchema>;
export type SortingWidget = z.infer<typeof sortingWidgetSchema>;
export type Widget = z.infer<typeof widgetSchema>;
export type WidgetFrame = z.infer<typeof widgetFrameSchema>;
export type WidgetAppearance = z.infer<typeof widgetAppearanceSchema>;
export type Resource = z.infer<typeof resourceSchema>;
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
export type CreateNodeInput = z.infer<typeof createNodeInputSchema>;
