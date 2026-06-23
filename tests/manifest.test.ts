import { describe, it, expect } from "vitest";
import { parseManifest } from "../src/core/manifest.js";

describe("parseManifest", () => {
  it("parses a valid manifest and applies defaults", () => {
    const m = parseManifest(`
[scope]
name = "demo"

[[fragment]]
id   = "r1"
type = "rule"
path = ".scope/rules/a.md"
`);
    expect(m.scope.name).toBe("demo");
    expect(m.scope.budget).toBe(4000); // default
    expect(m.scope.precedence).toBe("type"); // default
    expect(m.fragment).toHaveLength(1);
    const f = m.fragment[0]!;
    expect(f.priority).toBe(50); // default
    expect(f.triggers).toEqual([]);
    expect(f.keywords).toEqual([]);
    expect(f.always).toBe(false);
  });

  it("rejects an invalid fragment type", () => {
    expect(() =>
      parseManifest(`
[scope]
[[fragment]]
id = "x"
type = "nonsense"
path = "a.md"
`),
    ).toThrow();
  });

  it("rejects a non-positive budget", () => {
    expect(() => parseManifest(`[scope]\nbudget = 0\n`)).toThrow();
  });
});
