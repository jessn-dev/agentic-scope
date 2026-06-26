# agenticscope

**A directory-as-context standard plus a read-only MCP server that gives any AI agent live, structured awareness of your workspace — without burning your tokens re-reading everything.**

<div align="left">
  <!-- Core Identity & Publishing -->
  <a href="https://www.npmjs.com/package/agenticscope"><img src="https://img.shields.io/npm/v/agenticscope?style=for-the-badge&logo=npm" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/agenticscope"><img src="https://img.shields.io/npm/dt/agenticscope?style=for-the-badge&logo=npm" alt="NPM Downloads" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/agenticscope?style=for-the-badge&logo=nodedotjs" alt="Node Version" /></a>
  <br/>
  <!-- Build, Quality & Security -->
  <a href="https://github.com/jessn-dev/agentic-scope/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/jessn-dev/agentic-scope/ci.yml?branch=main&style=for-the-badge&logo=github" alt="CI Status" /></a>
  <a href="https://snyk.io/test/npm/agenticscope"><img src="https://img.shields.io/snyk/vulnerabilities/npm/agenticscope?style=for-the-badge" alt="Snyk Vulnerabilities" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?style=for-the-badge&logo=typescript" alt="TypeScript" /></a>
  <a href="https://github.com/semantic-release/semantic-release"><img src="https://img.shields.io/badge/semantic--release-active-e10079?style=for-the-badge&logo=semantic-release" alt="Semantic Release" /></a>
  <br/>
  <!-- Development & Activity Stats -->
  <a href="https://github.com/jessn-dev/agentic-scope/commits/main"><img src="https://img.shields.io/github/last-commit/jessn-dev/agentic-scope?style=for-the-badge" alt="Last Commit" /></a>
  <a href="https://github.com/jessn-dev/agentic-scope/issues"><img src="https://img.shields.io/github/issues/jessn-dev/agentic-scope?style=for-the-badge" alt="Open Issues" /></a>
  <a href="https://github.com/jessn-dev/agentic-scope/pulls"><img src="https://img.shields.io/github/issues-pr/jessn-dev/agentic-scope?style=for-the-badge" alt="Pull Requests" /></a>
  <a href="https://github.com/jessn-dev/agentic-scope"><img src="https://img.shields.io/github/repo-size/jessn-dev/agentic-scope?style=for-the-badge" alt="Repo Size" /></a>
  <br/>
  <!-- Visitors & License -->
  <a href="https://visitorbadge.io/status?path=https%3A%2F%2Fgithub.com%2Fjessn-dev%2Fagentic-scope"><img src="https://api.visitorbadge.io/api/visitors?path=https%3A%2F%2Fgithub.com%2Fjessn-dev%2Fagentic-scope&countColor=%23263759&style=for-the-badge" alt="Visitor Count" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/agenticscope?style=for-the-badge" alt="License" /></a>
  <a href="http://makeapullrequest.com"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge" alt="PRs Welcome" /></a>
</div>

> **License:** MIT · **Requires:** Node.js ≥ 22 · Published to npm with [provenance](https://docs.npmjs.com/generating-provenance-statements).

---

## Why I built this

I kept hitting the same wall.

Every AI coding tool I used — Claude Code, Cursor, Gemini, ChatGPT — wanted me to hand it context. So I did what everyone does: I wrote an `AGENTS.md`, a `CLAUDE.md`, a `.cursorrules`. Then those files grew. Soon a single "context file" held my coding standards, my database schema, my architecture decisions, my current task notes, and a persona prompt — all stacked into one wall of text.

Then I saw what was actually happening under the hood: **the agent re-read the whole thing on almost every turn.** I'd be tweaking some CSS and the model would drag my entire Postgres schema into context to do it. I paid for that — in tokens, in latency, and in hitting my plan limits faster than I should have.

That frustration started this project. I want my AI tools to know *more* about my work while reading *less* of it.

## The pain points I set out to kill

I wrote these down first, and they became my design checklist. A monolithic context file:

1. **Wastes tokens.** The agent reads irrelevant information — schemas while I touch CSS, deploy notes while I fix a unit test. Most of what loads is noise.
2. **Mixes up priority.** When behavioral rules ("never use `any`") share a file with static reference data (an API spec), the model can't tell a hard rule from background knowledge.
3. **Breeds tool noise.** Every vendor wants its own folder — `.claude/`, `.gemini/`, `.cursor/` — and they drift out of sync.
4. **Ignores the workspace.** I work across many repos. Nothing could tell an agent "here's every project, here's which have uncommitted changes, here's what's in flight." Each session started blind.

## How I built it

I started cheap and let each pain point push the design forward:

- I **split the monolith** into small files — but the agent still over-read, so organization alone didn't fix tokens.
- I made it an **index, not a convention.** A tiny `agenticscope.toml` manifest is the only always-loaded file. It maps *triggers* → *fragments*, each with a *type*, *priority*, and *token cost*, under a hard *budget*.
- I made fragments **typed** (`rule` / `knowledge` / `spec` / `persona`) with explicit precedence, so behavioral rules stop drowning in reference dumps.
- I added a **`build` step** that compiles the one `.scope/` source into every vendor's native file — edit once, stay in sync.
- I wrote a **read-only MCP server** so an agent can *ask structured questions* about the whole workspace instead of swallowing files.

## What agenticscope is

Two parts that work together.

### 1. The `.scope/` standard

A predictable layout for everything an agent needs, driven by a tiny manifest:

```text
my-app/
├── agenticscope.toml      # the manifest — tiny, the only file always loaded
└── .scope/
    ├── rules/             # type: rule      — behavioral, high priority
    ├── knowledge/         # type: knowledge — static reference, lazy
    ├── specs/             # type: spec      — current task requirements
    ├── personas/          # type: persona   — swappable agent "hats"
    └── memory/            # persistent project knowledge (decisions, prefs)
```

Each fragment matches a task two ways, kept deliberately separate:

- **`triggers`** — glob patterns, matched **only** against concrete file paths.
- **`keywords`** — plain words, matched (substring, case-insensitive) against the **task text**.

Splitting them avoids false positives (a glob like `**/*.ts` never leaks into text matching as "ts" and grabs unrelated words like "artifacts"). A plain-word trigger is also treated as a keyword, so simple words keep working.

```toml
[scope]
version    = "0.1.0"
name       = "my-project"
budget     = 4000     # hard cap (estimated tokens) per context pack
precedence = "type"   # ordering: "type" (rules first) or "priority"

[[fragment]]
id       = "coding-rules"
type     = "rule"
path     = ".scope/rules/coding.md"
triggers = ["**/*.ts", "**/*.tsx"]   # file paths
keywords = ["refactor", "lint"]      # task text
priority = 100

[[fragment]]
id       = "db-schema"
type     = "knowledge"
path     = ".scope/knowledge/schema.sql"
triggers = ["**/*.sql", "db/**"]
keywords = ["migration", "schema", "database"]
priority = 20
```

### 2. The read-only MCP server

It gives an AI host live, structured awareness of a multi-project workspace. It only reads — it never writes.

| Tool | What it answers |
| :--- | :--- |
| `list_projects` | Which projects exist in the workspace |
| `list_subagents` | Which personas/subagents a project defines |
| `list_plans` | Which plans/specs are in flight |
| `git_status` | The git state of each repo (branch, ahead/behind, dirty count) |
| `grep_memory` | A fast grep over `.scope/memory/` files |
| `pack_context` | A task → a token-budgeted set of fragments |

---

## How to use it

### Install

```bash
# Run without installing:
npx agenticscope init

# Or install the CLI + MCP server globally:
npm i -g agenticscope
```

This gives you two commands: `agenticscope` (the CLI) and `agenticscope-mcp` (the server).

### Quick start

```bash
agenticscope init          # scaffold agenticscope.toml + .scope/ in the current dir
# edit the manifest + fragment files to match your project
agenticscope lint          # validate the manifest and check every fragment path
agenticscope build         # compile .scope/ into CLAUDE.md / GEMINI.md / AGENTS.md / .cursorrules
```

### Pack context for a task

`pack` resolves a task into a budgeted context block. Only matching fragments load, and only until the budget runs out:

```bash
$ agenticscope pack "fix the sql migration" -d ./my-app
► "fix the sql migration" — matched 1 fragment(s) (budget 4000, used 86)
  [knowledge] db-schema             86 tok
  — skipped coding-rules (no trigger match)
  — skipped qa-persona (no trigger match)

<!-- [knowledge] db-schema (86 tok) -->
CREATE TABLE users ( ... );
```

Pipe the packed context straight into any model — including raw web chats:

```bash
agenticscope pack "fix auth bug" --raw | pbcopy   # then paste into ChatGPT, Gemini, etc.
```

Pass concrete file paths so glob triggers match precisely:

```bash
agenticscope pack "refactor handler" -p src/api/handler.ts -p src/db/schema.sql
```

### CLI reference

| Command | Does |
| :--- | :--- |
| `agenticscope init [dir]` | Scaffold a manifest + `.scope/` tree |
| `agenticscope lint [dir]` | Validate the manifest; flag missing paths, dupe ids, dead fragments, and fragments too big for the budget |
| `agenticscope build [dir]` | Compile `.scope/` into vendor files (`-t, --target claude\|gemini\|agents\|cursor` to pick a subset; `--check` to verify they're up to date without writing — exits non-zero if stale, ideal for CI) |
| `agenticscope pack <task...>` | Resolve a task into a budgeted context block (`-d` dir, `-p` paths, `-b, --budget` override, `--exact` tokenizer, `--raw`) |
| `agenticscope schema [dir]` | Generate `schema/manifest.schema.json` for TOML editor autocomplete (`-o` out path) |
| `agenticscope mcp-config` | Print ready-to-paste MCP config (`--workspace`, `--host claude\|cursor\|generic`) |

**Exact token counts.** `pack` estimates tokens with a fast `chars/4` heuristic by default. Pass `--exact` to use the bundled `gpt-tokenizer` (cl100k) for precise counts when a budget is tight.

### Wire up the MCP server

Point any MCP-capable host at the server and give it your workspace root. The host then calls the tools live.

**Claude Code / Claude Desktop** — add to your MCP config (`.mcp.json` or `claude_desktop_config.json`):

```jsonc
{
  "mcpServers": {
    "agenticscope": {
      "command": "npx",
      "args": ["-y", "agenticscope-mcp", "--workspace", "~/Documents"]
    }
  }
}
```

The same server works in **Gemini (Gemini CLI)**, **ChatGPT / OpenAI agents**, **Cursor**, **Zed**, and **Windsurf** — each just has its own config file. You can also set the workspace with the `AGENTICSCOPE_WORKSPACE` environment variable instead of `--workspace`, or run `agenticscope mcp-config --host cursor` to print a ready-to-paste block.

**Stdio by default; HTTP for remote/hosted use.** Desktop hosts launch the server over stdio. To run it as a shared service, start it over Streamable HTTP:

```bash
agenticscope-mcp --http 3000 --workspace ~/Documents   # serves POST/GET http://localhost:3000/mcp
```

**Safe by construction.** Every tool is read-only, errors return a clean `isError` result instead of crashing the host, and `project` arguments are **scope-guarded** to the workspace root — a client can't coax the server into reading `/etc` or `../../secrets`.

Once connected, I ask things like *"what's in flight across my workspace?"* and the host calls `list_plans` + `git_status` and answers from structured data — **no file dumps, no token burn.** That's the whole point delivered.

---

## How you can leverage this

You don't need my exact setup to benefit. There are three ways in.

**Use it as-is.** Scaffold `.scope/` in your projects and point an MCP host at the server. You get progressive, budgeted context and live workspace awareness immediately.

**Use it with any vendor.**
- *MCP path (live tools):* any host that speaks MCP — Claude Code/Desktop, Gemini, ChatGPT/OpenAI agents, Cursor, Zed, Windsurf.
- *CLI path (works everywhere, even raw web chats):* `build` generates each vendor's file from one source; `pack` prints a budgeted block you can paste into any model.

**Use it as a base for your own.** Everything here is intentionally simple and MIT-licensed. Fork it and:
- Define your own fragment types beyond rule/knowledge/spec/persona.
- Swap the token estimator — it ships with a dependency-free `chars/4` heuristic; drop in a real tokenizer if you need exact counts.
- Add your own MCP tools — the server is read-only by design, but the pattern extends cleanly.
- Replace the resolver — the trigger/priority/budget model is a starting point, not a cage.

## Requirements

- **Node.js ≥ 22** (active LTS; Node 18 and 20 are end-of-life).
- **An AI tool you already use** — Claude Code, Claude Desktop, Gemini, ChatGPT/OpenAI, Cursor, etc.
- **No API key, no extra credits.** agenticscope runs entirely locally and never calls a model itself. Driving it through Claude Code on a Pro plan needs nothing more — the MCP tools run inside your normal session.

## Project layout

```text
agenticscope/
├── src/
│   ├── cli.ts            # init / lint / build / pack
│   ├── core/             # manifest parsing, fragment resolution, token budget, vendor build
│   └── mcp/              # read-only MCP server + tools (workspace scan, git, grep)
└── examples/
    └── sample-workspace/ # a working .scope/ project to try the commands against
```

## Contributing

Contributions are welcome.

- **Found a bug or have an idea?** Open an issue: https://github.com/jessn-dev/agentic-scope/issues
- **Sending a pull request?** Fork, branch, run `npm run typecheck && npm test` before you push, and describe the change. Releases and merged changes are recorded in [CHANGELOG.md](CHANGELOG.md).
- **Local setup:**
  ```bash
  npm install
  npm run typecheck
  npm test
  npm run dev:cli -- lint examples/sample-workspace/api   # run the CLI from source
  npm run dev:mcp                                          # run the MCP server from source
  ```

## Status & roadmap

The `1.0` line marks a stable CLI + MCP tool surface and manifest schema. The standard and tooling will keep evolving; breaking changes are released as new majors. Feedback, forks, and competing designs are all welcome — I want a better way to feed agents context, not a walled garden.

---

*I built this because I was tired of watching a context file I never read eat tokens I couldn't spare.*
