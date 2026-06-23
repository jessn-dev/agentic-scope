#!/usr/bin/env node
import { Command } from "commander";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadManifest, MANIFEST_FILENAME, isProject } from "./core/manifest.js";
import { pack, renderPack } from "./core/fragments.js";
import { build, VENDOR_TARGETS } from "./core/vendor.js";

const program = new Command();
program
  .name("agenticscope")
  .description("Directory-as-context standard + token-budgeted context packer for AI agents.")
  .version("0.1.0");

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
      if (f.triggers.length === 0 && !f.always) {
        problems.push(`${f.id}: no triggers and not 'always' → will never be packed`);
      }
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
  .action((dir: string) => {
    const loaded = loadManifest(resolve(dir));
    const { written } = build(loaded);
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
  .option("--raw", "Print only the packed context (no report)")
  .action((taskWords: string[], opts: { dir: string; path?: string[]; raw?: boolean }) => {
    const loaded = loadManifest(resolve(opts.dir));
    const text = taskWords.join(" ");
    const result = pack(loaded, { text, paths: opts.path });
    if (opts.raw) {
      console.log(renderPack(result));
      return;
    }
    console.log(`► "${text}" — matched ${result.included.length} fragment(s) (budget ${result.budget}, used ${result.used})`);
    for (const r of result.included) {
      console.log(`  [${r.fragment.type}] ${r.fragment.id.padEnd(20)} ${String(r.tokens).padStart(5)} tok`);
    }
    for (const s of result.skipped) console.log(`  — skipped ${s.id} (${s.reason})`);
    console.log("\n" + renderPack(result));
  });

program.parseAsync();

// ---- starter templates -----------------------------------------------------
function write(path: string, content: string) {
  if (existsSync(path)) return;
  writeFileSync(path, content, "utf8");
}

const STARTER_MANIFEST = `[scope]
version = "0.1.0"
name    = "my-project"
budget  = 4000   # hard cap (estimated tokens) per context pack

[[fragment]]
id       = "coding-rules"
type     = "rule"
path     = ".scope/rules/coding.md"
triggers = ["**/*.ts", "**/*.tsx", "**/*.js"]
priority = 100

[[fragment]]
id       = "db-schema"
type     = "knowledge"
path     = ".scope/knowledge/schema.sql"
triggers = ["**/*.sql", "db/**", "migration"]
priority = 20

[[fragment]]
id       = "qa-persona"
type     = "persona"
path     = ".scope/personas/qa.md"
triggers = ["test", "qa", "review"]
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
