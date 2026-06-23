import { describe, it, expect, afterEach } from "vitest";
import { pack } from "../src/core/fragments.js";
import { makeProject } from "./fixture.js";

let cleanups: Array<() => void> = [];
afterEach(() => {
  cleanups.forEach((c) => c());
  cleanups = [];
});

function project(manifest: string, files: { path: string; content: string }[]) {
  const fx = makeProject(manifest, files);
  cleanups.push(fx.cleanup);
  return fx.loaded;
}

describe("pack", () => {
  it("includes only fragments whose triggers/keywords match", () => {
    const loaded = project(
      `
[scope]
budget = 4000
[[fragment]]
id = "rules"
type = "rule"
path = "rules.md"
keywords = ["refactor"]
[[fragment]]
id = "schema"
type = "knowledge"
path = "schema.sql"
keywords = ["sql", "migration"]
`,
      [
        { path: "rules.md", content: "no any types" },
        { path: "schema.sql", content: "CREATE TABLE t (id INT);" },
      ],
    );
    const res = pack(loaded, { text: "fix the sql migration" });
    const ids = res.included.map((r) => r.fragment.id);
    expect(ids).toEqual(["schema"]);
    expect(res.skipped.map((s) => s.id)).toContain("rules");
  });

  it("enforces the token budget and reports over-budget skips", () => {
    const big = "x".repeat(4000); // ~1000 tokens
    const loaded = project(
      `
[scope]
budget = 100
[[fragment]]
id = "big"
type = "knowledge"
path = "big.md"
keywords = ["load"]
`,
      [{ path: "big.md", content: big }],
    );
    const res = pack(loaded, { text: "load it" });
    expect(res.included).toHaveLength(0);
    expect(res.skipped.find((s) => s.id === "big")?.reason).toMatch(/over budget/);
    expect(res.used).toBe(0);
  });

  it("orders by type precedence by default (rule before knowledge)", () => {
    const loaded = project(
      `
[scope]
budget = 4000
precedence = "type"
[[fragment]]
id = "k"
type = "knowledge"
path = "k.md"
keywords = ["go"]
priority = 100
[[fragment]]
id = "r"
type = "rule"
path = "r.md"
keywords = ["go"]
priority = 1
`,
      [
        { path: "k.md", content: "knowledge" },
        { path: "r.md", content: "rule" },
      ],
    );
    const res = pack(loaded, { text: "go" });
    expect(res.included.map((r) => r.fragment.id)).toEqual(["r", "k"]);
  });

  it("orders by priority when precedence = priority", () => {
    const loaded = project(
      `
[scope]
budget = 4000
precedence = "priority"
[[fragment]]
id = "k"
type = "knowledge"
path = "k.md"
keywords = ["go"]
priority = 100
[[fragment]]
id = "r"
type = "rule"
path = "r.md"
keywords = ["go"]
priority = 1
`,
      [
        { path: "k.md", content: "knowledge" },
        { path: "r.md", content: "rule" },
      ],
    );
    const res = pack(loaded, { text: "go" });
    expect(res.included.map((r) => r.fragment.id)).toEqual(["k", "r"]);
  });
});
