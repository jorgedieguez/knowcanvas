import { describe, expect, it } from "vitest";

import {
  openAiResponseError,
  proposalJsonSchema,
} from "../../src/infrastructure/openai-generation";

describe("OpenAI generation errors", () => {
  it("explains when the API account has no quota", () => {
    const error = openAiResponseError(429, { error: { code: "insufficient_quota" } });

    expect(error.status).toBe(429);
    expect(error.message).toContain("no tiene saldo");
  });

  it("asks to replace a rejected key without exposing provider details", () => {
    const error = openAiResponseError(401, { error: { type: "invalid_request_error" } });

    expect(error.code).toBe("AI_CREDENTIAL_REJECTED");
    expect(error.message).toContain("Vuelve a configurarla");
  });

  it("keeps unknown provider failures generic", () => {
    const error = openAiResponseError(400, {
      error: { code: "unknown_code", message: "provider internals" },
    });

    expect(error.status).toBe(502);
    expect(error.message).not.toContain("provider internals");
  });

  it("identifies an incompatible Structured Outputs schema", () => {
    const error = openAiResponseError(400, { error: { code: "invalid_json_schema" } });

    expect(error.message).toContain("formato de la propuesta");
  });

  it("exposes every widget using OpenAI-compatible enum discriminators", () => {
    const schema = JSON.stringify(proposalJsonSchema);

    expect(schema).not.toContain('"const"');
    expect(schema).not.toContain('"oneOf"');
    expect(schema).toContain('"anyOf"');
    for (const type of [
      "richText",
      "image",
      "diagram",
      "pele",
      "table",
      "navigation",
      "quiz",
      "accordion",
      "tabs",
      "flashcards",
      "timeline",
      "hotspots",
      "sorting",
    ])
      expect(schema).toContain(`"${type}"`);
  });
});
