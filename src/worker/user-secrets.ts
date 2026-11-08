import { DomainError } from "../domain/errors";
import type { Env } from "./env";

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function encryptionKey(env: Env): Promise<CryptoKey> {
  if (!env.USER_SECRET_ENCRYPTION_KEY) {
    throw new DomainError(
      "AI_NOT_CONFIGURED",
      "El almacenamiento seguro de credenciales de IA no está configurado.",
      503,
    );
  }
  const raw = decodeBase64Url(env.USER_SECRET_ENCRYPTION_KEY);
  if (raw.byteLength !== 32) {
    throw new DomainError("AI_NOT_CONFIGURED", "La clave de cifrado de IA no es válida.", 503);
  }
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptUserSecret(value: string, env: Env): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(env),
    new TextEncoder().encode(value),
  );
  return `${base64Url(iv)}.${base64Url(new Uint8Array(encrypted))}`;
}

export async function decryptUserSecret(value: string, env: Env): Promise<string> {
  const [encodedIv, encodedCiphertext] = value.split(".");
  if (!encodedIv || !encodedCiphertext) {
    throw new DomainError("AI_CREDENTIAL_INVALID", "Vuelve a configurar tu API key.", 409);
  }
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: decodeBase64Url(encodedIv) },
      await encryptionKey(env),
      decodeBase64Url(encodedCiphertext),
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    throw new DomainError("AI_CREDENTIAL_INVALID", "Vuelve a configurar tu API key.", 409);
  }
}
