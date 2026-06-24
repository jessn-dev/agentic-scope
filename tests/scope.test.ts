import { describe, it, expect } from "vitest";
import { resolve, join } from "node:path";
import { assertWithinWorkspace } from "../src/mcp/scope.js";

const WS = resolve("/tmp/workspace");

describe("assertWithinWorkspace", () => {
  it("allows the workspace root itself", () => {
    expect(assertWithinWorkspace(WS, WS)).toBe(WS);
  });

  it("allows a project inside the workspace", () => {
    expect(assertWithinWorkspace(WS, join(WS, "api"))).toBe(join(WS, "api"));
  });

  it("resolves a relative project against the workspace", () => {
    expect(assertWithinWorkspace(WS, "api")).toBe(join(WS, "api"));
  });

  it("rejects a path that escapes via ..", () => {
    expect(() => assertWithinWorkspace(WS, "../secrets")).toThrow(/outside the workspace/);
  });

  it("rejects an absolute path outside the workspace", () => {
    expect(() => assertWithinWorkspace(WS, "/etc/passwd")).toThrow(/outside the workspace/);
  });
});
