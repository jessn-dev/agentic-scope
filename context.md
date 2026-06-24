# agenticscope — project context

Working notes: what exists, what's left. Last updated 2026-06-24.

## What this is
A directory-as-context standard + a read-only MCP server that gives AI agents
live, structured, token-budgeted awareness of a multi-project workspace.
Solves: monolithic context files burning tokens, mixed rule/knowledge priority,
vendor-folder sprawl, and zero workspace-level awareness.

- **Stack:** TypeScript (ESM, NodeNext), Node >= 22.
- **Repo:** https://github.com/jessn-dev/agentic-scope
- **npm:** `agenticscope` — `0.1.0`, `0.2.0`, `0.2.1` published (provenance, OIDC).
- **Two bins:** `agenticscope` (CLI), `agenticscope-mcp` (MCP server).

## Release pipeline (working)
- Push to `main` → `.github/workflows/release.yml` runs semantic-release
  (Conventional Commits → version/CHANGELOG/tag/GitHub release), then a
  **top-level** `npm publish` via **npm OIDC Trusted Publishing** (no token).
- Node 24 in CI (npm 11.x, needed for OIDC). Key gotchas, all solved:
  Trusted Publisher must match `jessn-dev` / `agentic-scope` / `release.yml` /
  blank env; setup-node's `_authToken` placeholder is stripped from the npmrc;
  publish must be top-level (semantic-release's exec env shadows OIDC).
- `ci.yml` runs typecheck + test + build on PRs.

## Done

### Core (`src/core/`)
- `types.ts` — zod schemas (Fragment, Manifest, precedence).
- `manifest.ts` — load/parse/validate `agenticscope.toml`.
- `tokens.ts` — `chars/4` estimator; `{ exact: true }` uses `gpt-tokenizer` (lazy).
- `fragments.ts` — `matchTriggers`, `pack` (budget override + exact opt), `renderPack`,
  `oversizedFragments` (lint helper).
- `vendor.ts` — per-vendor `compile`/`build`, `resolveTargets` (target selection).
- `schema.ts` — JSON Schema generation from zod (`zod-to-json-schema`).

### CLI (`src/cli.ts`)
- `init`, `lint` (+ oversized-fragment warning), `build` (`--target`),
  `pack` (`--budget`, `--exact`, `-p`, `--raw`), `schema`, `mcp-config`.
- `--version` reads from package.json (no drift).

### MCP server (`src/mcp/`)
- `server.ts` — `createServer()` factory; stdio transport (default) **and**
  `--http [port]` Streamable HTTP transport for remote/hosted use.
- 6 tools, all `guard()`-wrapped → clean `isError`.
- `scope.ts` — path-scope guard: `project` args restricted to the workspace root.
- `pack_context` accepts a `budget` override.

### Tests + CI
- Vitest, **34 tests passing** (manifest, match, pack, budget, vendor, tokens,
  schema, scope, grep). `npm test`.

### Docs / meta
- README: full spec + usage, badges (npm/CI/license/node), new commands/flags,
  HTTP transport, security note. CHANGELOG.md (semantic-release-managed).
- `schema/manifest.schema.json` generated and committed.

## State
- **`develop` carries the 1.0.0 work** (all of the former backlog below).
- Merging `develop` → `main` is intended to cut a **major (1.0.0)** release.
  semantic-release needs a `BREAKING CHANGE:` footer (or `feat!:`) on at least
  one commit to bump to 1.0.0 — the vendor-output format change is the break.

## Backlog — DONE in this 1.0.0 cycle
- [x] #6 `pack --budget` override + lint warning for oversized fragments.
- [x] #7 `schema/manifest.schema.json` generated from zod (+ `schema` command).
- [x] #8 per-vendor formatting + `build --target`.
- [x] #9 `agenticscope mcp-config`.
- [x] #10 optional exact tokenizer (`gpt-tokenizer`) behind `--exact`.
- [x] #12 MCP HTTP transport (`--http`).
- [x] #13 MCP path-scope guard.
- [x] README badges (npm/CI/license/node).

## Future ideas (not started)
- Watch mode for `build` (recompile on `.scope/` change).
- Stateful HTTP MCP sessions (current HTTP mode is stateless per-request).
- Per-fragment include/exclude globs beyond a single `path`.

## Known issues / notes
- Dev-only audit vulns in `vite-node` (via vitest). Prod deps clean; shipped
  package is `dist/` only. Clearing needs a breaking vitest bump — deferred.
- Token counts default to estimates (`chars/4`); use `--exact` / `exact: true`
  for precise counts. Budgets are approximate by design otherwise.
- `context.md` is untracked working notes (not committed to any branch).
