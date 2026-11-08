import { DomainError } from "../domain/errors";
import type { Resource } from "../shared/contracts";

type ResourceRow = {
  id: string;
  name: string;
  mime_type: string;
  byte_size: number;
  width: number | null;
  height: number | null;
  created_at: string;
};

function mapResource(row: ResourceRow): Resource {
  return {
    id: row.id,
    name: row.name,
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    width: row.width,
    height: row.height,
    url: `/api/resources/${encodeURIComponent(row.id)}/content`,
    createdAt: row.created_at,
  };
}

export async function listResources(db: D1Database, ownerUserId: string): Promise<Resource[]> {
  const result = await db
    .prepare(
      `SELECT id, name, mime_type, byte_size, width, height, created_at
         FROM resources
        WHERE owner_user_id = ? AND deleted_at IS NULL
        ORDER BY created_at DESC`,
    )
    .bind(ownerUserId)
    .all<ResourceRow>();
  return result.results.map(mapResource);
}

export async function createResource(
  db: D1Database,
  ownerUserId: string,
  accessToken: string,
  body: ArrayBuffer,
  name: string,
  mimeType: string,
  width: number | null,
  height: number | null,
): Promise<Resource> {
  if (!mimeType.startsWith("image/")) {
    throw new DomainError("UNSUPPORTED_MEDIA", "El archivo debe ser una imagen.", 415);
  }
  if (!body.byteLength || body.byteLength > 10_000_000) {
    throw new DomainError("RESOURCE_TOO_LARGE", "La imagen debe ocupar menos de 10 MB.", 413);
  }
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const boundary = `knowcanvas_${crypto.randomUUID()}`;
  const metadata = JSON.stringify({
    name,
    description: "Imagen creada por KnowCanvas",
    appProperties: { knowcanvasResourceId: id },
  });
  const uploadBody = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
    body,
    `\r\n--${boundary}--`,
  ]);
  const uploadResponse = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": `multipart/related; boundary=${boundary}`,
      },
      body: uploadBody,
    },
  );
  if (!uploadResponse.ok) {
    throw new DomainError(
      "DRIVE_UPLOAD_FAILED",
      "Google Drive no pudo guardar la imagen. Vuelve a conectar tu cuenta.",
      502,
    );
  }
  const uploaded = (await uploadResponse.json()) as { id?: unknown };
  if (typeof uploaded.id !== "string" || !uploaded.id) {
    throw new DomainError("DRIVE_UPLOAD_FAILED", "Google Drive no devolvió el archivo.", 502);
  }
  const objectKey = uploaded.id;
  try {
    await db
      .prepare(
        `INSERT INTO resources
          (id, owner_user_id, object_key, name, mime_type, byte_size, width, height, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, ownerUserId, objectKey, name, mimeType, body.byteLength, width, height, createdAt)
      .run();
  } catch (error) {
    await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(objectKey)}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    throw error;
  }
  return mapResource({
    id,
    name,
    mime_type: mimeType,
    byte_size: body.byteLength,
    width,
    height,
    created_at: createdAt,
  });
}

export function assertRemoteImageUrl(value: string): URL {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  const blocked =
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    host === "localhost" ||
    host.endsWith(".local") ||
    /^(?:0|10|127|169\.254|192\.168)\./u.test(host) ||
    /^172\.(?:1[6-9]|2\d|3[01])\./u.test(host) ||
    host === "::1" ||
    host.startsWith("fc") ||
    host.startsWith("fd") ||
    host.startsWith("fe80:");
  if (blocked)
    throw new DomainError(
      "REMOTE_RESOURCE_INVALID",
      "La imagen remota no procede de una dirección HTTPS pública válida.",
      400,
    );
  return url;
}

async function downloadRemoteImage(
  sourceUrl: string,
): Promise<{ body: ArrayBuffer; mimeType: string }> {
  let url = assertRemoteImageUrl(sourceUrl);
  let response: Response | null = null;
  for (let redirect = 0; redirect < 4; redirect += 1) {
    response = await fetch(url, {
      redirect: "manual",
      headers: {
        accept: "image/avif,image/webp,image/png,image/jpeg,image/gif",
        "user-agent": "KnowCanvas/1.0 educational authoring",
      },
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    const location = response.headers.get("location");
    if (!location)
      throw new DomainError("REMOTE_RESOURCE_FAILED", "La imagen remota no está disponible.", 502);
    url = assertRemoteImageUrl(new URL(location, url).toString());
  }
  if (!response?.ok)
    throw new DomainError("REMOTE_RESOURCE_FAILED", "No se pudo descargar la imagen remota.", 502);
  const mimeType =
    (response.headers.get("content-type") ?? "").split(";", 1)[0]?.toLowerCase() ?? "";
  if (!new Set(["image/avif", "image/webp", "image/png", "image/jpeg", "image/gif"]).has(mimeType))
    throw new DomainError("UNSUPPORTED_MEDIA", "La URL no devuelve una imagen compatible.", 415);
  const declaredSize = Number(response.headers.get("content-length"));
  if (declaredSize > 10_000_000)
    throw new DomainError("RESOURCE_TOO_LARGE", "La imagen debe ocupar menos de 10 MB.", 413);
  return { body: await response.arrayBuffer(), mimeType };
}

async function findWikimediaImage(query: string): Promise<{ url: string; name: string }> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: "10",
    prop: "imageinfo",
    iiprop: "url|mime|size",
    origin: "*",
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`, {
    headers: { "user-agent": "KnowCanvas/1.0 educational authoring" },
  });
  if (!response.ok)
    throw new DomainError(
      "REMOTE_RESOURCE_FAILED",
      "No se pudo buscar una imagen alternativa.",
      502,
    );
  const payload = (await response.json()) as {
    query?: {
      pages?: Record<
        string,
        { title?: unknown; imageinfo?: Array<{ url?: unknown; mime?: unknown; size?: unknown }> }
      >;
    };
  };
  const allowed = new Set(["image/avif", "image/webp", "image/png", "image/jpeg", "image/gif"]);
  for (const page of Object.values(payload.query?.pages ?? {})) {
    const image = page.imageinfo?.[0];
    if (
      typeof image?.url === "string" &&
      typeof image.mime === "string" &&
      allowed.has(image.mime) &&
      (typeof image.size !== "number" || image.size <= 10_000_000)
    ) {
      const title = typeof page.title === "string" ? page.title.replace(/^File:/u, "") : "imagen";
      return { url: image.url, name: title.slice(0, 180) };
    }
  }
  throw new DomainError(
    "REMOTE_RESOURCE_FAILED",
    "No se encontró una imagen reutilizable para esta propuesta.",
    502,
  );
}

export async function importRemoteResource(
  db: D1Database,
  ownerUserId: string,
  accessToken: string,
  sourceUrl: string,
  imageQuery: string | undefined,
  name: string,
): Promise<Resource> {
  let selectedUrl = sourceUrl;
  let selectedName = name;
  let downloaded: { body: ArrayBuffer; mimeType: string };
  try {
    downloaded = await downloadRemoteImage(selectedUrl);
  } catch (error) {
    if (!imageQuery) throw error;
    const fallback = await findWikimediaImage(imageQuery);
    selectedUrl = fallback.url;
    selectedName = fallback.name;
    downloaded = await downloadRemoteImage(selectedUrl);
  }
  return createResource(
    db,
    ownerUserId,
    accessToken,
    downloaded.body,
    selectedName,
    downloaded.mimeType,
    null,
    null,
  );
}

export async function getResourceContent(
  db: D1Database,
  resourceId: string,
  accessToken: string,
): Promise<Response> {
  const row = await db
    .prepare(
      `SELECT object_key, mime_type, name FROM resources
        WHERE id = ? AND deleted_at IS NULL`,
    )
    .bind(resourceId)
    .first<{ object_key: string; mime_type: string; name: string }>();
  if (!row) throw new DomainError("NOT_FOUND", "El recurso no existe.", 404);
  const driveResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(row.object_key)}?alt=media`,
    { headers: { authorization: `Bearer ${accessToken}` } },
  );
  if (driveResponse.status === 404) {
    throw new DomainError("NOT_FOUND", "El archivo ya no existe en Google Drive.", 404);
  }
  if (!driveResponse.ok || !driveResponse.body) {
    throw new DomainError("DRIVE_READ_FAILED", "No se pudo leer la imagen de Google Drive.", 502);
  }
  return new Response(driveResponse.body, {
    headers: {
      "content-type": row.mime_type,
      "cache-control": "private, max-age=300",
      "content-disposition": `inline; filename="${row.name.replaceAll('"', "")}"`,
    },
  });
}

export async function getResourceOwnerUserId(
  db: D1Database,
  resourceId: string,
  viewerUserId: string,
): Promise<string> {
  const row = await db
    .prepare(
      `SELECT r.owner_user_id FROM resources r
        WHERE r.id = ? AND r.deleted_at IS NULL`,
    )
    .bind(resourceId)
    .first<{ owner_user_id: string }>();
  if (!row) throw new DomainError("NOT_FOUND", "La imagen no existe.", 404);
  if (row.owner_user_id === viewerUserId) return row.owner_user_id;

  const canvases = await db
    .prepare(
      `SELECT c.composition_json FROM canvases c
        JOIN projects p ON p.id = c.project_id
       WHERE c.deleted_at IS NULL AND p.deleted_at IS NULL
         AND p.access_level != 'private'
         AND c.composition_json LIKE ?`,
    )
    .bind(`%${resourceId}%`)
    .all<{ composition_json: string }>();
  const isReferenced = canvases.results.some(({ composition_json }) => {
    try {
      const containsResource = (value: unknown): boolean => {
        if (Array.isArray(value)) return value.some(containsResource);
        if (!value || typeof value !== "object") return false;
        const record = value as Record<string, unknown>;
        if (record.resourceId === resourceId) return true;
        return Object.values(record).some(containsResource);
      };
      return containsResource(JSON.parse(composition_json) as unknown);
    } catch {
      return false;
    }
  });
  if (!isReferenced) {
    throw new DomainError("AUTH_FORBIDDEN", "No tienes acceso a esta imagen.", 403);
  }
  return row.owner_user_id;
}

export async function deleteResource(
  db: D1Database,
  ownerUserId: string,
  resourceId: string,
  accessToken: string,
): Promise<void> {
  const row = await db
    .prepare(
      `SELECT object_key FROM resources
        WHERE id = ? AND owner_user_id = ? AND deleted_at IS NULL`,
    )
    .bind(resourceId, ownerUserId)
    .first<{ object_key: string }>();
  if (!row) throw new DomainError("NOT_FOUND", "El recurso no existe.", 404);
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(row.object_key)}`,
    { method: "DELETE", headers: { authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok && response.status !== 404) {
    throw new DomainError("DRIVE_DELETE_FAILED", "Google Drive no pudo borrar la imagen.", 502);
  }
  await db
    .prepare("UPDATE resources SET deleted_at = ? WHERE id = ? AND owner_user_id = ?")
    .bind(new Date().toISOString(), resourceId, ownerUserId)
    .run();
}
