import { DomainError } from "../domain/errors";
import { aiProposalSchema, type AiProposal } from "../shared/contracts";
import type { Env } from "../worker/env";
import { getOpenAiApiKey } from "./openai-credentials";
import { z } from "zod";

function openAiJsonSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(openAiJsonSchema);
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(source)) {
    if (key === "$schema") continue;
    if (key === "oneOf") {
      result.anyOf = openAiJsonSchema(child);
      continue;
    }
    if (key === "format" && child === "uri") continue;
    if (key === "const") {
      result.enum = [child];
      continue;
    }
    result[key] = openAiJsonSchema(child);
  }
  return result;
}

export const proposalJsonSchema = openAiJsonSchema(z.toJSONSchema(aiProposalSchema));

const authoringInstructions = `Eres el copiloto de autoría educativa de KnowCanvas. Responde en español y devuelve únicamente JSON compatible con el esquema.

Puedes proponer: richText para explicación; image para una imagen web verificable; table para comparaciones; diagram para un lienzo Excalidraw vacío acompañado de una descripción; pele para Mermaid válido; navigation hacia uno de los canvasId del contexto; quiz; accordion para detalle opcional; tabs para categorías equivalentes; flashcards para recuperación; timeline para cronología; hotspots para explorar una imagen; sorting para clasificar, ordenar o relacionar conceptos. En sorting usa targets vacíos y targetIndex null para ordenar; para clasificar o relacionar, targetIndex debe apuntar a un destino existente.

Reglas: usa 1–6 widgets y nunca más de 8; no generes contenido vacío, HTML o JavaScript; no inventes hechos, páginas ni URLs. Para imágenes usa web search, elige URLs HTTPS directas de fuentes institucionales, Wikimedia Commons o licencias abiertas, aporta una imageQuery descriptiva en inglés para búsqueda de respaldo, página de origen, atribución y texto alternativo. Si no existe una imagen verificable, no propongas image ni hotspots. Prefiere Mermaid a diagram para contenido generable.

Compón en una cuadrícula de 12 columnas sin solapamientos: orden de lectura izquierda-derecha y arriba-abajo; máximo tres widgets por fila; texto largo, tablas, timeline, accordion y tabs suelen usar 12 columnas; texto e imagen pueden compartir 7/5 o 6/6; quiz después del contenido; navigation al final. En móvil se apilarán por row y column.`;

type OpenAiErrorPayload = {
  error?: {
    code?: unknown;
    type?: unknown;
  };
};

function readOpenAiErrorCode(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const { error } = payload as OpenAiErrorPayload;
  if (!error || typeof error !== "object") return null;
  if (typeof error.code === "string") return error.code;
  return typeof error.type === "string" ? error.type : null;
}

export function openAiResponseError(status: number, payload: unknown): DomainError {
  const providerCode = readOpenAiErrorCode(payload);
  if (status === 401 || providerCode === "invalid_api_key") {
    return new DomainError(
      "AI_CREDENTIAL_REJECTED",
      "OpenAI ha rechazado la API key. Vuelve a configurarla en tu cuenta.",
      401,
    );
  }
  if (providerCode === "insufficient_quota") {
    return new DomainError(
      "AI_PROVIDER_UNAVAILABLE",
      "La cuenta de OpenAI asociada a esta API key no tiene saldo disponible.",
      429,
    );
  }
  if (status === 429 || providerCode === "rate_limit_exceeded") {
    return new DomainError(
      "AI_PROVIDER_UNAVAILABLE",
      "OpenAI ha alcanzado temporalmente el límite de uso. Inténtalo de nuevo en unos minutos.",
      429,
    );
  }
  if (providerCode === "model_not_found") {
    return new DomainError(
      "AI_PROVIDER_UNAVAILABLE",
      "El modelo de OpenAI configurado no está disponible para esta API key.",
      502,
    );
  }
  if (providerCode === "invalid_json_schema") {
    return new DomainError(
      "AI_PROVIDER_UNAVAILABLE",
      "KnowCanvas no pudo preparar el formato de la propuesta de OpenAI.",
      502,
    );
  }
  return new DomainError("AI_PROVIDER_UNAVAILABLE", "OpenAI no pudo generar la propuesta.", 502);
}

export async function createOpenAiProposal(
  env: Env,
  userId: string,
  prompt: string,
  canvasTitle: string,
  pages: Array<{ id: string; title: string }>,
): Promise<AiProposal> {
  const apiKey = await getOpenAiApiKey(env, userId);
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || "gpt-5-mini",
        instructions: authoringInstructions,
        input: `Contexto: ${JSON.stringify({ canvasTitle: canvasTitle || "Sin título", pages })}\nPetición del autor: ${prompt}`,
        tools: [{ type: "web_search" }],
        text: {
          format: {
            type: "json_schema",
            name: "knowcanvas_content_proposal",
            strict: true,
            schema: proposalJsonSchema,
          },
        },
        store: false,
      }),
    });
  } catch (error) {
    console.error("OpenAI request failed", {
      cause: error instanceof Error ? error.name : "unknown",
    });
    throw new DomainError("AI_PROVIDER_UNAVAILABLE", "No se pudo contactar con OpenAI.", 502);
  }
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    console.error("OpenAI response error", {
      status: response.status,
      code: readOpenAiErrorCode(payload),
      requestId: response.headers.get("x-request-id"),
    });
    throw openAiResponseError(response.status, payload);
  }
  const payload = (await response.json()) as {
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  const text = payload.output
    ?.flatMap((item) => item.content ?? [])
    .find((content) => content.type === "output_text")?.text;
  if (!text)
    throw new DomainError("AI_PROVIDER_UNAVAILABLE", "OpenAI devolvió una respuesta vacía.", 502);
  try {
    return aiProposalSchema.parse(JSON.parse(text));
  } catch {
    throw new DomainError("AI_PROVIDER_UNAVAILABLE", "La propuesta de OpenAI no es válida.", 502);
  }
}
