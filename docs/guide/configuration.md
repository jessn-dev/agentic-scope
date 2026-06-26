# Configuration & Manifest

The `agenticscope.toml` file is the heart of your project's context. It acts as an index, dictating exactly which fragments load under specific conditions.

## The Scope Definition

At the top of the manifest, the `[scope]` block defines global constraints.

```toml
[scope]
version    = "0.1.0"
name       = "my-project"
budget     = 4000     # Hard cap (estimated tokens) per context pack
precedence = "type"   # Ordering strategy: "type" or "priority"
```

## Fragment Types

Every fragment within `.scope/` must be assigned a type. Types carry intrinsic semantic precedence:

1. **`rule`:** Behavioral guidance and absolute directives (Highest priority).
2. **`spec`:** Active, current task requirements.
3. **`persona`:** Swappable behavioral hats for the agent.
4. **`memory`:** Historical architectural decisions, project logs, and state.
5. **`knowledge`:** Static reference data (Lowest priority, loaded lazily).

## Defining Fragments

Fragments are defined in the manifest using `[[fragment]]` blocks. They are matched against tasks using two distinct mechanisms:

- **`triggers`:** Glob patterns matched strictly against concrete file paths.
- **`keywords`:** Plain text matched (case-insensitive substring) against the natural language task description.

```toml
[[fragment]]
id       = "db-schema"
type     = "knowledge"
path     = ".scope/knowledge/schema.sql"
triggers = ["**/*.sql", "db/**"]                 # Activates if an SQL file is touched
keywords = ["migration", "schema", "database"] # Activates if these words are mentioned
priority = 20
```

Keeping triggers and keywords deliberately separate prevents aggressive glob patterns (like `**/*.ts`) from falsely matching against unrelated task text.
