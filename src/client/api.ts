import type {
  AiCredentialStatus,
  AiProposal,
  Canvas,
  CanvasComposition,
  NodeItem,
  ProjectDetail,
  ProjectSummary,
  Resource,
  User,
} from "../shared/contracts";

type Envelope<T> = { data: T };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const options: RequestInit = { ...init };
  if (init?.body) {
    const headers = new Headers(init.headers);
    headers.set("content-type", "application/json");
    options.headers = headers;
  }
  const response = await fetch(path, options);

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string; code?: string };
    } | null;
    throw new ApiError(
      payload?.error?.message ?? "No se pudo completar la operación.",
      response.status,
      payload?.error?.code,
    );
  }

  if (response.status === 204) return undefined as T;
  return ((await response.json()) as Envelope<T>).data;
}

export const api = {
  me: () => request<{ user: User | null; authConfigured: boolean }>("/api/me"),
  listProjects: () => request<ProjectSummary[]>("/api/projects"),
  getAiCredential: () => request<AiCredentialStatus>("/api/account/ai"),
  saveAiCredential: (apiKey: string) =>
    request<AiCredentialStatus>("/api/account/ai", {
      method: "PUT",
      body: JSON.stringify({ apiKey }),
    }),
  deleteAiCredential: () => request<undefined>("/api/account/ai", { method: "DELETE" }),
  createAiProposal: (
    prompt: string,
    canvasTitle: string,
    pages: Array<{ id: string; title: string }>,
  ) =>
    request<AiProposal>("/api/ai/proposals", {
      method: "POST",
      body: JSON.stringify({ prompt, canvasTitle, pages }),
    }),
  getProject: (id: string) => request<ProjectDetail>(`/api/projects/${encodeURIComponent(id)}`),
  getPublicProject: (id: string) =>
    request<ProjectDetail>(`/api/public/projects/${encodeURIComponent(id)}`),
  createProject: (name: string) =>
    request<ProjectDetail>("/api/projects", {
      method: "POST",
      body: JSON.stringify({ name, description: "" }),
    }),
  updateProject: (
    id: string,
    input: {
      name?: string;
      description?: string;
      settings?: ProjectDetail["settings"];
      accessLevel?: ProjectDetail["accessLevel"];
      revision: number;
    },
  ) =>
    request<ProjectSummary>(`/api/projects/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  createNode: (
    projectId: string,
    input: {
      kind: "container" | "canvas";
      title: string;
      parentId: string | null;
      projectRevision: number;
    },
  ) =>
    request<{ node: NodeItem; projectRevision: number }>(
      `/api/projects/${encodeURIComponent(projectId)}/nodes`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),
  renameNode: (nodeId: string, title: string, projectRevision: number) =>
    request<{ projectRevision: number }>(`/api/nodes/${encodeURIComponent(nodeId)}`, {
      method: "PATCH",
      body: JSON.stringify({ title, projectRevision }),
    }),
  deleteNode: (nodeId: string, projectRevision: number) =>
    request<{ projectRevision: number }>(`/api/nodes/${encodeURIComponent(nodeId)}`, {
      method: "DELETE",
      body: JSON.stringify({ projectRevision }),
    }),
  moveNode: (nodeId: string, parentId: string | null, position: number, projectRevision: number) =>
    request<{ projectRevision: number }>(`/api/nodes/${encodeURIComponent(nodeId)}/move`, {
      method: "POST",
      body: JSON.stringify({ parentId, position, projectRevision }),
    }),
  updateCanvas: (id: string, composition: CanvasComposition, revision: number) =>
    request<Canvas>(`/api/canvases/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ composition, revision }),
    }),
  listResources: () => request<Resource[]>("/api/resources"),
  uploadResource: async (file: Blob, name: string, width: number, height: number) => {
    const response = await fetch("/api/resources", {
      method: "POST",
      headers: {
        "content-type": file.type || "image/jpeg",
        "x-file-name": encodeURIComponent(name),
        "x-image-width": String(width),
        "x-image-height": String(height),
      },
      body: file,
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: { message?: string; code?: string };
      } | null;
      throw new ApiError(
        payload?.error?.message ?? "No se pudo guardar la imagen.",
        response.status,
        payload?.error?.code,
      );
    }
    return ((await response.json()) as Envelope<Resource>).data;
  },
  importRemoteResource: (sourceUrl: string, imageQuery: string, name: string) =>
    request<Resource>("/api/resources/import", {
      method: "POST",
      body: JSON.stringify({ sourceUrl, imageQuery, name }),
    }),
  logout: () => request<undefined>("/api/auth/logout", { method: "POST" }),
};
