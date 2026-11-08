import { DomainError } from "../domain/errors";
import type { AiCredentialStatus } from "../shared/contracts";
import type { Env } from "../worker/env";
import { decryptUserSecret, encryptUserSecret } from "../worker/user-secrets";

export async function getOpenAiCredentialStatus(
  db: D1Database,
  userId: string,
): Promise<AiCredentialStatus> {
  const row = await db
    .prepare("SELECT key_last_four, updated_at FROM openai_credentials WHERE user_id = ?")
    .bind(userId)
    .first<{ key_last_four: string; updated_at: string }>();
  return row
    ? { configured: true, lastFour: row.key_last_four, updatedAt: row.updated_at }
    : { configured: false, lastFour: null, updatedAt: null };
}

export async function verifyOpenAiApiKey(apiKey: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/models", {
      headers: { authorization: `Bearer ${apiKey}` },
    });
  } catch {
    throw new DomainError("AI_PROVIDER_UNAVAILABLE", "No se pudo contactar con OpenAI.", 502);
  }
  if (!response.ok) {
    throw new DomainError(
      "AI_CREDENTIAL_REJECTED",
      response.status === 401
        ? "OpenAI ha rechazado la API key. Comprueba que sea correcta y esté activa."
        : "OpenAI no ha podido validar la API key.",
      400,
    );
  }
}

export async function saveOpenAiCredential(
  env: Env,
  userId: string,
  apiKey: string,
): Promise<AiCredentialStatus> {
  const encryptedApiKey = await encryptUserSecret(apiKey, env);
  await verifyOpenAiApiKey(apiKey);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO openai_credentials
       (user_id, encrypted_api_key, key_last_four, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       encrypted_api_key = excluded.encrypted_api_key,
       key_last_four = excluded.key_last_four,
       updated_at = excluded.updated_at`,
  )
    .bind(userId, encryptedApiKey, apiKey.slice(-4), now, now)
    .run();
  return { configured: true, lastFour: apiKey.slice(-4), updatedAt: now };
}

export async function deleteOpenAiCredential(db: D1Database, userId: string): Promise<void> {
  await db.prepare("DELETE FROM openai_credentials WHERE user_id = ?").bind(userId).run();
}

export async function getOpenAiApiKey(env: Env, userId: string): Promise<string> {
  const row = await env.DB.prepare(
    "SELECT encrypted_api_key FROM openai_credentials WHERE user_id = ?",
  )
    .bind(userId)
    .first<{ encrypted_api_key: string }>();
  if (!row) throw new DomainError("AI_CREDENTIAL_REQUIRED", "Configura tu API key de OpenAI.", 409);
  return decryptUserSecret(row.encrypted_api_key, env);
}
