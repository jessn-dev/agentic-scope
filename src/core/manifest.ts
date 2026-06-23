import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { parse as parseToml } from "smol-toml";
import { ManifestSchema, type Manifest } from "./types.js";

export const MANIFEST_FILENAME = "agenticscope.toml";

export interface LoadedManifest {
  manifest: Manifest;
  /** Absolute path of the manifest file. */
  file: string;
  /** Absolute directory containing the manifest (the project root). */
  root: string;
}

/** Parse + validate a manifest from a TOML string. Throws on invalid shape. */
export function parseManifest(toml: string): Manifest {
  const raw = parseToml(toml);
  return ManifestSchema.parse(raw);
}

/** Load + validate the manifest for a project directory. */
export function loadManifest(projectDir: string): LoadedManifest {
  const file = join(resolve(projectDir), MANIFEST_FILENAME);
  if (!existsSync(file)) {
    throw new Error(`No ${MANIFEST_FILENAME} found in ${projectDir}`);
  }
  const manifest = parseManifest(readFileSync(file, "utf8"));
  return { manifest, file, root: dirname(file) };
}

/** True if a directory looks like an agenticscope project. */
export function isProject(dir: string): boolean {
  return existsSync(join(dir, MANIFEST_FILENAME));
}
