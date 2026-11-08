import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";

import { DomainError } from "../domain/errors";
import type { User } from "../shared/contracts";
import { ensureDemoProject } from "../infrastructure/projects";
import type { Env } from "./env";

const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const sessionCookieName = "kc_session";
const sessionDurationSeconds = 60 * 60 * 24 * 14;

const tokenResponseSchema = z.object({
  id_token: z.string().min(1),
  access_token: z.string().min(1),
  expires_in: z.number().positive(),
  refresh_token: z.string().min(1).optional(),
});

type GoogleProfile = {
  issuer: string;
  subject: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  avatarUrl: string | null;
};

type OAuthStateRow = {
  code_verifier: string;
  nonce: string;
  return_to: string;
  expires_at: string;
};

type SessionUserRow = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
};

function requireGoogleConfig(env: Env): { clientId: string; clientSecret: string } {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new DomainError(
      "AUTH_NOT_CONFIGURED",
      "El acceso con Google todavía no está configurado.",
      503,
    );
  }

  return { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET };
}

function randomToken(byteLength = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return base64Url(bytes);
}

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

async function tokenEncryptionKey(env: Env): Promise<CryptoKey> {
  if (!env.GOOGLE_TOKEN_ENCRYPTION_KEY) {
    throw new DomainError(
      "AUTH_NOT_CONFIGURED",
      "El almacenamiento de Google Drive todavía no está configurado.",
      503,
    );
  }
  const raw = decodeBase64Url(env.GOOGLE_TOKEN_ENCRYPTION_KEY);
  if (raw.byteLength !== 32) {
    throw new DomainError("AUTH_NOT_CONFIGURED", "La clave de Google Drive no es válida.", 503);
  }
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptRefreshToken(value: string, env: Env): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await tokenEncryptionKey(env),
    new TextEncoder().encode(value),
  );
  return `${base64Url(iv)}.${base64Url(new Uint8Array(encrypted))}`;
}

async function decryptRefreshToken(value: string, env: Env): Promise<string> {
  const [encodedIv, encodedCiphertext] = value.split(".");
  if (!encodedIv || !encodedCiphertext) {
    throw new DomainError("AUTH_FORBIDDEN", "Vuelve a conectar Google Drive.", 403);
  }
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: decodeBase64Url(encodedIv) },
      await tokenEncryptionKey(env),
      decodeBase64Url(encodedCiphertext),
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    throw new DomainError("AUTH_FORBIDDEN", "Vuelve a conectar Google Drive.", 403);
  }
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64Url(new Uint8Array(digest));
}

function appOrigin(request: Request, env: Env): string {
  return (env.APP_ORIGIN || new URL(request.url).origin).replace(/\/$/u, "");
}

function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function readCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;

  for (const part of cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function sessionCookie(token: string, request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionDurationSeconds}${secure}`;
}

export function expiredSessionCookie(request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export async function beginGoogleLogin(request: Request, env: Env): Promise<Response> {
  const { clientId } = requireGoogleConfig(env);
  const url = new URL(request.url);
  const state = randomToken();
  const nonce = randomToken();
  const codeVerifier = randomToken(48);
  const codeChallenge = await sha256(codeVerifier);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

  await env.DB.prepare(
    `INSERT INTO oauth_states
      (state_hash, code_verifier, nonce, return_to, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      await sha256(state),
      codeVerifier,
      nonce,
      safeReturnTo(url.searchParams.get("returnTo")),
      expiresAt,
      now.toISOString(),
    )
    .run();

  const redirectUri = `${appOrigin(request, env)}/api/auth/google/callback`;
  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizationUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile https://www.googleapis.com/auth/drive.file",
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent select_account",
  }).toString();

  return Response.redirect(authorizationUrl.toString(), 302);
}

export async function finishGoogleLogin(request: Request, env: Env): Promise<Response> {
  const { clientId, clientSecret } = requireGoogleConfig(env);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    throw new DomainError("VALIDATION_ERROR", "La respuesta de Google está incompleta.", 400);
  }

  const stateHash = await sha256(state);
  const stored = await env.DB.prepare(
    `SELECT code_verifier, nonce, return_to, expires_at
       FROM oauth_states WHERE state_hash = ?`,
  )
    .bind(stateHash)
    .first<OAuthStateRow>();

  await env.DB.prepare("DELETE FROM oauth_states WHERE state_hash = ?").bind(stateHash).run();

  if (!stored || stored.expires_at <= new Date().toISOString()) {
    throw new DomainError("AUTH_FORBIDDEN", "La solicitud de acceso ha caducado.", 403);
  }

  const redirectUri = `${appOrigin(request, env)}/api/auth/google/callback`;
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: stored.code_verifier,
    }),
  });

  if (!tokenResponse.ok) {
    throw new DomainError("AUTH_FORBIDDEN", "Google no pudo validar el acceso.", 403);
  }

  const tokens = tokenResponseSchema.parse(await tokenResponse.json());
  const profile = await verifyGoogleIdToken(tokens.id_token, clientId, stored.nonce);
  assertAllowedEmail(profile.email, env.AUTH_ALLOWED_EMAILS);
  const user = await upsertUser(env.DB, profile);
  if (tokens.refresh_token) {
    await saveGoogleDriveRefreshToken(env.DB, user.id, tokens.refresh_token, env);
  }
  await ensureDemoProject(env.DB, user.id);
  const token = await createSession(env.DB, user.id);
  const headers = new Headers({
    location: new URL(stored.return_to, appOrigin(request, env)).toString(),
    "set-cookie": sessionCookie(token, request),
    "cache-control": "no-store",
  });
  return new Response(null, { status: 302, headers });
}

async function saveGoogleDriveRefreshToken(
  db: D1Database,
  userId: string,
  refreshToken: string,
  env: Env,
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO google_drive_credentials
        (user_id, encrypted_refresh_token, created_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         encrypted_refresh_token = excluded.encrypted_refresh_token,
         updated_at = excluded.updated_at`,
    )
    .bind(userId, await encryptRefreshToken(refreshToken, env), now, now)
    .run();
}

export async function getGoogleDriveAccessToken(
  db: D1Database,
  userId: string,
  env: Env,
): Promise<string> {
  const { clientId, clientSecret } = requireGoogleConfig(env);
  const credential = await db
    .prepare("SELECT encrypted_refresh_token FROM google_drive_credentials WHERE user_id = ?")
    .bind(userId)
    .first<{ encrypted_refresh_token: string }>();
  if (!credential) {
    throw new DomainError(
      "DRIVE_AUTH_REQUIRED",
      "Vuelve a iniciar sesión para autorizar el guardado en Google Drive.",
      403,
    );
  }
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: await decryptRefreshToken(credential.encrypted_refresh_token, env),
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    throw new DomainError(
      "DRIVE_AUTH_REQUIRED",
      "Google Drive ha perdido la autorización. Vuelve a iniciar sesión.",
      403,
    );
  }
  const payload = z.object({ access_token: z.string().min(1) }).parse(await response.json());
  return payload.access_token;
}

async function verifyGoogleIdToken(
  idToken: string,
  clientId: string,
  expectedNonce: string,
): Promise<GoogleProfile> {
  const { payload } = await jwtVerify(idToken, googleJwks, {
    audience: clientId,
    issuer: ["https://accounts.google.com", "accounts.google.com"],
  });

  if (payload.nonce !== expectedNonce || !payload.sub || typeof payload.email !== "string") {
    throw new DomainError("AUTH_FORBIDDEN", "El token de identidad no es válido.", 403);
  }

  if (payload.email_verified !== true) {
    throw new DomainError(
      "AUTH_FORBIDDEN",
      "La cuenta de Google no tiene un email verificado.",
      403,
    );
  }

  return {
    issuer: String(payload.iss),
    subject: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: true,
    displayName: typeof payload.name === "string" ? payload.name : payload.email,
    avatarUrl: typeof payload.picture === "string" ? payload.picture : null,
  };
}

function assertAllowedEmail(email: string, configuredEmails?: string): void {
  const allowlist = (configuredEmails ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length > 0 && !allowlist.includes(email.toLowerCase())) {
    throw new DomainError("AUTH_FORBIDDEN", "Esta cuenta no tiene acceso a la beta.", 403);
  }
}

async function upsertUser(db: D1Database, profile: GoogleProfile): Promise<User> {
  const now = new Date().toISOString();
  const existing = await db
    .prepare("SELECT id FROM users WHERE google_issuer = ? AND google_subject = ?")
    .bind(profile.issuer, profile.subject)
    .first<{ id: string }>();
  const id = existing?.id ?? crypto.randomUUID();

  if (existing) {
    await db
      .prepare(
        `UPDATE users SET email = ?, email_verified = ?, display_name = ?, avatar_url = ?,
          updated_at = ?, last_login_at = ? WHERE id = ?`,
      )
      .bind(
        profile.email,
        profile.emailVerified ? 1 : 0,
        profile.displayName,
        profile.avatarUrl,
        now,
        now,
        id,
      )
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO users
          (id, google_issuer, google_subject, email, email_verified, display_name,
           avatar_url, created_at, updated_at, last_login_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        profile.issuer,
        profile.subject,
        profile.email,
        profile.emailVerified ? 1 : 0,
        profile.displayName,
        profile.avatarUrl,
        now,
        now,
        now,
      )
      .run();
  }

  return {
    id,
    email: profile.email,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
  };
}

async function createSession(db: D1Database, userId: string): Promise<string> {
  const token = randomToken(48);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + sessionDurationSeconds * 1000).toISOString();
  await db
    .prepare(
      `INSERT INTO sessions (token_hash, user_id, expires_at, created_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(await sha256(token), userId, expiresAt, now.toISOString(), now.toISOString())
    .run();
  return token;
}

export async function getCurrentUser(request: Request, env: Env): Promise<User | null> {
  const token = readCookie(request, sessionCookieName);
  if (!token) return null;

  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.display_name, u.avatar_url
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ?`,
  )
    .bind(await sha256(token), new Date().toISOString())
    .first<SessionUserRow>();

  return row
    ? { id: row.id, email: row.email, displayName: row.display_name, avatarUrl: row.avatar_url }
    : null;
}

export async function requireUser(request: Request, env: Env): Promise<User> {
  const user = await getCurrentUser(request, env);
  if (!user) throw new DomainError("AUTH_REQUIRED", "Inicia sesión para continuar.", 401);
  return user;
}

export async function logout(request: Request, env: Env): Promise<void> {
  const token = readCookie(request, sessionCookieName);
  if (!token) return;
  await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
    .bind(await sha256(token))
    .run();
}
