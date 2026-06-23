#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { scanProjects, fragmentsByType } from "./workspace.js";
import { gitStatus } from "./git.js";
import { grepMemory } from "./grep.js";
import { loadManifest } from "../core/manifest.js";
import { pack, renderPack } from "../core/fragments.js";

/** Resolve the workspace root from --workspace, AGENTICSCOPE_WORKSPACE, or cwd. */
function resolveWorkspace(): string {
  const flagIdx = process.argv.indexOf("--workspace");
  const fromFlag = flagIdx !== -1 ? process.argv[flagIdx + 1] : undefined;
  const raw = fromFlag ?? process.env.AGENTICSCOPE_WORKSPACE ?? process.cwd();
  return resolve(raw.replace(/^~(?=$|\/)/, homedir()));
}

const WORKSPACE = resolveWorkspace();

const json = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
});

const fail = (err: unknown) => ({
  isError: true,
  content: [
    {
      type: "text" as const,
      text: `agenticscope error: ${err instanceof Error ? err.message : String(err)}`,
    },
  ],
});

/** Wrap a tool handler so thrown errors return a clean isError result, not a crash. */
function guard<A>(fn: (args: A) => Promise<ReturnType<typeof json>>) {
  return async (args: A) => {
    try {
      return await fn(args);
    } catch (err) {
      return fail(err);
    }
  };
}

const server = new McpServer({ name: "agenticscope", version: "0.1.0" });

server.registerTool(
  "list_projects",
  {
    description:
      "List every agenticscope project in the workspace, with fragment counts and git presence.",
    inputSchema: {},
  },
  guard(async () => json({ workspace: WORKSPACE, projects: scanProjects(WORKSPACE) })),
);

server.registerTool(
  "list_subagents",
  {
    description:
      "List the personas/subagents defined for a project (its .scope/personas fragments).",
    inputSchema: { project: z.string().describe("Absolute path to the project directory") },
  },
  guard(async ({ project }) => json({ project, subagents: fragmentsByType(project, "persona") })),
);

server.registerTool(
  "list_plans",
  {
    description: "List the plans/specs currently in flight for a project (.scope/specs fragments).",
    inputSchema: { project: z.string().describe("Absolute path to the project directory") },
  },
  guard(async ({ project }) => json({ project, plans: fragmentsByType(project, "spec") })),
);

server.registerTool(
  "git_status",
  {
    description: "Read-only git state for every project in the workspace (branch, ahead/behind, dirty count).",
    inputSchema: {},
  },
  guard(async () => {
    const projects = scanProjects(WORKSPACE);
    const results = await Promise.all(
      projects.map(async (p) => ({ name: p.name, path: p.path, git: await gitStatus(p.path) })),
    );
    return json({ workspace: WORKSPACE, repos: results });
  }),
);

server.registerTool(
  "grep_memory",
  {
    description: "Fast grep over .scope/memory/ files across all workspace projects.",
    inputSchema: {
      pattern: z.string().describe("Regex or literal string to search for"),
      ignoreCase: z.boolean().optional().describe("Case-insensitive (default true)"),
    },
  },
  guard(async ({ pattern, ignoreCase }) => {
    const projects = scanProjects(WORKSPACE);
    const hits = grepMemory(projects, pattern, { ignoreCase: ignoreCase ?? true });
    return json({ pattern, hitCount: hits.length, hits });
  }),
);

server.registerTool(
  "pack_context",
  {
    description:
      "Resolve a task into a token-budgeted set of context fragments for a project. Returns the packed context and what was skipped and why.",
    inputSchema: {
      project: z.string().describe("Absolute path to the project directory"),
      task: z.string().describe("Free-text task description, e.g. 'fix the sql migration'"),
      paths: z.array(z.string()).optional().describe("Concrete file paths the task touches"),
    },
  },
  guard(async ({ project, task, paths }) => {
    const loaded = loadManifest(project);
    const result = pack(loaded, { text: task, paths });
    return json({
      budget: result.budget,
      used: result.used,
      included: result.included.map((r) => ({
        id: r.fragment.id,
        type: r.fragment.type,
        tokens: r.tokens,
        matchedTriggers: r.matchedTriggers,
      })),
      skipped: result.skipped,
      context: renderPack(result),
    });
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);
// stderr is safe; stdout is reserved for the MCP protocol stream.
console.error(`agenticscope MCP server ready (workspace: ${WORKSPACE})`);
