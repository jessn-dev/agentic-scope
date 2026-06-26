#!/usr/bin/env node
import { Command } from "commander";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadManifest, MANIFEST_FILENAME, isProject } from "./core/manifest.js";
import { pack, renderPack, oversizedFragments } from "./core/fragments.js";
import { build, checkBuild, VENDOR_TARGETS, resolveTargets } from "./core/vendor.js";
import { writeSchema, SCHEMA_PATH } from "./core/schema.js";

// Single source of truth for the version: package.json (kept in sync by semantic-release).
const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };

const program = new Command();
program
  .name("agenticscope")
  .description("Directory-as-context standard + token-budgeted context packer for AI agents.")
  .version(pkg.version);

// ---- init ------------------------------------------------------------------
program
  .command("init")
  .description("Scaffold an agenticscope.toml manifest and a .scope/ directory.")
  .argument("[dir]", "Target project directory", ".")
  .action((dir: string) => {
    const root = resolve(dir);
    if (isProject(root)) {
      console.error(`✗ ${MANIFEST_FILENAME} already exists in ${root}`);
      process.exit(1);
    }
    const scope = join(root, ".scope");
    for (const sub of ["rules", "knowledge", "specs", "personas", "memory"]) {
      mkdirSync(join(scope, sub), { recursive: true });
    }
    write(join(root, MANIFEST_FILENAME), STARTER_MANIFEST);
    write(join(scope, "rules", "coding.md"), STARTER_RULE);
    write(join(scope, "knowledge", "schema.sql"), STARTER_KNOWLEDGE);
    write(join(scope, "personas", "qa.md"), STARTER_PERSONA);
    write(join(scope, "memory", "decisions.md"), STARTER_MEMORY);
    console.log(`✓ Scaffolded agenticscope project in ${root}`);
    console.log("  Next: edit agenticscope.toml, then `agenticscope lint`.");
  });

// ---- lint ------------------------------------------------------------------
program
  .command("lint")
  .description("Validate the manifest and check that every fragment path exists.")
  .argument("[dir]", "Project directory", ".")
  .action((dir: string) => {
    const root = resolve(dir);
    let loaded;
    try {
      loaded = loadManifest(root);
    } catch (err) {
      console.error(`✗ ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
    const problems: string[] = [];
    const ids = new Set<string>();
    for (const f of loaded.manifest.fragment) {
      if (ids.has(f.id)) problems.push(`duplicate fragment id: ${f.id}`);
      ids.add(f.id);
      if (!existsSync(join(loaded.root, f.path))) {
        problems.push(`${f.id}: path not found → ${f.path}`);
      }
      if (f.triggers.length === 0 && f.keywords.length === 0 && !f.always) {
        problems.push(`${f.id}: no triggers/keywords and not 'always' → will never be packed`);
      }
    }
    // Warn (don't fail) about fragments that alone exceed the budget.
    for (const o of oversizedFragments(loaded)) {
      console.warn(`⚠ ${o.id}: ${o.tokens} tok exceeds budget ${o.budget} → can never be packed`);
    }
    if (problems.length === 0) {
      console.log(`✓ Valid. ${loaded.manifest.fragment.length} fragment(s), budget ${loaded.manifest.scope.budget} tok.`);
    } else {
      console.error(`✗ ${problems.length} problem(s):`);
      for (const p of problems) console.error(`  - ${p}`);
      process.exit(1);
    }
  });

// ---- build -----------------------------------------------------------------
program
  .command("build")
  .description("Compile .scope/ into vendor files (CLAUDE.md, GEMINI.md, AGENTS.md, .cursorrules).")
  .argument("[dir]", "Project directory", ".")
  .option(
    "-t, --target <name...>",
    `Only build these vendors (${VENDOR_TARGETS.map((t) => t.name).join(", ")})`,
  )
  .option("--check", "Verify vendor files are up to date with .scope/ (no writes); exit 1 if stale/missing")
  .action((dir: string, opts: { target?: string[]; check?: boolean }) => {
    const loaded = loadManifest(resolve(dir));
    let targets;
    try {
      targets = resolveTargets(opts.target);
    } catch (err) {
      console.error(`✗ ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
    if (opts.check) {
      const results = checkBuild(loaded, targets);
      for (const r of results) {
        console.log(`  ${r.status === "ok" ? "✓" : "✗"} ${r.file}  (${r.status})`);
      }
      const drift = results.filter((r) => r.status !== "ok");
      if (drift.length > 0) {
        console.error(`✗ ${drift.length} vendor file(s) out of date — run \`agenticscope build\` and commit.`);
        process.exit(1);
      }
      console.log("✓ Vendor files are up to date.");
      return;
    }
    const { written } = build(loaded, targets);
    console.log(`✓ Built ${written.length} vendor file(s):`);
    for (const f of written) {
      const label = VENDOR_TARGETS.find((t) => t.file === f)?.label ?? "";
      console.log(`  - ${f}  (${label})`);
    }
  });

// ---- pack ------------------------------------------------------------------
program
  .command("pack")
  .description("Resolve a task into a budgeted context block and print it.")
  .argument("<task...>", "Task description")
  .option("-d, --dir <dir>", "Project directory", ".")
  .option("-p, --path <path...>", "Concrete file paths the task touches")
  .option("-b, --budget <n>", "Override the manifest token budget", (v) => parseInt(v, 10))
  .option("--exact", "Use the exact tokenizer (gpt-tokenizer) instead of the chars/4 estimate")
  .option("--raw", "Print only the packed context (no report)")
  .action(
    (
      taskWords: string[],
      opts: { dir: string; path?: string[]; budget?: number; exact?: boolean; raw?: boolean },
    ) => {
      const loaded = loadManifest(resolve(opts.dir));
      const text = taskWords.join(" ");
      const result = pack(loaded, { text, paths: opts.path }, { budget: opts.budget, exact: opts.exact });
      if (opts.raw) {
        console.log(renderPack(result));
        return;
      }
      const tk = opts.exact ? "exact" : "est";
      console.log(
        `► "${text}" — matched ${result.included.length} fragment(s) (budget ${result.budget}, used ${result.used} ${tk})`,
      );
      for (const r of result.included) {
        console.log(`  [${r.fragment.type}] ${r.fragment.id.padEnd(20)} ${String(r.tokens).padStart(5)} tok`);
      }
      for (const s of result.skipped) console.log(`  — skipped ${s.id} (${s.reason})`);
      console.log("\n" + renderPack(result));
    },
  );

// ---- schema ----------------------------------------------------------------
program
  .command("schema")
  .description("Generate the JSON Schema for agenticscope.toml (editor autocomplete/validation).")
  .argument("[dir]", "Project directory", ".")
  .option("-o, --out <file>", "Output path", SCHEMA_PATH)
  .action((dir: string, opts: { out: string }) => {
    const out = resolve(dir, opts.out);
    writeSchema(out);
    console.log(`✓ Wrote manifest JSON Schema → ${opts.out}`);
    console.log("  Point your TOML editor at it (e.g. Even Better TOML) for autocomplete.");
  });

// ---- mcp-config ------------------------------------------------------------
program
  .command("mcp-config")
  .description("Print ready-to-paste MCP server config for a host (Claude Desktop, Cursor, generic).")
  .option("-w, --workspace <dir>", "Workspace root the server should scan", ".")
  .option("--host <host>", "claude | cursor | generic", "claude")
  .action((opts: { workspace: string; host: string }) => {
    const workspace = resolve(opts.workspace);
    const serverEntry = {
      command: "agenticscope-mcp",
      args: ["--workspace", workspace],
    };
    const host = opts.host.toLowerCase();
    // Claude Desktop and Cursor both nest under "mcpServers"; generic is the same
    // shape, shown bare so it can be adapted to any host.
    const config =
      host === "generic"
        ? { agenticscope: serverEntry }
        : { mcpServers: { agenticscope: serverEntry } };
    const where =
      host === "claude"
        ? "→ claude_desktop_config.json"
        : host === "cursor"
          ? "→ .cursor/mcp.json (or Cursor Settings → MCP)"
          : "";
    if (where) console.log(`# ${where}`);
    console.log(JSON.stringify(config, null, 2));
  });

// ---- starter templates -----------------------------------------------------
function write(path: string, content: string) {
  if (existsSync(path)) return;
  writeFileSync(path, content, "utf8");
}

const STARTER_MANIFEST = `[scope]
version    = "0.1.0"
name       = "my-project"
budget     = 4000        # hard cap (estimated tokens) per context pack
precedence = "type"      # "type" (rules first) or "priority"

# triggers = glob patterns matched against file paths
# keywords = plain words matched against the task text

[[fragment]]
id       = "coding-rules"
type     = "rule"
path     = ".scope/rules/coding.md"
triggers = ["**/*.ts", "**/*.tsx", "**/*.js"]
keywords = ["refactor", "lint"]
priority = 100

[[fragment]]
id       = "db-schema"
type     = "knowledge"
path     = ".scope/knowledge/schema.sql"
triggers = ["**/*.sql", "db/**"]
keywords = ["migration", "schema", "database"]
priority = 20

[[fragment]]
id       = "qa-persona"
type     = "persona"
path     = ".scope/personas/qa.md"
keywords = ["test", "qa", "review"]
priority = 50
`;

const STARTER_RULE = `# Coding standards

- No \`any\` types.
- Prefer composition over inheritance.
- Keep functions small and pure where possible.
`;

const STARTER_KNOWLEDGE = `CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

const STARTER_PERSONA = `# QA Engineer

**Role:** Detail-oriented QA engineer. Break the code, find edge cases.
**Always ask:** "What happens if this input is null?"
`;

const STARTER_MEMORY = `# Architecture decision records

## 001. Example decision
Status: Accepted

Record *why* a choice was made so future agents stay consistent.
`;

program.parseAsync();
