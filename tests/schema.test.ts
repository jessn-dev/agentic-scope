import { describe, it, expect } from "vitest";
import { manifestJsonSchema, renderSchema } from "../src/core/schema.js";

describe("manifest JSON schema", () => {
  it("generates a JSON Schema describing the manifest shape", () => {
    const schema = manifestJsonSchema();
    const json = JSON.stringify(schema);
    // The generated schema should describe the scope + fragment structure.
    expect(json).toContain("scope");
    expect(json).toContain("fragment");
    expect(json).toContain("budget");
    expect(json).toContain("precedence");
  });

  it("renders valid, parseable JSON", () => {
    expect(() => JSON.parse(renderSchema())).not.toThrow();
  });
});
