# MCP Server

agenticscope ships with a fully integrated, read-only Model Context Protocol (MCP) server. This server grants compatible AI assistants (like Claude Desktop, Cursor, and Windsurf) dynamic, real-time awareness of your workspace.

## Available Tools

The server exposes several tools that the AI can invoke autonomously:

| Tool | Description |
| :--- | :--- |
| `list_projects` | Enumerates initialized agenticscope projects within the workspace. |
| `list_subagents` | Retrieves available personas (`.scope/personas`) for a project. |
| `list_plans` | Exposes active specs/plans in flight. |
| `git_status` | Reports the repository state (branch, ahead/behind commits, dirty tree status). |
| `grep_memory` | Executes a fast grep search across `.scope/memory/` decision records. |
| `pack_context` | Resolves a task description into a token-budgeted context payload. |

## Security & Constraints

By design, the MCP server is completely **read-only**. 

Furthermore, all `project` arguments are **scope-guarded** to the workspace root. The server enforces strict path validation to guarantee that directory traversal attacks (e.g., `../../secrets`) or absolute paths pointing outside the workspace are rejected instantly.

## Connecting the Server

To connect the server, configure your AI host to invoke `agenticscope-mcp`. For example, in Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "agenticscope": {
      "command": "npx",
      "args": ["-y", "agenticscope", "agenticscope-mcp", "--workspace", "~/Documents/projects"]
    }
  }
}
```

You can also use the CLI to generate host-specific, ready-to-paste configurations:

```bash
agenticscope mcp-config --host cursor --workspace ~/Documents/projects
```

## Remote Transport (HTTP)

While the server operates over standard I/O (stdio) by default, you can expose it as a shared service over HTTP for remote or hosted environments:

```bash
agenticscope-mcp --http 3000 --workspace ~/Documents/projects
```
