# Getting Started

This guide will walk you through installing agenticscope, scaffolding your first workspace, and packing context for an AI agent.

## Prerequisites

- **Node.js:** Ensure you have Node.js version 22 or higher installed.
- **An AI Assistant:** A compatible agent (e.g., Claude Code, Cursor, Gemini, or a raw CLI model).

## Installation

We recommend installing the CLI globally so both `agenticscope` and the `agenticscope-mcp` server are available across all your repositories.

```bash
npm install -g agenticscope
```

*(Alternatively, you can run commands ad-hoc using `npx agenticscope <command>`)*

## Initializing a Project

Navigate to your project's root directory and run the initialization command. This scaffolds the `agenticscope.toml` manifest and a `.scope/` directory populated with placeholder fragments.

```bash
cd my-project
agenticscope init
```

## Validating the Manifest

After customizing your fragments, ensure your manifest is syntactically correct, trigger paths are valid, and no fragment violates the token budget.

```bash
agenticscope lint
```

## Packing Context

The `pack` command resolves a specific task into a budgeted context block. It evaluates your task against the manifest triggers and keywords, printing only the context that matches.

```bash
agenticscope pack "fix the sql migration"
```

If you want exact token counts using the `cl100k_base` tokenizer, append the `--exact` flag.

## Compiling Vendor Files

To synchronize your `.scope/` tree into native configuration files (`CLAUDE.md`, `GEMINI.md`, `.cursorrules`, etc.), use the `build` command:

```bash
agenticscope build
```

For continuous integration pipelines, you can run `agenticscope build --check` to verify that generated files haven't drifted from their source.
