---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "agenticscope"
  text: "Directory-as-context for AI"
  tagline: A unified standard and read-only MCP server that grants your AI agents structured, token-efficient awareness of your workspace.
  actions:
    - theme: brand
      text: Read the Docs
      link: /guide/
    - theme: alt
      text: View on GitHub
      link: https://github.com/jessn-dev/agentic-scope

features:
  - title: Predictable Context
    details: A lightweight manifest dictates exactly what context loads. Fragments are strictly typed and prioritized under a defined token budget.
  - title: Live Workspace Awareness
    details: The integrated, read-only MCP server gives any capable AI real-time, structured access to git status, open plans, and active subagents.
  - title: Universal Vendor Support
    details: Compile a single `.scope/` context tree into native, optimized constraint files (`.cursorrules`, `CLAUDE.md`, `GEMINI.md`, `AGENTS.md`) or bypass files entirely using the MCP server for advanced clients like Windsurf and Zed.
---

<div class="vp-doc">
<br>

## Why agenticscope?

Modern AI coding assistants require profound context to be effective. However, dumping your entire architecture into monolithic files—whether it's `.cursorrules`, `CLAUDE.md`, `GEMINI.md`, or `AGENTS.md`—wastes tokens, introduces crippling noise, and causes the model to prioritize background reference data over strict behavioral rules.

**agenticscope** reimagines project context by indexing it. Your AI queries a structured, budgeted manifest of rules, personas, and database schemas—reading only what is highly relevant to the immediate task. Advanced MCP-capable clients (like **Windsurf**, **Zed**, and **Claude Desktop**) don't even need to read static files at all; they dynamically query the `agenticscope-mcp` server exactly when they need to.

</div>
