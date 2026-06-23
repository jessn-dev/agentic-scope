import { describe, it, expect, afterEach } from "vitest";
import { grepMemory } from "../src/mcp/grep.js";
import { makeProject } from "./fixture.js";

let cleanup = () => {};
afterEach(() => cleanup());

describe("grepMemory", () => {
  it("finds matches across .scope/memory files", () => {
    const fx = makeProject(`[scope]\nname = "demo"\n`, [
      { path: ".scope/memory/decisions.md", content: "## 001\nWe chose PostgreSQL for JSONB." },
      { path: ".scope/memory/notes.md", content: "remember to rotate tokens" },
    ]);
    cleanup = fx.cleanup;
    const hits = grepMemory([{ name: "demo", path: fx.root }], "postgres");
    expect(hits).toHaveLength(1);
    expect(hits[0]!.file).toContain("decisions.md");
    expect(hits[0]!.line).toBe(2);
  });

  it("is case-insensitive by default and falls back to literal on bad regex", () => {
    const fx = makeProject(`[scope]\nname = "demo"\n`, [
      { path: ".scope/memory/a.md", content: "Cost is $5 (approx)" },
    ]);
    cleanup = fx.cleanup;
    expect(grepMemory([{ name: "demo", path: fx.root }], "COST")).toHaveLength(1);
    // "(" is an invalid standalone regex -> treated as literal, should still match
    expect(grepMemory([{ name: "demo", path: fx.root }], "(approx)")).toHaveLength(1);
  });

  it("returns nothing when there is no memory dir", () => {
    const fx = makeProject(`[scope]\nname = "demo"\n`, [
      { path: "rules.md", content: "no memory here" },
    ]);
    cleanup = fx.cleanup;
    expect(grepMemory([{ name: "demo", path: fx.root }], "anything")).toEqual([]);
  });
});
