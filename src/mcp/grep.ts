import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

export interface GrepHit {
  project: string;
  file: string;
  line: number;
  text: string;
}

/**
 * Pure-Node grep over .scope/memory/ files across the given project dirs.
 * No ripgrep dependency — portable, no binary to install. Memory trees are
 * small, so a straight file walk is plenty fast.
 */
export function grepMemory(
  projects: { name: string; path: string }[],
  pattern: string,
  opts: { ignoreCase?: boolean; maxHits?: number } = {},
): GrepHit[] {
  const { ignoreCase = true, maxHits = 200 } = opts;
  let re: RegExp;
  try {
    re = new RegExp(pattern, ignoreCase ? "i" : "");
  } catch {
    // Treat an invalid regex as a literal substring.
    re = new RegExp(escapeRegExp(pattern), ignoreCase ? "i" : "");
  }

  const hits: GrepHit[] = [];
  for (const project of projects) {
    const memDir = join(project.path, ".scope", "memory");
    if (!existsSync(memDir)) continue;
    for (const file of walk(memDir)) {
      const rel = relative(project.path, file);
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const text = lines[i] ?? "";
        if (re.test(text)) {
          hits.push({ project: project.name, file: rel, line: i + 1, text: text.trim() });
          if (hits.length >= maxHits) return hits;
        }
      }
    }
  }
  return hits;
}

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.(md|markdown|txt)$/i.test(entry)) yield full;
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
