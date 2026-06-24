import { createRequire } from "node:module";

/**
 * Lightweight token estimator.
 *
 * Default: dependency-free ~chars/4 heuristic. A real BPE tokenizer is heavier
 * and model-specific, but for budgeting decisions the heuristic is close enough
 * and never blocks install or adds native build steps.
 *
 * Exact mode: pass `{ exact: true }` to use `gpt-tokenizer` (pure JS, cl100k
 * base — what GPT-4/3.5 and roughly Claude use). The dependency is loaded lazily
 * the first time exact mode is requested, so the default path stays zero-cost.
 */
export interface TokenOptions {
  exact?: boolean;
}

const require = createRequire(import.meta.url);
let exactEncode: ((text: string) => unknown[]) | null = null;

/** Lazily load gpt-tokenizer's encoder; throws a friendly error if absent. */
function getExactEncoder(): (text: string) => unknown[] {
  if (exactEncode) return exactEncode;
  try {
    const mod = require("gpt-tokenizer") as { encode: (t: string) => unknown[] };
    exactEncode = mod.encode;
    return exactEncode;
  } catch {
    throw new Error(
      "Exact tokenization needs the optional 'gpt-tokenizer' package. Install it with `npm i gpt-tokenizer`.",
    );
  }
}

export function estimateTokens(text: string, opts: TokenOptions = {}): number {
  if (!text) return 0;
  if (opts.exact) return getExactEncoder()(text).length;
  // ~4 chars per token is the standard rough English heuristic.
  return Math.ceil(text.length / 4);
}
