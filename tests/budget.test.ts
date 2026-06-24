import { describe, it, expect, afterEach } from "vitest";
import { pack, oversizedFragments } from "../src/core/fragments.js";
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

const MANIFEST = `
[scope]
budget = 4000
[[fragment]]
id = "rules"
type = "rule"
path = "rules.md"
keywords = ["refactor"]
`;
// ~50 tokens of content.
const FILES = [{ path: "rules.md", content: "x".repeat(200) }];

describe("pack budget override", () => {
  it("uses the manifest budget by default", () => {
    const loaded = project(MANIFEST, FILES);
    const res = pack(loaded, { text: "refactor" });
    expect(res.budget).toBe(4000);
    expect(res.included.map((r) => r.fragment.id)).toEqual(["rules"]);
  });

  it("respects a budget override that excludes a fragment", () => {
    const loaded = project(MANIFEST, FILES);
    const res = pack(loaded, { text: "refactor" }, { budget: 5 });
    expect(res.budget).toBe(5);
    expect(res.included).toHaveLength(0);
    expect(res.skipped.find((s) => s.id === "rules")?.reason).toMatch(/over budget/);
  });
});

describe("oversizedFragments", () => {
  it("flags fragments whose content alone exceeds the budget", () => {
    const loaded = project(MANIFEST, FILES);
    const over = oversizedFragments(loaded, { budget: 5 });
    expect(over.map((o) => o.id)).toEqual(["rules"]);
    expect(over[0]!.tokens).toBeGreaterThan(5);
  });

  it("returns nothing when fragments fit", () => {
    const loaded = project(MANIFEST, FILES);
    expect(oversizedFragments(loaded)).toEqual([]);
  });
});
