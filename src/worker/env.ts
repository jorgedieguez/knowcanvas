export interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_TOKEN_ENCRYPTION_KEY?: string;
  USER_SECRET_ENCRYPTION_KEY?: string;
  OPENAI_MODEL?: string;
  APP_ORIGIN?: string;
  AUTH_ALLOWED_EMAILS?: string;
}
