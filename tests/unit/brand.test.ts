import { describe, expect, it } from "vitest";

import { brand } from "../../src/config/brand";

describe("brand configuration", () => {
  it("keeps the commercial name configurable", () => {
    expect(brand.name).toBe("KnowCanvas");
    expect(brand.tagline).toBeTruthy();
  });
});
