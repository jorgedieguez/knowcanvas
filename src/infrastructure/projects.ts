import { DomainError } from "../domain/errors";
import {
  canvasCompositionV2Schema,
  parseStoredCanvasComposition,
} from "../domain/canvas-composition";
import { assertValidMove, assertValidParent, normalizePosition } from "../domain/tree";
import {
  buildDemoBookPages,
  buildKnowCanvasDemoPages,
  DEMO_SEED_VERSION,
  KNOWCANVAS_DEMO_SEED_VERSION,
} from "../domain/demo-project";
import type {
  Canvas,
  CanvasComposition,
  CreateNodeInput,
  CreateProjectInput,
  NodeItem,
  ProjectDetail,
  ProjectAccessLevel,
  ProjectSettings,
  ProjectSummary,
} from "../shared/contracts";
import { projectSettingsSchema } from "../shared/contracts";

type ProjectRow = {
  id: string;
  owner_user_id: string;
  owner_name: string;
  name: string;
  description: string;
  access_level: ProjectAccessLevel;
  settings_json: string;
  revision: number;
  created_at: string;
  updated_at: string;
};

function mapProjectSettings(value: string): ProjectSettings {
  try {
    return projectSettingsSchema.parse(JSON.parse(value) as unknown);
  } catch {
    return projectSettingsSchema.parse({});
  }
}

type NodeRow = {
  id: string;
  project_id: string;
  parent_id: string | null;
  kind: "container" | "canvas";
  title: string;
  position: number;
  canvas_id: string | null;
  created_at: string;
  updated_at: string;
};

type CanvasRow = {
  id: string;
  project_id: string;
  title: string;
  description: string;
  composition_json: string;
  schema_version: number;
  revision: number;
  created_at: string;
  updated_at: string;
};

function mapProject(row: ProjectRow, currentUserId: string): ProjectSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    accessLevel: row.access_level,
    ownerId: row.owner_user_id,
    ownerName: row.owner_name,
    isOwner: row.owner_user_id === currentUserId,
    canEdit: row.owner_user_id === currentUserId || row.access_level === "public_edit",
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function updateCanvasComposition(
  db: D1Database,
  ownerUserId: string,
  canvasId: string,
  composition: CanvasComposition,
  expectedRevision: number,
): Promise<Canvas> {
  const row = await db
    .prepare(
      `SELECT c.id, c.project_id, c.title, c.description, c.composition_json, c.schema_version,
              c.revision, c.created_at, c.updated_at
         FROM canvases c
         JOIN projects p ON p.id = c.project_id
        WHERE c.id = ? AND (p.owner_user_id = ? OR p.access_level = 'public_edit')
          AND c.deleted_at IS NULL AND p.deleted_at IS NULL`,
    )
    .bind(canvasId, ownerUserId)
    .first<CanvasRow>();
  if (!row) throw new DomainError("AUTH_FORBIDDEN", "Este libro es de solo lectura.", 403);
  if (row.revision !== expectedRevision) {
    throw new DomainError(
      "REVISION_CONFLICT",
      "El lienzo cambió desde la última lectura. Recarga antes de guardar.",
      409,
    );
  }

  const now = new Date().toISOString();
  const storedComposition = canvasCompositionV2Schema.parse(composition);
  const result = await db
    .prepare(
      `UPDATE canvases
          SET composition_json = ?, schema_version = 2, revision = revision + 1, updated_at = ?
        WHERE id = ? AND revision = ? AND deleted_at IS NULL`,
    )
    .bind(JSON.stringify(storedComposition), now, canvasId, expectedRevision)
    .run();
  if (result.meta.changes !== 1) {
    throw new DomainError("REVISION_CONFLICT", "El lienzo cambió antes de guardar.", 409);
  }
  return mapCanvas({
    ...row,
    composition_json: JSON.stringify(storedComposition),
    schema_version: 2,
    revision: expectedRevision + 1,
    updated_at: now,
  });
}

function mapNode(row: NodeRow): NodeItem {
  return {
    id: row.id,
    projectId: row.project_id,
    parentId: row.parent_id,
    kind: row.kind,
    title: row.title,
    position: row.position,
    canvasId: row.canvas_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCanvas(row: CanvasRow): Canvas {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    composition: parseStoredCanvasComposition(JSON.parse(row.composition_json) as unknown),
    schemaVersion: row.schema_version,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function projectForAccess(
  db: D1Database,
  userId: string,
  projectId: string,
  access: "read" | "edit" | "owner",
): Promise<ProjectRow> {
  const predicate =
    access === "owner"
      ? "p.owner_user_id = ?"
      : access === "edit"
        ? "(p.owner_user_id = ? OR p.access_level = 'public_edit')"
        : "(p.owner_user_id = ? OR p.access_level != 'private')";
  const row = await db
    .prepare(
      `SELECT p.id, p.owner_user_id, u.display_name AS owner_name, p.name, p.description,
              p.access_level, p.settings_json, p.revision, p.created_at, p.updated_at
         FROM projects p JOIN users u ON u.id = p.owner_user_id
        WHERE p.id = ? AND ${predicate} AND p.deleted_at IS NULL`,
    )
    .bind(projectId, userId)
    .first<ProjectRow>();

  if (!row) throw new DomainError("AUTH_FORBIDDEN", "No tienes acceso a este libro.", 403);
  return row;
}

const readableProject = (db: D1Database, userId: string, projectId: string) =>
  projectForAccess(db, userId, projectId, "read");
const editableProject = (db: D1Database, userId: string, projectId: string) =>
  projectForAccess(db, userId, projectId, "edit");
const ownedProject = (db: D1Database, userId: string, projectId: string) =>
  projectForAccess(db, userId, projectId, "owner");

function assertRevision(project: ProjectRow, expected: number): void {
  if (project.revision !== expected) {
    throw new DomainError(
      "REVISION_CONFLICT",
      "El libro cambió desde la última lectura. Recarga antes de guardar.",
      409,
      { expected, actual: project.revision },
    );
  }
}

export async function listProjects(db: D1Database, ownerUserId: string): Promise<ProjectSummary[]> {
  await ensureDemoProject(db, ownerUserId);
  const result = await db
    .prepare(
      `SELECT p.id, p.owner_user_id, u.display_name AS owner_name, p.name, p.description,
              p.access_level, p.settings_json, p.revision, p.created_at, p.updated_at
         FROM projects p JOIN users u ON u.id = p.owner_user_id
        WHERE (p.owner_user_id = ? OR p.access_level != 'private') AND p.deleted_at IS NULL
        ORDER BY (p.owner_user_id = ?) DESC, p.updated_at DESC`,
    )
    .bind(ownerUserId, ownerUserId)
    .all<ProjectRow>();
  return result.results.map((row) => mapProject(row, ownerUserId));
}

export async function getProject(
  db: D1Database,
  ownerUserId: string,
  projectId: string,
): Promise<ProjectDetail> {
  const project = await readableProject(db, ownerUserId, projectId);
  const [nodesResult, canvasesResult] = await Promise.all([
    db
      .prepare(
        `SELECT id, project_id, parent_id, kind, title, position, canvas_id, created_at, updated_at
           FROM nodes
          WHERE project_id = ? AND deleted_at IS NULL
          ORDER BY parent_id, position, created_at`,
      )
      .bind(projectId)
      .all<NodeRow>(),
    db
      .prepare(
        `SELECT id, project_id, title, description, composition_json, schema_version,
                revision, created_at, updated_at
           FROM canvases
          WHERE project_id = ? AND deleted_at IS NULL`,
      )
      .bind(projectId)
      .all<CanvasRow>(),
  ]);

  return {
    ...mapProject(project, ownerUserId),
    settings: mapProjectSettings(project.settings_json),
    nodes: nodesResult.results.map(mapNode),
    canvases: canvasesResult.results.map(mapCanvas),
  };
}

export async function getPublicProject(db: D1Database, projectId: string): Promise<ProjectDetail> {
  const project = await db
    .prepare(
      `SELECT p.id, p.owner_user_id, u.display_name AS owner_name, p.name, p.description,
              p.access_level, p.settings_json, p.revision, p.created_at, p.updated_at
         FROM projects p JOIN users u ON u.id = p.owner_user_id
        WHERE p.id = ? AND p.access_level != 'private' AND p.deleted_at IS NULL`,
    )
    .bind(projectId)
    .first<ProjectRow>();
  if (!project)
    throw new DomainError("NOT_FOUND", "Este libro no está disponible públicamente.", 404);

  const [nodesResult, canvasesResult] = await Promise.all([
    db
      .prepare(
        `SELECT id, project_id, parent_id, kind, title, position, canvas_id, created_at, updated_at
           FROM nodes WHERE project_id = ? AND deleted_at IS NULL
          ORDER BY parent_id, position, created_at`,
      )
      .bind(projectId)
      .all<NodeRow>(),
    db
      .prepare(
        `SELECT id, project_id, title, description, composition_json, schema_version,
                revision, created_at, updated_at
           FROM canvases WHERE project_id = ? AND deleted_at IS NULL`,
      )
      .bind(projectId)
      .all<CanvasRow>(),
  ]);

  return {
    ...mapProject(project, ""),
    isOwner: false,
    canEdit: false,
    settings: mapProjectSettings(project.settings_json),
    nodes: nodesResult.results.map(mapNode),
    canvases: canvasesResult.results.map(mapCanvas),
  };
}

export async function createProject(
  db: D1Database,
  ownerUserId: string,
  input: CreateProjectInput,
): Promise<ProjectDetail> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO projects
        (id, owner_user_id, name, description, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, ownerUserId, input.name, input.description, now, now)
    .run();
  return getProject(db, ownerUserId, id);
}

export async function updateProject(
  db: D1Database,
  ownerUserId: string,
  projectId: string,
  input: {
    name?: string;
    description?: string;
    settings?: ProjectSettings;
    accessLevel?: ProjectAccessLevel;
    revision: number;
  },
): Promise<ProjectSummary> {
  const project = await ownedProject(db, ownerUserId, projectId);
  assertRevision(project, input.revision);
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `UPDATE projects
          SET name = ?, description = ?, settings_json = ?, access_level = ?,
              revision = revision + 1, updated_at = ?
        WHERE id = ? AND owner_user_id = ? AND revision = ? AND deleted_at IS NULL`,
    )
    .bind(
      input.name ?? project.name,
      input.description ?? project.description,
      input.settings ? JSON.stringify(input.settings) : project.settings_json,
      input.accessLevel ?? project.access_level,
      now,
      projectId,
      ownerUserId,
      input.revision,
    )
    .run();
  if (result.meta.changes !== 1) {
    throw new DomainError("REVISION_CONFLICT", "El libro cambió antes de guardar.", 409);
  }
  return mapProject(
    {
      ...project,
      name: input.name ?? project.name,
      description: input.description ?? project.description,
      access_level: input.accessLevel ?? project.access_level,
      revision: project.revision + 1,
      updated_at: now,
    },
    ownerUserId,
  );
}

export async function softDeleteProject(
  db: D1Database,
  ownerUserId: string,
  projectId: string,
  revision: number,
): Promise<void> {
  const project = await ownedProject(db, ownerUserId, projectId);
  assertRevision(project, revision);
  const result = await db
    .prepare(
      `UPDATE projects SET deleted_at = ?, updated_at = ?, revision = revision + 1
        WHERE id = ? AND owner_user_id = ? AND revision = ? AND deleted_at IS NULL`,
    )
    .bind(new Date().toISOString(), new Date().toISOString(), projectId, ownerUserId, revision)
    .run();
  if (result.meta.changes !== 1) {
    throw new DomainError("REVISION_CONFLICT", "El libro cambió antes de eliminarse.", 409);
  }
}

async function activeNodes(db: D1Database, projectId: string): Promise<NodeItem[]> {
  const result = await db
    .prepare(
      `SELECT id, project_id, parent_id, kind, title, position, canvas_id, created_at, updated_at
         FROM nodes WHERE project_id = ? AND deleted_at IS NULL`,
    )
    .bind(projectId)
    .all<NodeRow>();
  return result.results.map(mapNode);
}

export async function createNode(
  db: D1Database,
  ownerUserId: string,
  projectId: string,
  input: CreateNodeInput,
): Promise<{ node: NodeItem; projectRevision: number }> {
  const project = await editableProject(db, ownerUserId, projectId);
  assertRevision(project, input.projectRevision);
  const nodes = await activeNodes(db, projectId);
  assertValidParent(nodes, input.parentId);
  const position = nodes.filter((node) => node.parentId === input.parentId).length;
  const id = crypto.randomUUID();
  const canvasId = input.kind === "canvas" ? crypto.randomUUID() : null;
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [];

  if (canvasId) {
    statements.push(
      db
        .prepare(
          `INSERT INTO canvases
            (id, project_id, title, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(canvasId, projectId, input.title, now, now),
    );
  }

  statements.push(
    db
      .prepare(
        `INSERT INTO nodes
          (id, project_id, parent_id, kind, title, position, canvas_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, projectId, input.parentId, input.kind, input.title, position, canvasId, now, now),
    db
      .prepare(
        `UPDATE projects SET revision = revision + 1, updated_at = ?
          WHERE id = ? AND revision = ? AND deleted_at IS NULL`,
      )
      .bind(now, projectId, input.projectRevision),
  );

  const results = await db.batch(statements);
  if (results.at(-1)?.meta.changes !== 1) {
    throw new DomainError("REVISION_CONFLICT", "El libro cambió antes de añadir el elemento.", 409);
  }

  return {
    node: {
      id,
      projectId,
      parentId: input.parentId,
      kind: input.kind,
      title: input.title,
      position,
      canvasId,
      createdAt: now,
      updatedAt: now,
    },
    projectRevision: project.revision + 1,
  };
}

export async function renameNode(
  db: D1Database,
  ownerUserId: string,
  nodeId: string,
  title: string,
  expectedRevision: number,
): Promise<{ node: NodeItem; projectRevision: number }> {
  const node = await editableNode(db, ownerUserId, nodeId);
  const project = await editableProject(db, ownerUserId, node.projectId);
  assertRevision(project, expectedRevision);
  const now = new Date().toISOString();
  const statements = [
    db.prepare("UPDATE nodes SET title = ?, updated_at = ? WHERE id = ?").bind(title, now, nodeId),
    ...(node.canvasId
      ? [
          db
            .prepare("UPDATE canvases SET title = ?, updated_at = ? WHERE id = ?")
            .bind(title, now, node.canvasId),
        ]
      : []),
    db
      .prepare(
        `UPDATE projects SET revision = revision + 1, updated_at = ?
          WHERE id = ? AND revision = ?`,
      )
      .bind(now, node.projectId, expectedRevision),
  ];
  const results = await db.batch(statements);
  if (results.at(-1)?.meta.changes !== 1) {
    throw new DomainError("REVISION_CONFLICT", "El libro cambió antes de renombrar.", 409);
  }
  return { node: { ...node, title, updatedAt: now }, projectRevision: expectedRevision + 1 };
}

async function editableNode(
  db: D1Database,
  ownerUserId: string,
  nodeId: string,
): Promise<NodeItem> {
  const row = await db
    .prepare(
      `SELECT n.id, n.project_id, n.parent_id, n.kind, n.title, n.position, n.canvas_id,
              n.created_at, n.updated_at
         FROM nodes n
         JOIN projects p ON p.id = n.project_id
        WHERE n.id = ? AND (p.owner_user_id = ? OR p.access_level = 'public_edit')
          AND n.deleted_at IS NULL AND p.deleted_at IS NULL`,
    )
    .bind(nodeId, ownerUserId)
    .first<NodeRow>();
  if (!row) throw new DomainError("NOT_FOUND", "El elemento no existe.", 404);
  return mapNode(row);
}

export async function moveNode(
  db: D1Database,
  ownerUserId: string,
  nodeId: string,
  targetParentId: string | null,
  requestedPosition: number,
  expectedRevision: number,
): Promise<{ nodes: NodeItem[]; projectRevision: number }> {
  const moving = await editableNode(db, ownerUserId, nodeId);
  const project = await editableProject(db, ownerUserId, moving.projectId);
  assertRevision(project, expectedRevision);
  const nodes = await activeNodes(db, moving.projectId);
  assertValidMove(nodes, nodeId, targetParentId);
  const siblings = nodes
    .filter((node) => node.parentId === targetParentId && node.id !== nodeId)
    .sort((a, b) => a.position - b.position);
  const position = normalizePosition(requestedPosition, siblings.length);
  siblings.splice(position, 0, { ...moving, parentId: targetParentId });
  const now = new Date().toISOString();
  const statements = siblings.map((node, index) =>
    db
      .prepare("UPDATE nodes SET parent_id = ?, position = ?, updated_at = ? WHERE id = ?")
      .bind(targetParentId, index, now, node.id),
  );
  statements.push(
    db
      .prepare(
        `UPDATE projects SET revision = revision + 1, updated_at = ?
          WHERE id = ? AND revision = ?`,
      )
      .bind(now, moving.projectId, expectedRevision),
  );
  const results = await db.batch(statements);
  if (results.at(-1)?.meta.changes !== 1) {
    throw new DomainError("REVISION_CONFLICT", "El libro cambió antes de mover el elemento.", 409);
  }
  return { nodes: await activeNodes(db, moving.projectId), projectRevision: expectedRevision + 1 };
}

export async function softDeleteNode(
  db: D1Database,
  ownerUserId: string,
  nodeId: string,
  expectedRevision: number,
): Promise<{ projectRevision: number }> {
  const node = await editableNode(db, ownerUserId, nodeId);
  const project = await editableProject(db, ownerUserId, node.projectId);
  assertRevision(project, expectedRevision);
  const now = new Date().toISOString();
  const statements = [
    db
      .prepare(
        `WITH RECURSIVE descendants(id) AS (
           SELECT id FROM nodes WHERE id = ?
           UNION ALL
           SELECT n.id FROM nodes n JOIN descendants d ON n.parent_id = d.id
         )
         UPDATE nodes SET deleted_at = ?, updated_at = ?
          WHERE id IN (SELECT id FROM descendants)`,
      )
      .bind(nodeId, now, now),
    db
      .prepare(
        `UPDATE canvases SET deleted_at = ?, updated_at = ?
          WHERE id IN (SELECT canvas_id FROM nodes WHERE deleted_at = ? AND canvas_id IS NOT NULL)`,
      )
      .bind(now, now, now),
    db
      .prepare(
        `UPDATE projects SET revision = revision + 1, updated_at = ?
          WHERE id = ? AND revision = ?`,
      )
      .bind(now, node.projectId, expectedRevision),
  ];
  const results = await db.batch(statements);
  if (results.at(-1)?.meta.changes !== 1) {
    throw new DomainError("REVISION_CONFLICT", "El libro cambió antes de eliminar.", 409);
  }
  return { projectRevision: expectedRevision + 1 };
}

export async function ensureDemoProject(db: D1Database, ownerUserId: string): Promise<void> {
  await ensureCellDemoProject(db, ownerUserId);
  await ensureKnowCanvasDemoProject(db, ownerUserId);
}

async function ensureCellDemoProject(db: D1Database, ownerUserId: string): Promise<void> {
  const existing = await db
    .prepare("SELECT id, metadata_json FROM projects WHERE owner_user_id = ? AND seed_key = ?")
    .bind(ownerUserId, "explorando-la-celula")
    .first<{ id: string; metadata_json: string }>();
  if (existing) {
    let seedVersion = 0;
    try {
      const metadata = JSON.parse(existing.metadata_json) as { seedVersion?: unknown };
      if (typeof metadata.seedVersion === "number") seedVersion = metadata.seedVersion;
    } catch {
      // Un metadata anterior inválido se sustituye únicamente en el proyecto semilla.
    }
    if (seedVersion < DEMO_SEED_VERSION) await seedDemoBook(db, existing.id);
    return;
  }

  const projectId = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO projects
        (id, owner_user_id, name, description, seed_key, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      projectId,
      ownerUserId,
      "Explorando la célula",
      "Un recorrido interactivo por la célula: estructura, procesos y una actividad final.",
      "explorando-la-celula",
      now,
      now,
    )
    .run();
  await seedDemoBook(db, projectId);
}

async function ensureKnowCanvasDemoProject(db: D1Database, ownerUserId: string): Promise<void> {
  const seedKey = "conoce-knowcanvas";
  const existing = await db
    .prepare("SELECT id, metadata_json FROM projects WHERE owner_user_id = ? AND seed_key = ?")
    .bind(ownerUserId, seedKey)
    .first<{ id: string; metadata_json: string }>();
  if (existing) {
    let seedVersion = 0;
    try {
      const metadata = JSON.parse(existing.metadata_json) as { seedVersion?: unknown };
      if (typeof metadata.seedVersion === "number") seedVersion = metadata.seedVersion;
    } catch {
      // An invalid historical seed metadata is replaced only for this seeded project.
    }
    if (seedVersion < KNOWCANVAS_DEMO_SEED_VERSION) {
      await seedKnowCanvasDemoBook(db, existing.id);
    }
    return;
  }

  const projectId = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO projects
        (id, owner_user_id, name, description, seed_key, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      projectId,
      ownerUserId,
      "Conoce KnowCanvas",
      "Un recorrido práctico por la autoría visual, los widgets educativos y la publicación.",
      seedKey,
      now,
      now,
    )
    .run();
  await seedKnowCanvasDemoBook(db, projectId);
}

async function seedDemoBook(db: D1Database, projectId: string): Promise<void> {
  await seedBook(db, projectId, {
    name: "Explorando la célula",
    description:
      "Un recorrido interactivo por la célula: estructura, procesos y una actividad final.",
    sectionTitle: "Viaje al interior de la célula",
    seedVersion: DEMO_SEED_VERSION,
    pages: buildDemoBookPages(projectId),
    settings: { viewerTemplate: "outline", theme: "minimal" },
  });
}

async function seedKnowCanvasDemoBook(db: D1Database, projectId: string): Promise<void> {
  await seedBook(db, projectId, {
    name: "Conoce KnowCanvas",
    description:
      "Un recorrido práctico por la autoría visual, los widgets educativos y la publicación.",
    sectionTitle: "Recorrido guiado",
    seedVersion: KNOWCANVAS_DEMO_SEED_VERSION,
    pages: buildKnowCanvasDemoPages(projectId),
    settings: { viewerTemplate: "outline", theme: "classroom" },
  });
}

async function seedBook(
  db: D1Database,
  projectId: string,
  definition: {
    name: string;
    description: string;
    sectionTitle: string;
    seedVersion: number;
    pages: ReturnType<typeof buildDemoBookPages>;
    settings: ProjectSettings;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const sectionId = `${projectId}:demo:section`;
  const pages = definition.pages;
  const statements: D1PreparedStatement[] = [
    // nodes.parent_id uses ON DELETE RESTRICT. Detach the existing demo tree
    // before rebuilding it so deleting a parent cannot be blocked by a child.
    db.prepare("UPDATE nodes SET parent_id = NULL WHERE project_id = ?").bind(projectId),
    db.prepare("DELETE FROM nodes WHERE project_id = ?").bind(projectId),
    db.prepare("DELETE FROM canvases WHERE project_id = ?").bind(projectId),
    db
      .prepare(
        `INSERT INTO nodes
          (id, project_id, parent_id, kind, title, position, canvas_id, created_at, updated_at)
         VALUES (?, ?, NULL, 'container', ?, 0, NULL, ?, ?)`,
      )
      .bind(sectionId, projectId, definition.sectionTitle, now, now),
  ];
  for (const [position, page] of pages.entries()) {
    statements.push(
      db
        .prepare(
          `INSERT INTO canvases
          (id, project_id, title, description, composition_json, schema_version, revision, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 2, 1, ?, ?)`,
        )
        .bind(
          page.canvasId,
          projectId,
          page.title,
          page.description,
          JSON.stringify(page.composition),
          now,
          now,
        ),
      db
        .prepare(
          `INSERT INTO nodes
          (id, project_id, parent_id, kind, title, position, canvas_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          `${projectId}:demo:${page.key}:node`,
          projectId,
          sectionId,
          "canvas",
          page.title,
          position,
          page.canvasId,
          now,
          now,
        ),
    );
  }
  statements.push(
    db
      .prepare(
        `UPDATE projects
            SET name = ?, description = ?, metadata_json = ?, settings_json = ?,
                revision = revision + 1, updated_at = ?
          WHERE id = ?`,
      )
      .bind(
        definition.name,
        definition.description,
        JSON.stringify({ seedVersion: definition.seedVersion }),
        JSON.stringify(definition.settings),
        now,
        projectId,
      ),
  );
  await db.batch(statements);
}
