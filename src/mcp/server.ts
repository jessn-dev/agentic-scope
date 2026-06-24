#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { readFileSync } from "node:fs";
import { scanProjects, fragmentsByType } from "./workspace.js";
import { assertWithinWorkspace } from "./scope.js";
import { gitStatus } from "./git.js";
import { grepMemory } from "./grep.js";
import { loadManifest } from "../core/manifest.js";
import { pack, renderPack } from "../core/fragments.js";

const pkg = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { version: string };

/** Read a CLI flag value, e.g. --workspace <v>; returns undefined if absent. */
function flag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

/** Resolve the workspace root from --workspace, AGENTICSCOPE_WORKSPACE, or cwd. */
function resolveWorkspace(): string {
  const raw = flag("--workspace") ?? process.env.AGENTICSCOPE_WORKSPACE ?? process.cwd();
  return resolve(raw.replace(/^~(?=$|\/)/, homedir()));
}

const WORKSPACE = resolveWorkspace();

/** Resolve + scope-check a project arg against this server's workspace root. */
const withinWorkspace = (project: string) => assertWithinWorkspace(WORKSPACE, project);

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

/** Build a fully-configured agenticscope MCP server (no transport attached). */
export function createServer(): McpServer {
  const server = new McpServer({ name: "agenticscope", version: pkg.version });

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
      inputSchema: { project: z.string().describe("Project directory (within the workspace)") },
    },
    guard(async ({ project }) => {
      const abs = withinWorkspace(project);
      return json({ project: abs, subagents: fragmentsByType(abs, "persona") });
    }),
  );

  server.registerTool(
    "list_plans",
    {
      description: "List the plans/specs currently in flight for a project (.scope/specs fragments).",
      inputSchema: { project: z.string().describe("Project directory (within the workspace)") },
    },
    guard(async ({ project }) => {
      const abs = withinWorkspace(project);
      return json({ project: abs, plans: fragmentsByType(abs, "spec") });
    }),
  );

  server.registerTool(
    "git_status",
    {
      description:
        "Read-only git state for every project in the workspace (branch, ahead/behind, dirty count).",
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
        project: z.string().describe("Project directory (within the workspace)"),
        task: z.string().describe("Free-text task description, e.g. 'fix the sql migration'"),
        paths: z.array(z.string()).optional().describe("Concrete file paths the task touches"),
        budget: z.number().int().positive().optional().describe("Override the manifest token budget"),
      },
    },
    guard(async ({ project, task, paths, budget }) => {
      const abs = withinWorkspace(project);
      const loaded = loadManifest(abs);
      const result = pack(loaded, { text: task, paths }, { budget });
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

  return server;
}

/** Read and JSON-parse an HTTP request body. */
function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolveBody, rejectBody) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c as Buffer));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolveBody(undefined);
      try {
        resolveBody(JSON.parse(raw));
      } catch (err) {
        rejectBody(err);
      }
    });
    req.on("error", rejectBody);
  });
}

/**
 * Serve over Streamable HTTP (stateless: a fresh server + transport per
 * request). Suitable for remote/hosted use behind a reverse proxy.
 */
async function startHttp(port: number): Promise<void> {
  const httpServer = createHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.url !== "/mcp") {
      res.writeHead(404).end("not found");
      return;
    }
    try {
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      const server = createServer();
      res.on("close", () => {
        void transport.close();
        void server.close();
      });
      await server.connect(transport);
      const body = req.method === "POST" ? await readBody(req) : undefined;
      await transport.handleRequest(req, res, body);
    } catch (err) {
      if (!res.headersSent) res.writeHead(500);
      res.end(`agenticscope MCP error: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
  await new Promise<void>((ready) => httpServer.listen(port, ready));
  console.error(`agenticscope MCP server ready on http://localhost:${port}/mcp (workspace: ${WORKSPACE})`);
}

/** Serve over stdio (the default — what desktop MCP hosts launch). */
async function startStdio(): Promise<void> {
  const server = createServer();
  await server.connect(new StdioServerTransport());
  // stderr is safe; stdout is reserved for the MCP protocol stream.
  console.error(`agenticscope MCP server ready (workspace: ${WORKSPACE})`);
}

const httpFlag = process.argv.includes("--http");
if (httpFlag) {
  const port = Number(flag("--http") ?? process.env.PORT ?? 3000);
  await startHttp(Number.isFinite(port) ? port : 3000);
} else {
  await startStdio();
}
