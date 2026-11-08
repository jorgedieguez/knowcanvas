import {
  createNodeInputSchema,
  createAiProposalInputSchema,
  createProjectInputSchema,
  moveNodeInputSchema,
  mutateNodeInputSchema,
  importRemoteResourceInputSchema,
  saveAiCredentialInputSchema,
  updateNodeInputSchema,
  updateCanvasInputSchema,
  updateProjectInputSchema,
} from "../shared/contracts";
import {
  createNode,
  createProject,
  getProject,
  getPublicProject,
  listProjects,
  moveNode,
  renameNode,
  softDeleteNode,
  softDeleteProject,
  updateProject,
  updateCanvasComposition,
} from "../infrastructure/projects";
import {
  createResource,
  deleteResource,
  getResourceContent,
  getResourceOwnerUserId,
  importRemoteResource,
  listResources,
} from "../infrastructure/resources";
import {
  deleteOpenAiCredential,
  getOpenAiCredentialStatus,
  saveOpenAiCredential,
} from "../infrastructure/openai-credentials";
import { createOpenAiProposal } from "../infrastructure/openai-generation";
import {
  beginGoogleLogin,
  expiredSessionCookie,
  finishGoogleLogin,
  getGoogleDriveAccessToken,
  getCurrentUser,
  logout,
  requireUser,
} from "./auth";
import type { Env } from "./env";
import { assertMutationOrigin, empty, errorResponse, json, parseJson } from "./http";

function matchPath(pathname: string, pattern: RegExp): string[] | null {
  const match = pattern.exec(pathname);
  return match ? match.slice(1).map(decodeURIComponent) : null;
}

async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === "GET" && path === "/api/health") {
    return json({ status: "ok", service: "knowcanvas", timestamp: new Date().toISOString() });
  }

  if (request.method === "GET" && path === "/api/auth/google/start") {
    return beginGoogleLogin(request, env);
  }

  if (request.method === "GET" && path === "/api/auth/google/callback") {
    return finishGoogleLogin(request, env);
  }

  if (request.method === "GET" && path === "/api/me") {
    const user = await getCurrentUser(request, env);
    return json({
      user,
      authConfigured: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    });
  }

  const publicProjectMatch = matchPath(path, /^\/api\/public\/projects\/([^/]+)$/u);
  if (publicProjectMatch && request.method === "GET") {
    const [projectId] = publicProjectMatch;
    if (!projectId) return notFound();
    return json(await getPublicProject(env.DB, projectId), {
      headers: { "cache-control": "public, max-age=60" },
    });
  }

  const publicResourceMatch = matchPath(path, /^\/api\/resources\/([^/]+)\/content$/u);
  if (publicResourceMatch && request.method === "GET") {
    const [resourceId] = publicResourceMatch;
    if (!resourceId) return notFound();
    const viewer = await getCurrentUser(request, env);
    const resourceOwnerUserId = await getResourceOwnerUserId(env.DB, resourceId, viewer?.id ?? "");
    return getResourceContent(
      env.DB,
      resourceId,
      await getGoogleDriveAccessToken(env.DB, resourceOwnerUserId, env),
    );
  }

  assertMutationOrigin(request, env.APP_ORIGIN);

  if (request.method === "POST" && path === "/api/auth/logout") {
    await logout(request, env);
    return empty(204, { "set-cookie": expiredSessionCookie(request) });
  }

  const user = await requireUser(request, env);

  if (path === "/api/account/ai" && request.method === "GET") {
    return json(await getOpenAiCredentialStatus(env.DB, user.id));
  }

  if (path === "/api/account/ai" && request.method === "PUT") {
    const { apiKey } = await parseJson(request, saveAiCredentialInputSchema);
    return json(await saveOpenAiCredential(env, user.id, apiKey));
  }

  if (path === "/api/account/ai" && request.method === "DELETE") {
    await deleteOpenAiCredential(env.DB, user.id);
    return empty();
  }

  if (path === "/api/ai/proposals" && request.method === "POST") {
    const input = await parseJson(request, createAiProposalInputSchema);
    return json(
      await createOpenAiProposal(env, user.id, input.prompt, input.canvasTitle, input.pages),
    );
  }

  if (path === "/api/resources" && request.method === "GET") {
    return json(await listResources(env.DB, user.id));
  }

  if (path === "/api/resources/import" && request.method === "POST") {
    const input = await parseJson(request, importRemoteResourceInputSchema);
    return json(
      await importRemoteResource(
        env.DB,
        user.id,
        await getGoogleDriveAccessToken(env.DB, user.id, env),
        input.sourceUrl,
        input.imageQuery,
        input.name,
      ),
      { status: 201 },
    );
  }

  if (path === "/api/resources" && request.method === "POST") {
    const name = decodeURIComponent(request.headers.get("x-file-name") ?? "imagen.jpg")
      .replace(/[\\/]/gu, "-")
      .trim()
      .slice(0, 180);
    const mimeType = request.headers.get("content-type") ?? "application/octet-stream";
    const width = Number(request.headers.get("x-image-width")) || null;
    const height = Number(request.headers.get("x-image-height")) || null;
    return json(
      await createResource(
        env.DB,
        user.id,
        await getGoogleDriveAccessToken(env.DB, user.id, env),
        await request.arrayBuffer(),
        name || "imagen.jpg",
        mimeType,
        width,
        height,
      ),
      { status: 201 },
    );
  }

  const resourceMatch = matchPath(path, /^\/api\/resources\/([^/]+)$/u);
  if (resourceMatch && request.method === "DELETE") {
    const [resourceId] = resourceMatch;
    if (!resourceId) return notFound();
    await deleteResource(
      env.DB,
      user.id,
      resourceId,
      await getGoogleDriveAccessToken(env.DB, user.id, env),
    );
    return empty();
  }

  if (path === "/api/projects" && request.method === "GET") {
    return json(await listProjects(env.DB, user.id));
  }

  if (path === "/api/projects" && request.method === "POST") {
    const input = await parseJson(request, createProjectInputSchema);
    return json(await createProject(env.DB, user.id, input), { status: 201 });
  }

  const projectMatch = matchPath(path, /^\/api\/projects\/([^/]+)$/u);
  if (projectMatch) {
    const [projectId] = projectMatch;
    if (!projectId) return notFound();

    if (request.method === "GET") {
      return json(await getProject(env.DB, user.id, projectId));
    }

    if (request.method === "PATCH") {
      const input = await parseJson(request, updateProjectInputSchema);
      return json(await updateProject(env.DB, user.id, projectId, input));
    }

    if (request.method === "DELETE") {
      const input = await parseJson(request, mutateNodeInputSchema);
      await softDeleteProject(env.DB, user.id, projectId, input.projectRevision);
      return empty();
    }
  }

  const createNodeMatch = matchPath(path, /^\/api\/projects\/([^/]+)\/nodes$/u);
  if (createNodeMatch && request.method === "POST") {
    const [projectId] = createNodeMatch;
    if (!projectId) return notFound();
    const input = await parseJson(request, createNodeInputSchema);
    return json(await createNode(env.DB, user.id, projectId, input), { status: 201 });
  }

  const nodeMatch = matchPath(path, /^\/api\/nodes\/([^/]+)$/u);
  if (nodeMatch) {
    const [nodeId] = nodeMatch;
    if (!nodeId) return notFound();

    if (request.method === "PATCH") {
      const input = await parseJson(request, updateNodeInputSchema);
      return json(await renameNode(env.DB, user.id, nodeId, input.title, input.projectRevision));
    }

    if (request.method === "DELETE") {
      const input = await parseJson(request, mutateNodeInputSchema);
      return json(await softDeleteNode(env.DB, user.id, nodeId, input.projectRevision));
    }
  }

  const moveNodeMatch = matchPath(path, /^\/api\/nodes\/([^/]+)\/move$/u);
  if (moveNodeMatch && request.method === "POST") {
    const [nodeId] = moveNodeMatch;
    if (!nodeId) return notFound();
    const input = await parseJson(request, moveNodeInputSchema);
    return json(
      await moveNode(
        env.DB,
        user.id,
        nodeId,
        input.parentId,
        input.position,
        input.projectRevision,
      ),
    );
  }

  const canvasMatch = matchPath(path, /^\/api\/canvases\/([^/]+)$/u);
  if (canvasMatch && request.method === "PATCH") {
    const [canvasId] = canvasMatch;
    if (!canvasId) return notFound();
    const input = await parseJson(request, updateCanvasInputSchema);
    return json(
      await updateCanvasComposition(env.DB, user.id, canvasId, input.composition, input.revision),
    );
  }

  return notFound();
}

function notFound(): Response {
  return new Response(
    JSON.stringify({ error: { code: "NOT_FOUND", message: "Recurso no encontrado." } }),
    {
      status: 404,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    },
  );
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) {
      if (!env.ASSETS) return new Response(null, { status: 404 });
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return asset;
      return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
    }

    const requestId = crypto.randomUUID();
    try {
      return await handleApi(request, env);
    } catch (error) {
      return errorResponse(error, requestId);
    }
  },
} satisfies ExportedHandler<Env>;
