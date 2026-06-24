import { describe, it, expect } from "vitest";
import { estimateTokens } from "../src/core/tokens.js";

describe("estimateTokens", () => {
  it("uses the chars/4 heuristic by default", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("x".repeat(40))).toBe(10);
  });

  it("counts exact tokens with gpt-tokenizer when exact: true", () => {
    const text = "The quick brown fox jumps over the lazy dog.";
    const exact = estimateTokens(text, { exact: true });
    expect(exact).toBeGreaterThan(0);
    // Exact BPE differs from the chars/4 estimate for normal prose.
    expect(exact).not.toBe(estimateTokens(text));
  });
});
