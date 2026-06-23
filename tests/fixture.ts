import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadManifest, type LoadedManifest } from "../src/core/manifest.js";

export interface FixtureFile {
  path: string; // relative to project root
  content: string;
}

/** Create a throwaway agenticscope project on disk and load its manifest. */
export function makeProject(manifest: string, files: FixtureFile[]): {
  loaded: LoadedManifest;
  root: string;
  cleanup: () => void;
} {
  const root = mkdtempSync(join(tmpdir(), "agenticscope-"));
  writeFileSync(join(root, "agenticscope.toml"), manifest, "utf8");
  for (const f of files) {
    const full = join(root, f.path);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, f.content, "utf8");
  }
  return { loaded: loadManifest(root), root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}
