# Introduction to agenticscope

**agenticscope** is a directory-as-context standard coupled with an integrated Model Context Protocol (MCP) server. It equips AI coding agents with deep, structured awareness of your workspace without needlessly exhausting your context window.

## The Context Problem

Currently, developers feed AI agents context via monolithic files (e.g., `.cursorrules`, `CLAUDE.md`, `GEMINI.md`, or `AGENTS.md`). As projects scale, these files bloat, combining immutable coding standards, database schemas, architectural decisions, and temporary task notes into a single, unwieldy document.

This creates significant friction:
- **Token Exhaustion:** The agent re-reads irrelevant data (like SQL schemas when modifying CSS) on every inference cycle.
- **Priority Dilution:** Strict behavioral constraints ("never use `any`") are drowned out by sprawling reference materials.
- **Vendor Fragmentation:** Disparate platforms require their own dedicated context files (e.g., `.claude/`, `.gemini/`), which inevitably drift out of sync.

## The agenticscope Solution

agenticscope resolves these challenges through a targeted, indexed approach:

1. **Typed Fragments:** Context is modularized into distinct, typed fragments (`rules`, `knowledge`, `specs`, `personas`, `memory`).
2. **Smart Triggers:** Fragments only load when their associated glob paths or keywords match the current task.
3. **Strict Budgeting:** Context is constrained by a strict token budget, dropping lower-priority fragments gracefully.
4. **Universal Compilation:** A single `.scope/` directory is compiled natively for multiple vendors instantly (outputting `.cursorrules`, `CLAUDE.md`, `GEMINI.md`, and `AGENTS.md`).
5. **Live MCP Integration:** Advanced clients like **Windsurf**, **Zed**, and **Cursor** can bypass static files entirely. The accompanying MCP server exposes your environment dynamically, letting the agent query active plans, git state, and subagents on demand.

Next, head over to [Getting Started](./getting-started.md) to install the CLI and scaffold your first project.
