import { describe, it, expect } from "vitest";
import { matchTriggers } from "../src/core/fragments.js";
import { FragmentSchema, type Fragment } from "../src/core/types.js";

const frag = (over: Partial<Fragment>): Fragment =>
  FragmentSchema.parse({ id: "f", type: "knowledge", path: "x.md", ...over });

describe("matchTriggers", () => {
  it("matches glob triggers against file paths only", () => {
    const f = frag({ triggers: ["**/*.sql"] });
    expect(matchTriggers(f, { paths: ["db/schema.sql"] })).toContain("**/*.sql");
    expect(matchTriggers(f, { paths: ["src/app.ts"] })).toEqual([]);
  });

  it("does NOT keyword-match a glob trigger (the false-positive fix)", () => {
    // Old behavior split "**/*.ts" -> "ts" and matched "artifacts". Must not now.
    const f = frag({ triggers: ["**/*.ts"] });
    expect(matchTriggers(f, { text: "build the artifacts" })).toEqual([]);
  });

  it("matches explicit keywords against task text (case-insensitive)", () => {
    const f = frag({ keywords: ["migration", "schema"] });
    expect(matchTriggers(f, { text: "fix the SQL MIGRATION" })).toContain("migration");
  });

  it("treats a plain-word trigger as a keyword too", () => {
    const f = frag({ triggers: ["login"] });
    expect(matchTriggers(f, { text: "debug the login flow" })).toContain("login");
  });

  it("always-fragments match unconditionally", () => {
    const f = frag({ always: true });
    expect(matchTriggers(f, {})).toEqual(["*always*"]);
  });

  it("returns empty when nothing matches", () => {
    const f = frag({ triggers: ["**/*.css"], keywords: ["style"] });
    expect(matchTriggers(f, { text: "write a database query", paths: ["a.ts"] })).toEqual([]);
  });
});
