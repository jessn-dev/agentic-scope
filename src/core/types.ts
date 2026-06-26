import { z } from "zod";

/**
 * Fragment types carry precedence semantics:
 *  - rule:      behavioral guidance, highest priority, sticky
 *  - knowledge: static reference data, loaded lazily
 *  - spec:      current task requirements
 *  - persona:   a swappable agent "hat"
 *  - memory:    decisions, logs, and state
 */
export const FragmentType = z.enum(["rule", "knowledge", "spec", "persona", "memory"]);
export type FragmentType = z.infer<typeof FragmentType>;

/** Default precedence used when ordering matched fragments for a pack. */
export const TYPE_PRECEDENCE: Record<FragmentType, number> = {
  rule: 4,
  spec: 3,
  persona: 2,
  memory: 1,
  knowledge: 0,
};

export const FragmentSchema = z.object({
  id: z.string().min(1),
  type: FragmentType,
  path: z.string().min(1),
  /** Glob patterns matched against concrete file paths (path matching only). */
  triggers: z.array(z.string()).default([]),
  /** Literal words matched (substring, case-insensitive) against task text. */
  keywords: z.array(z.string()).default([]),
  priority: z.number().int().default(50),
  /** When true, the fragment is always included regardless of trigger match. */
  always: z.boolean().default(false),
});
export type Fragment = z.infer<typeof FragmentSchema>;

/** How matched fragments are ordered before the budget is applied. */
export const Precedence = z.enum(["type", "priority"]);
export type Precedence = z.infer<typeof Precedence>;

export const ManifestSchema = z.object({
  scope: z.object({
    version: z.string().default("0.1.0"),
    /** Hard cap (in estimated tokens) on a single resolved context pack. */
    budget: z.number().int().positive().default(4000),
    /** Optional human label for this project. */
    name: z.string().optional(),
    /**
     * Ordering strategy: "type" (rule > spec > persona > knowledge, then
     * priority) or "priority" (priority desc, ties broken by type).
     */
    precedence: Precedence.default("type"),
  }),
  fragment: z.array(FragmentSchema).default([]),
});
export type Manifest = z.infer<typeof ManifestSchema>;

/** A fragment resolved against a query, with its loaded content + token cost. */
export interface ResolvedFragment {
  fragment: Fragment;
  content: string;
  tokens: number;
  matchedTriggers: string[];
}

export interface PackResult {
  query: PackQuery;
  budget: number;
  used: number;
  included: ResolvedFragment[];
  skipped: { id: string; reason: string }[];
}

export interface PackQuery {
  /** Free-text task description, e.g. "fix the sql migration". */
  text?: string;
  /** Concrete file paths the task touches, matched against glob triggers. */
  paths?: string[];
}
