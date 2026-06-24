## [Unreleased] — 1.0.0 (stable API)

First stable line: the CLI surface, MCP tool surface, and manifest schema are
now considered stable and versioned under SemVer. Released as a **major** because
the vendor-file output format changed (see Changed).

### Added
- `pack --budget <n>` to override the manifest token budget per run, and
  `pack --exact` to count tokens with the bundled `gpt-tokenizer` (cl100k)
  instead of the `chars/4` estimate.
- `lint` now warns about fragments whose content alone exceeds the budget
  (they can never be packed).
- `build --target <name...>` to compile only selected vendors
  (`claude`, `gemini`, `agents`, `cursor`).
- `agenticscope schema` — generate `schema/manifest.schema.json` from the zod
  schema for TOML editor autocomplete/validation.
- `agenticscope mcp-config` — print ready-to-paste MCP server config per host
  (Claude Desktop, Cursor, generic).
- MCP server **HTTP transport**: `agenticscope-mcp --http [port]` serves over
  Streamable HTTP for remote/hosted use, alongside the default stdio transport.

### Changed
- **BREAKING:** vendor files are now rendered per vendor. `CLAUDE.md`/`GEMINI.md`/
  `AGENTS.md` get vendor-specific markdown preambles and `.cursorrules` is a plain
  instruction file (no markdown H1). The old single `# Agent context for <name>`
  header is gone. Re-run `agenticscope build` to regenerate.

### Security
- MCP `project` arguments are scope-guarded to the workspace root; paths that
  escape it (`../…`, absolute paths outside) are rejected.

## [0.2.1](https://github.com/jessn-dev/agentic-scope/compare/v0.2.0...v0.2.1) (2026-06-24)


### Bug Fixes

* correct repository.url and auto-publish from main via OIDC trusted publishing ([537ec9e](https://github.com/jessn-dev/agentic-scope/commit/537ec9ecc98d68105515e411428ac81ea8998ebd))
* correct repository.url and auto-publish from main via OIDC trusted publishing ([dcf50b8](https://github.com/jessn-dev/agentic-scope/commit/dcf50b84e9721cb76a3aee1a3e3727ba690c77d6))
* correct repository.url and auto-publish from main via semantic-release ([4060980](https://github.com/jessn-dev/agentic-scope/commit/4060980094c329bbd599472a9c556e05e70c365a))
* drop setup-node registry-url so npm uses OIDC trusted publishing ([7bbdda5](https://github.com/jessn-dev/agentic-scope/commit/7bbdda5142cafdd8a2706da408079e3c529586a3))
* publish via top-level OIDC step instead of semantic-release exec ([9b3e34f](https://github.com/jessn-dev/agentic-scope/commit/9b3e34f65968029afe5fcc8bcfe19d0409f48d2b))
* run release without environment so OIDC subject matches trusted publisher ([d4434f7](https://github.com/jessn-dev/agentic-scope/commit/d4434f72177a75ac039d02213291831ebeae901b))
* strip setup-node token placeholder from npmrc so npm uses OIDC ([90e8f07](https://github.com/jessn-dev/agentic-scope/commit/90e8f07c13f0dcb591822573579edf76e86aa2d4))
* use node 24 so npm 11 enables OIDC trusted publishing ([0098366](https://github.com/jessn-dev/agentic-scope/commit/009836688723fa0b32cce5a6b09ebbc9af294c31))

# Changelog

All notable changes to this project are documented in this file. Newest first —
what shipped, what I fixed, and what others contributed.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Releases below 0.2.1 were maintained by hand. From 0.2.1 onward, entries are
generated automatically by [semantic-release](https://semantic-release.gitbook.io/)
from [Conventional Commits](https://www.conventionalcommits.org/) on push to `main`.

## [0.2.0]

### Added
- Separate `keywords` (text) from `triggers` (file-path globs) on each fragment.
- `precedence` setting (`"type"` or `"priority"`) to control fragment ordering.
- Test suite (Vitest) covering manifest parsing, trigger matching, packing/budget, vendor build, and memory grep.
- GitHub Actions: CI (typecheck + test + build) and tag-triggered npm publish with provenance.

### Fixed
- Trigger false positives — globs like `**/*.ts` no longer keyword-match unrelated words such as "artifacts".
- MCP tool errors now return a clean `isError` result instead of crashing the server.

## [0.1.0] — Initial release

### Added
- The `.scope/` standard: an `agenticscope.toml` manifest mapping triggers → typed, priced fragments under a token budget.
- CLI: `init`, `lint`, `build`, `pack`.
- Vendor build: compile one `.scope/` source into `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, and `.cursorrules`.
- Read-only MCP server with `list_projects`, `list_subagents`, `list_plans`, `git_status`, `grep_memory`, and `pack_context`.
- A sample workspace under `examples/` to try the commands against.

### Fixed
- Required Node ≥ 22 (Node 18 and 20 are end-of-life).
- Stopped tracking the `.idea/` IDE directory.
