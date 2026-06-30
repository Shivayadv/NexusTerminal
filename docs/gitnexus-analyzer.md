# GitNexus Analyzer

## What It Is

GitNexus is a static-analysis tool that builds a structural graph of the entire codebase and stores it in `.gitnexus/`. When an AI assistant (Claude Code, GitHub Copilot, etc.) opens this repo, it reads that graph to understand architecture, dependencies, and data-flow *without* having to read every file from scratch.

Think of it as a compiled index of the codebase — the same way a database index lets a query skip a full-table scan, the gitnexus graph lets an AI skip reading hundreds of files to answer "what calls what" or "where is X used".

---

## What It Produces

After running `gitnexus analyze`, the `.gitnexus/` folder contains:

| Artifact | Purpose |
|---|---|
| `lbug` | LadybugDB binary — the graph database holding nodes, edges, clusters, and flows |
| `meta.json` | Snapshot: file count, last commit, node/edge/cluster stats, per-file hashes |
| `run.cjs` | Self-contained runner — resolves `gitnexus` → `pnpm dlx` → `npx` at call time |
| `parse-cache/` | AST parse cache — speeds up incremental re-analysis |
| `parsedfile-cache/` | Parsed file chunks — avoids re-parsing unchanged files |
| `.gitignore` | Keeps `lbug`, caches, and `run.cjs` out of version control |

### Current Stats (as of last analyze)

| Metric | Value |
|---|---|
| Files indexed | 58 |
| Nodes | 488 |
| Edges | 1,344 |
| Clusters | 20 |
| Flows | 38 |

---

## What Gets Indexed

GitNexus parses every TypeScript / JavaScript source file and extracts:

- **Nodes** — functions, classes, interfaces, constants, re-exports
- **Edges** — imports, calls, extends/implements, type references
- **Clusters** — logical groups (e.g. "database layer", "IPC handlers", "repositories")
- **Flows** — end-to-end data paths traced through the call graph (e.g. IPC channel → handler → service → repository → SQLite)

Files excluded from indexing: `node_modules/`, `dist/`, `dist-electron/`, test snapshots, and anything in `.gitnexus/` itself.

---

## How to Re-run the Analyzer

Run after adding new files, renaming modules, or changing significant imports so the graph stays current:

```bash
# If gitnexus is installed globally (fastest)
gitnexus analyze

# Via node (uses the committed runner — resolves global → pnpm dlx → npx)
node .gitnexus/run.cjs analyze

# One-off via pnpm (pnpm >= 10.2)
pnpm --allow-build=@ladybugdb/core --allow-build=gitnexus --allow-build=tree-sitter dlx gitnexus@latest analyze
```

The analyzer runs **incrementally** — only changed or newly added files are re-parsed. A full cold run on this repo takes ~35 s; incremental re-runs are typically under 5 s.

---

## How AI Assistants Use It

When Claude Code opens this repo, it reads `.gitnexus/meta.json` and the `lbug` graph to:

1. **Answer architecture questions** without reading every file ("what services does `bootstrap.ts` wire up?")
2. **Find usage sites** across the codebase ("where is `DatabaseService` injected?")
3. **Trace data flows** from the UI layer to the database and back
4. **Identify clusters** — logical subsystems it can reason about as a unit

This is why responses are faster and more accurate on this repo than on an unindexed one: the AI starts with a compiled map of the code rather than exploring it blind.

---

## When to Re-run

| Event | Re-run needed? |
|---|---|
| Added a new file | Yes |
| Renamed a file or moved a module | Yes |
| Added/changed significant imports or exports | Yes |
| Only changed function bodies (no signature change) | Usually no — incremental handles it |
| After `npm install` adds new packages | No — `node_modules` is not indexed |
| After a fresh `git clone` | Yes — `.gitnexus/lbug` is gitignored |

The `postinstall` hook does **not** re-run gitnexus automatically (it only rebuilds `better-sqlite3`). Run `gitnexus analyze` manually after significant structural changes, or add it to a pre-commit hook if preferred.

---

## Global Install (Recommended)

```bash
npm install -g gitnexus
# or
pnpm add -g gitnexus
```

A global install means `gitnexus analyze` resolves in milliseconds (no dlx download). Without it the runner falls back to `pnpm dlx` or `npx`, which downloads the package on each invocation.
