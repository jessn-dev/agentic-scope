import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ManifestSchema } from "./types.js";

/** Path (relative to project root) where the generated schema lives. */
export const SCHEMA_PATH = "schema/manifest.schema.json";

/**
 * Build a JSON Schema for agenticscope.toml from the zod ManifestSchema.
 * Editors with TOML support (e.g. Even Better TOML) use this for validation
 * and autocomplete. Kept generated so it can never drift from the zod source.
 */
export function manifestJsonSchema(): Record<string, unknown> {
  return zodToJsonSchema(ManifestSchema, {
    name: "AgenticscopeManifest",
    $refStrategy: "none",
  }) as Record<string, unknown>;
}

/** Serialize the schema as pretty JSON (newline-terminated). */
export function renderSchema(): string {
  return JSON.stringify(manifestJsonSchema(), null, 2) + "\n";
}

/** Write the schema to `outPath`, creating parent dirs as needed. */
export function writeSchema(outPath: string): void {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, renderSchema(), "utf8");
}
