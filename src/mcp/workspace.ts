import { readdirSync, existsSync, statSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { loadManifest, isProject, MANIFEST_FILENAME } from "../core/manifest.js";
import type { Fragment } from "../core/types.js";

export interface ProjectInfo {
  name: string;
  path: string;
  hasGit: boolean;
  fragmentCount: number;
  types: Record<string, number>;
}

const IGNORE = new Set(["node_modules", ".git", "dist", ".next", "vendor", ".cache"]);

/**
 * Scan a workspace root for agenticscope projects.
 * Looks at the root itself plus one level of subdirectories (depth 1) — enough
 * for the common "one folder of repos" layout, cheap enough to stay fast.
 */
export function scanProjects(workspaceRoot: string, maxDepth = 1): ProjectInfo[] {
  const found: ProjectInfo[] = [];

  const visit = (dir: string, depth: number) => {
    if (isProject(dir)) found.push(describeProject(dir));
    if (depth >= maxDepth) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (IGNORE.has(entry) || entry.startsWith(".")) continue;
      const child = join(dir, entry);
      try {
        if (statSync(child).isDirectory()) visit(child, depth + 1);
      } catch {
        /* unreadable, skip */
      }
    }
  };

  visit(workspaceRoot, 0);
  return found;
}

function describeProject(dir: string): ProjectInfo {
  const types: Record<string, number> = {};
  let fragmentCount = 0;
  let name = basename(dir);
  try {
    const { manifest } = loadManifest(dir);
    name = manifest.scope.name ?? name;
    fragmentCount = manifest.fragment.length;
    for (const f of manifest.fragment) types[f.type] = (types[f.type] ?? 0) + 1;
  } catch {
    /* malformed manifest — still report the project shell */
  }
  return {
    name,
    path: dir,
    hasGit: existsSync(join(dir, ".git")),
    fragmentCount,
    types,
  };
}

/** Fragments of a given type across a project, with their on-disk content. */
export function fragmentsByType(dir: string, type: Fragment["type"]) {
  const { manifest, root } = loadManifest(dir);
  return manifest.fragment
    .filter((f) => f.type === type)
    .map((f) => {
      const full = join(root, f.path);
      const content = existsSync(full) ? readFileSync(full, "utf8") : null;
      return { id: f.id, path: f.path, content };
    });
}

export { MANIFEST_FILENAME };
