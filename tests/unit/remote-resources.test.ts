import { describe, expect, it } from "vitest";

import { assertRemoteImageUrl } from "../../src/infrastructure/resources";

describe("remote image URLs", () => {
  it("accepts public HTTPS sources", () => {
    expect(assertRemoteImageUrl("https://upload.wikimedia.org/example.png").hostname).toBe(
      "upload.wikimedia.org",
    );
  });

  it.each([
    "http://example.com/image.png",
    "https://localhost/image.png",
    "https://127.0.0.1/image.png",
    "https://10.0.0.2/image.png",
    "https://192.168.1.2/image.png",
    "https://172.16.0.2/image.png",
  ])("rejects non-public source %s", (url) => {
    expect(() => assertRemoteImageUrl(url)).toThrow("HTTPS pública");
  });
});
