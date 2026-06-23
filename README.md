# agenticscope

**A directory-as-context standard plus a read-only MCP server that gives any AI agent live, structured awareness of your workspace — without burning your tokens re-reading everything.**

> **Status:** Draft 0.1.0
> **License:** MIT

---

## Why I built this

I kept hitting the same wall.

Every AI coding tool I used — Claude Code, Cursor, Gemini, ChatGPT — wanted me to hand it context. So I did what everyone does: I made an `AGENTS.md`, a `CLAUDE.md`, a `.cursorrules`. Then those files grew. And grew. Soon a single "context file" held my coding standards, my database schema, my architecture decisions, my current task notes, and a persona prompt — all stacked into one wall of text.

Then I noticed what was actually happening under the hood: **the agent was re-reading the whole thing on almost every turn.** I was working on a CSS tweak and the model was dragging my entire Postgres schema into context to do it. I was paying for that — in tokens, in latency, and in hitting my plan limits faster than I should have.

That was the moment this project started. Not from a grand vision — from frustration with watching a monolithic context file quietly eat my budget for no reason.

## The pain points I was solving

I wrote these down early because they became my design checklist. A monolithic context file leads to:

1. **Inefficient token usage.** The agent reads irrelevant information — database schemas while I'm working on CSS, deployment notes while I'm fixing a unit test. Most of what gets loaded is noise for the task at hand.

2. **Conflicting instructions.** When behavioral rules ("never use `any`") sit in the same file as static reference data (an API spec), the model can't tell what's a hard rule versus background knowledge. Priority gets muddy.

3. **Tool noise.** Every vendor wants its own folder — `.claude/`, `.gemini/`, `.cursor/`. My project root turned into a graveyard of near-duplicate config, all drifting out of sync.

4. **No workspace-level awareness.** Even when a single project was tidy, I work across *many* repos. No tool could tell an agent "here's every project in this workspace, here's which ones have uncommitted changes, here's what plans are in flight." Each agent session started blind.

## How I started building it

I started with the cheapest possible idea and let the pain points push me forward.

- **First instinct: just organize the files.** Split the monolith into a folder of smaller files and a tiny "router" at the root. That helped clutter, but it didn't fix token burn — the agent still *decided* what to read, and usually over-read.

- **Next: make it an index, not a convention.** Instead of hoping the agent reads the right file, I made a small **manifest** the single always-loaded artifact. It maps *triggers* (what you're working on) to *fragments* (small, typed pieces of context) and assigns each a *priority* and a *token cost*. Now context can be resolved deliberately, with a hard budget cap.

- **Then: separate behavior from knowledge.** Fragments became **typed** — `rule`, `knowledge`, `spec`, `persona` — with explicit precedence. Behavioral rules stop drowning in reference dumps.

- **Then: one source, many vendors.** A `build` step compiles the single `.scope/` source into each tool's native file, so I edit one place and every vendor stays in sync. No more drifting duplicates.

- **Finally: make the workspace itself queryable.** This is where the **read-only MCP server** came in. Instead of dumping files into context, the agent can *ask structured questions* — what projects exist, what subagents are defined, what plans are in flight, the git state of each repo, a fast grep over memory files. The model pulls only the structured answer it needs, when it needs it. That's the token fix made real.

## What agenticscope is

Two things that work together:

### 1. A standard — the `.scope/` directory

A small, predictable layout for everything an agent needs to know about a project, driven by a tiny manifest.

```text
my-app/
├── agenticscope.toml      # the manifest — tiny, the only thing always loaded
└── .scope/
    ├── rules/             # type: rule      — behavioral, high priority ("no any types")
    ├── knowledge/         # type: knowledge — static reference, lazy ("schema.sql")
    ├── specs/             # type: spec      — current task requirements
    ├── personas/          # type: persona   — swappable agent "hats"
    └── memory/            # persistent project knowledge (decisions, learned prefs)
```

The manifest maps **triggers → fragments**, each with a **type**, **priority**, and **token cost**, under a global **budget**:

```toml
[scope]
version = "0.1.0"
budget  = 4000   # hard cap on tokens a single context pack may use

[[fragment]]
id       = "coding-rules"
type     = "rule"
path     = ".scope/rules/coding.md"
triggers = ["**/*.ts", "**/*.tsx"]
priority = 100

[[fragment]]
id       = "db-schema"
type     = "knowledge"
path     = ".scope/knowledge/schema.sql"
triggers = ["**/*.sql", "db/**"]
priority = 20
```

### 2. A read-only MCP server

A Model Context Protocol server that gives an AI host (Claude Code, Claude Desktop, Gemini, ChatGPT/OpenAI agents, Cursor) **live, structured awareness of a multi-project workspace**. It never writes — it only answers. Tools it exposes:

| Tool | Answers |
| :--- | :--- |
| `list_projects` | Which projects exist in the workspace |
| `list_subagents` | Which subagents/personas are defined per project |
| `list_plans` | What plans/specs are currently in flight |
| `git_status` | The git state of each repo (branch, ahead/behind, dirty files) |
| `grep_memory` | A fast grep over `.scope/memory/` files |
| `pack_context` | Resolve a task description → a budgeted set of fragments |

The whole point: the agent gets **structured, budgeted answers instead of file dumps** — so it stops re-reading your world on every turn.

## The end goal

A single, vendor-agnostic source of truth for agent context that:

- **Loads only what the task needs**, under a token budget I control.
- **Keeps behavior and knowledge separate**, so rules are never lost in reference noise.
- **Stays in sync across every AI tool** from one source, with zero vendor-folder sprawl.
- **Makes an entire multi-repo workspace queryable**, so any agent can start with situational awareness instead of starting blind.

In short: I want my AI tools to know *more* about my work while reading *less* of it.

## How you can leverage this

You don't need my exact setup to benefit. There are three ways in:

### Use it as-is
Point an MCP-capable host at the server and scaffold the `.scope/` standard in your projects. You get progressive, budgeted context and live workspace awareness immediately.

### Use it with any vendor
- **MCP path (live tools):** Works with any host that speaks MCP — Claude Code/Desktop, Gemini, ChatGPT/OpenAI agents, Cursor, Zed, Windsurf. Same server, different config file.
- **CLI path (works everywhere, even raw web chats):**
  - `build` compiles `.scope/` into each vendor's native file (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`, `.cursorrules`) from one source.
  - `pack "task"` prints a budgeted, plain-text context block you can paste into *any* model — ChatGPT, Gemini, a local LLM, anything.

### Use it as a base for your own
Everything here is intentionally simple and MIT-licensed. Fork it and:
- Define your **own fragment types** beyond rule/knowledge/spec/persona.
- Swap the **token estimator** (it ships with a lightweight `chars/4` heuristic; drop in a real tokenizer if you need exact counts).
- Add your **own MCP tools** — the server is read-only by design, but the pattern extends cleanly.
- Build a different **resolver strategy** — the trigger/priority/budget model is a starting point, not a cage.

## Requirements

- **Node.js ≥ 22** (active LTS; Node 18 and 20 are end-of-life).
- **An AI tool you already use** — Claude Code, Claude Desktop, Gemini, ChatGPT/OpenAI, Cursor, etc.
- **No Anthropic API key and no extra API credits.** agenticscope runs entirely locally; it never calls a model itself. If you drive it through Claude Code on a Pro plan, that plan is all you need — the MCP tools run inside your normal session.

## Status & roadmap

This is an early draft (0.1.0). The standard and the MCP tool surface are stabilizing first; the CLI (`init` / `lint` / `build` / `pack`) and the reference MCP server follow. Feedback, forks, and competing designs are all welcome — the goal is a better way to feed agents context, not a walled garden.

---

*Built because I was tired of watching a context file I never read eat tokens I couldn't spare.*
