import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import picomatch from "picomatch";
import { estimateTokens } from "./tokens.js";
import { TYPE_PRECEDENCE } from "./types.js";
import type {
  Fragment,
  PackQuery,
  PackResult,
  Precedence,
  ResolvedFragment,
} from "./types.js";

/** Minimal manifest shape pack() needs. Matches LoadedManifest from manifest.ts. */
export interface LoadedManifestLikeShape {
  manifest: { scope: { budget: number; precedence?: Precedence }; fragment: Fragment[] };
  root: string;
}

const GLOB_CHARS = /[*?[\]{}()!]/;

/** A trigger with no glob metacharacters is a plain word, usable for text matching too. */
function isGlob(trigger: string): boolean {
  return GLOB_CHARS.test(trigger);
}

/**
 * Determine which of a fragment's triggers/keywords match the query.
 *
 * - `triggers` are globs, matched ONLY against concrete file paths.
 * - `keywords` are literal words, matched (substring, case-insensitive) against
 *   the task text. A non-glob trigger is also treated as a keyword, so plain
 *   words keep working without forcing every fragment to duplicate them.
 *
 * This split removes the old false-positive bug where a glob like "**\/*.ts"
 * was keyword-split to "ts" and matched unrelated words such as "artifacts".
 */
export function matchTriggers(fragment: Fragment, query: PackQuery): string[] {
  if (fragment.always) return ["*always*"];
  const matched = new Set<string>();
  const text = (query.text ?? "").toLowerCase();
  const paths = query.paths ?? [];

  // 1. Glob triggers -> file paths.
  if (paths.length > 0) {
    for (const trigger of fragment.triggers) {
      const isMatch = picomatch(trigger, { dot: true });
      if (paths.some((p) => isMatch(p))) matched.add(trigger);
    }
  }

  // 2. Keywords (explicit + plain-word triggers) -> task text.
  if (text) {
    const words = [
      ...fragment.keywords,
      ...fragment.triggers.filter((t) => !isGlob(t)),
    ];
    for (const w of words) {
      if (w && text.includes(w.toLowerCase())) matched.add(w);
    }
  }
  return [...matched];
}

/** Read a fragment's content from disk, relative to the project root. */
function loadContent(root: string, fragment: Fragment): string {
  const full = join(root, fragment.path);
  if (!existsSync(full)) {
    throw new Error(`Fragment "${fragment.id}" path not found: ${fragment.path}`);
  }
  return readFileSync(full, "utf8");
}

/**
 * Resolve a query into a budgeted set of fragments.
 *
 * Order: type precedence (rule > spec > persona > knowledge), then priority
 * (desc), then smaller token cost first. Fragments are added until the token
 * budget is exhausted; the rest are reported as skipped.
 */
export function pack(loaded: LoadedManifestLikeShape, query: PackQuery): PackResult {
  const { manifest, root } = loaded;
  const budget = manifest.scope.budget;

  const candidates = manifest.fragment
    .map((fragment) => {
      const matchedTriggers = matchTriggers(fragment, query);
      return { fragment, matchedTriggers };
    })
    .filter((c) => c.matchedTriggers.length > 0);

  const mode: Precedence = manifest.scope.precedence ?? "type";
  const byType = (a: typeof candidates[number], b: typeof candidates[number]) =>
    TYPE_PRECEDENCE[b.fragment.type] - TYPE_PRECEDENCE[a.fragment.type];
  const byPriority = (a: typeof candidates[number], b: typeof candidates[number]) =>
    b.fragment.priority - a.fragment.priority;

  const ordered = candidates.sort((a, b) => {
    const first = mode === "type" ? byType(a, b) : byPriority(a, b);
    if (first !== 0) return first;
    const second = mode === "type" ? byPriority(a, b) : byType(a, b);
    return second;
  });

  const included: ResolvedFragment[] = [];
  const skipped: { id: string; reason: string }[] = [];
  let used = 0;

  // Report fragments that matched nothing.
  for (const f of manifest.fragment) {
    if (!candidates.some((c) => c.fragment.id === f.id)) {
      skipped.push({ id: f.id, reason: "no trigger match" });
    }
  }

  for (const { fragment, matchedTriggers } of ordered) {
    const content = loadContent(root, fragment);
    const tokens = estimateTokens(content);
    if (used + tokens > budget) {
      skipped.push({
        id: fragment.id,
        reason: `over budget (${tokens} tok, ${budget - used} left)`,
      });
      continue;
    }
    included.push({ fragment, content, tokens, matchedTriggers });
    used += tokens;
  }

  return { query, budget, used, included, skipped };
}

/** Render a PackResult to a plain-text context block for pasting into any model. */
export function renderPack(result: PackResult): string {
  const parts: string[] = [];
  for (const r of result.included) {
    parts.push(`<!-- [${r.fragment.type}] ${r.fragment.id} (${r.tokens} tok) -->`);
    parts.push(r.content.trim());
    parts.push("");
  }
  return parts.join("\n").trim();
}
