/**
 * Lightweight token estimator.
 *
 * Deliberately dependency-free: a real BPE tokenizer (tiktoken) is heavy and
 * model-specific. For budgeting decisions a ~chars/4 heuristic is close enough,
 * and it never blocks install or adds native build steps. Swap this single
 * function out if you need exact, per-model counts.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // ~4 chars per token is the standard rough English heuristic.
  return Math.ceil(text.length / 4);
}
