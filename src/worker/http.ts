import { z, type ZodType } from "zod";

import { DomainError } from "../domain/errors";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
} as const;

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  for (const [name, value] of Object.entries(jsonHeaders)) headers.set(name, value);
  return new Response(JSON.stringify({ data }), { ...init, headers });
}

export function empty(status = 204, headers?: HeadersInit): Response {
  return new Response(null, { status, headers });
}

export function errorResponse(error: unknown, requestId: string): Response {
  if (error instanceof DomainError) {
    return new Response(
      JSON.stringify({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details }),
          requestId,
        },
      }),
      { status: error.status, headers: jsonHeaders },
    );
  }

  if (error instanceof z.ZodError) {
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: "La solicitud no tiene un formato válido.",
          details: error.flatten(),
          requestId,
        },
      }),
      { status: 400, headers: jsonHeaders },
    );
  }

  console.error("Unhandled request error", { requestId, error });
  return new Response(
    JSON.stringify({
      error: {
        code: "INTERNAL_ERROR",
        message: "No se pudo completar la solicitud.",
        requestId,
      },
    }),
    { status: 500, headers: jsonHeaders },
  );
}

export async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new DomainError("VALIDATION_ERROR", "Se esperaba contenido JSON.", 415);
  }

  let value: unknown;
  try {
    value = await request.json();
  } catch {
    throw new DomainError("VALIDATION_ERROR", "El JSON no es válido.", 400);
  }

  return schema.parse(value);
}

export function assertMutationOrigin(request: Request, appOrigin?: string): void {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;

  const origin = request.headers.get("origin");
  const expected = appOrigin ?? new URL(request.url).origin;
  if (origin !== expected) {
    throw new DomainError("AUTH_FORBIDDEN", "El origen de la solicitud no es válido.", 403);
  }
}
