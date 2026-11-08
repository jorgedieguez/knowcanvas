import { describe, expect, it } from "vitest";

import { decryptUserSecret, encryptUserSecret } from "../../src/worker/user-secrets";
import type { Env } from "../../src/worker/env";

describe("user secrets", () => {
  it("encrypts API keys with a random IV and decrypts them only with the server key", async () => {
    const env = { USER_SECRET_ENCRYPTION_KEY: "A".repeat(43) } as Env;
    const secret = "sk-example-secret-that-must-never-leave-the-worker";

    const first = await encryptUserSecret(secret, env);
    const second = await encryptUserSecret(secret, env);

    expect(first).not.toContain(secret);
    expect(second).not.toBe(first);
    await expect(decryptUserSecret(first, env)).resolves.toBe(secret);
  });
});
