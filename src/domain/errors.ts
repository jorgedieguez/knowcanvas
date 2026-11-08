export type DomainErrorCode =
  | "AUTH_REQUIRED"
  | "AUTH_NOT_CONFIGURED"
  | "AUTH_FORBIDDEN"
  | "DRIVE_AUTH_REQUIRED"
  | "DRIVE_UPLOAD_FAILED"
  | "DRIVE_READ_FAILED"
  | "DRIVE_DELETE_FAILED"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "REVISION_CONFLICT"
  | "TREE_CYCLE"
  | "INVALID_PARENT"
  | "CANVAS_HAS_CHILDREN"
  | "UNSUPPORTED_MEDIA"
  | "RESOURCE_TOO_LARGE"
  | "REMOTE_RESOURCE_INVALID"
  | "REMOTE_RESOURCE_FAILED"
  | "AI_NOT_CONFIGURED"
  | "AI_PROVIDER_UNAVAILABLE"
  | "AI_CREDENTIAL_REJECTED"
  | "AI_CREDENTIAL_REQUIRED"
  | "AI_CREDENTIAL_INVALID";

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: DomainErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
