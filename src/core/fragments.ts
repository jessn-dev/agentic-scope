import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import picomatch from "picomatch";
import { estimateTokens } from "./tokens.js";
import { TYPE_PRECEDENCE } from "./types.js";
import type {
  Fragment,
  PackQuery,
  PackResult,
  ResolvedFragment,
} from "./types.js";

/** Minimal manifest shape pack() needs. Matches LoadedManifest from manifest.ts. */
export interface LoadedManifestLikeShape {
  manifest: { scope: { budget: number }; fragment: Fragment[] };
  root: string;
}

/** Strip glob syntax from a trigger to get bare keywords (e.g. "**\/*.sql" -> ["sql"]). */
function triggerKeywords(trigger: string): string[] {
  return trigger
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2);
}

/** Determine which of a fragment's triggers match the query. */
export function matchTriggers(fragment: Fragment, query: PackQuery): string[] {
  if (fragment.always) return ["*always*"];
  const matched = new Set<string>();
  const text = (query.text ?? "").toLowerCase();
  const paths = query.paths ?? [];

  for (const trigger of fragment.triggers) {
    // 1. Glob match against any concrete file path.
    if (paths.length > 0) {
      const isMatch = picomatch(trigger, { dot: true });
      if (paths.some((p) => isMatch(p))) {
        matched.add(trigger);
        continue;
      }
    }
    // 2. Keyword match against free-text task description.
    if (text) {
      const kws = triggerKeywords(trigger);
      if (kws.some((kw) => text.includes(kw))) {
        matched.add(trigger);
      }
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

  const ordered = candidates.sort((a, b) => {
    const tp = TYPE_PRECEDENCE[b.fragment.type] - TYPE_PRECEDENCE[a.fragment.type];
    if (tp !== 0) return tp;
    if (b.fragment.priority !== a.fragment.priority) {
      return b.fragment.priority - a.fragment.priority;
    }
    return 0;
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
