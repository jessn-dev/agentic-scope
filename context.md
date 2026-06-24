# agenticscope — project context

Working notes: what exists, what's left. Last updated 2026-06-23.

## What this is
A directory-as-context standard + a read-only MCP server that gives AI agents
live, structured, token-budgeted awareness of a multi-project workspace.
Solves: monolithic context files burning tokens, mixed rule/knowledge priority,
vendor-folder sprawl, and zero workspace-level awareness.

- **Stack:** TypeScript (ESM, NodeNext), Node >= 22.
- **Repo:** https://github.com/jessn-dev/agenticscope
- **npm:** `agenticscope` (name reserved; `0.1.0` published, `0.2.0` pending publish).
- **Two bins:** `agenticscope` (CLI), `agenticscope-mcp` (MCP server).

## Done

### Core (`src/core/`)
- `types.ts` — zod schemas. Fragment fields: `id`, `type` (rule|knowledge|spec|persona),
  `path`, `triggers` (globs→paths), `keywords` (words→text), `priority`, `always`.
  Scope: `version`, `budget`, `name`, `precedence` ("type" | "priority").
- `manifest.ts` — load/parse/validate `agenticscope.toml` (smol-toml + zod).
- `tokens.ts` — dependency-free `chars/4` estimator.
- `fragments.ts` — `matchTriggers` (glob vs keyword split, false-positive fixed),
  `pack` (precedence ordering + hard budget cap + skip reasons), `renderPack`.
- `vendor.ts` — `compile`/`build` → CLAUDE.md, GEMINI.md, AGENTS.md, .cursorrules.

### CLI (`src/cli.ts`)
- `init` (scaffold), `lint` (validate + dead-fragment/dup checks), `build`, `pack`.

### MCP server (`src/mcp/`)
- `server.ts` — stdio transport, 6 tools, all wrapped in `guard()` → clean `isError`.
- Tools: `list_projects`, `list_subagents`, `list_plans`, `git_status`,
  `grep_memory`, `pack_context`.
- `workspace.ts` (scan depth-1 for projects), `git.ts` (read-only simple-git),
  `grep.ts` (pure-Node grep over `.scope/memory/`).

### Tests + CI
- Vitest, 18 tests passing (manifest, match, pack, vendor, grep). `npm test`.
- `.github/workflows/ci.yml` — typecheck + test + build on push/PR.
- `.github/workflows/publish.yml` — tag `v*` → `npm publish --provenance`
  (needs `NPM_TOKEN` repo secret w/ bypass-2FA; NOT set yet).

### Docs / meta
- README: full spec, usage, MCP config, Changelog, Contributing. Active first-person voice.
- LICENSE (MIT, Jesse B Ngolab), `.gitignore` (ignores generated vendor files + .idea).
- `examples/sample-workspace/api/` — working demo project.
- package.json metadata (author/repo/bugs/homepage) filled.

## State
- Local: bumped to `0.2.0`, commit + tag `v0.2.0` created.
- `0.2.0` NOT yet published to npm, and the bump commit/tag may not be pushed.

## TODO

### Immediate (finish the 0.2.0 release)
- [ ] `npm publish --otp=XXXXXX` (blocked on 2FA OTP — needs the human).
- [ ] `git push && git push --tags`.
- [ ] (optional) Add `NPM_TOKEN` secret so tag pushes auto-publish.

### Tier 3 — next features (agreed backlog)
- [ ] #5 done? precedence config shipped. (priority-vs-type configurable — DONE)
- [ ] #6 `--budget` override on `pack`; lint warning when one fragment > budget.
- [ ] #7 Generate `schema/manifest.schema.json` from zod for TOML autocomplete
      (the `schema/` dir + package keyword exist but the file is empty).
- [ ] #8 Per-vendor formatting (Cursor vs Claude idioms) + `--target` flag on build.
- [ ] #9 `agenticscope mcp-config` — print ready-to-paste MCP JSON per host.
- [ ] #10 Optional exact tokenizer (gpt-tokenizer, pure JS) behind a flag.

### Tier 4 — distribution / hardening
- [ ] #11 Separate CHANGELOG.md (keep-a-changelog) + README badges (npm/CI/license).
- [ ] #12 HTTP transport for MCP (currently stdio-only) for remote/hosted use.
- [ ] #13 Path-scope guard: restrict MCP `project` args to within the workspace root.

### Known issues / notes
- Dev-only audit vulns in `vite-node` (via vitest). Prod deps: 0 vulns. Shipped
  package is `dist/` only, so users are unaffected. Clearing needs a breaking
  vitest major bump — deferred.
- `list_subagents` / `list_plans` require an absolute `project` path argument;
  consider accepting a project name resolved against the workspace.
- Token counts are estimates (chars/4); budgets are approximate by design.
