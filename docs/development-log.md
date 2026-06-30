# NexusTerminal — Development Log

> Tracks every implementation phase: what was built, when, and why.

---

## Phase 3 — Database Engine
**Date:** 2026-06-30

### What Was Built
A full SQLite persistence layer using `better-sqlite3` with WAL mode.

| Deliverable | File |
|---|---|
| Core DB service | `electron/main/database/DatabaseService.ts` |
| Migration runner | `electron/main/database/migrations/index.ts` |
| Initial schema (6 tables) | `electron/main/database/migrations/001_initial_schema.ts` |
| Base repository | `electron/main/database/repositories/BaseRepository.ts` |
| 6 concrete repositories | `electron/main/database/repositories/` |
| Seed runner + data | `electron/main/database/seed/` |
| 33 database tests | `electron/main/database/__tests__/database.test.ts` |
| Vitest config | `vitest.config.ts` |

### Tables
- `workspaces` — terminal workspace sessions
- `sessions` — shell sessions per workspace
- `settings` — per-key user preferences
- `layouts` — saved pane arrangements
- `recent_projects` — quick-access project paths
- `app_state` — key/value store for ephemeral app state
- `schema_versions` — tracks applied migrations

### Key Decisions
- **WAL mode** — enables concurrent reads without blocking writes
- **Prepared statement cache** — avoids SQL recompilation on hot paths
- **`pool: 'forks'`** in vitest — required for native `.node` modules
- **`better-sqlite3` is synchronous** — no async/await in the DB layer; all callers are synchronous too
- **ABI dual-build problem** — Electron 31 uses Node ABI 125, system Node.js 22 uses ABI 127; `postinstall` rebuilds for Electron, `npm run rebuild:node` switches to system Node for tests

---

## Phase 4 — Workspace Management
**Date:** 2026-06-30

### What Was Built
Full workspace CRUD with IPC bridge, push events to renderer, and a renderer-side observable store.

| Layer | File |
|---|---|
| Shared types + DTO | `electron/shared/workspace.ts` |
| IPC channel constants | `electron/shared/ipc-channels.ts` (WORKSPACE namespace) |
| Migration 002 | `electron/main/database/migrations/002_workspace_last_opened.ts` |
| WorkspaceService (main) | `electron/main/services/WorkspaceService.ts` |
| IPC handlers | `electron/main/ipc/handlers/workspace.handlers.ts` |
| Preload bridge | `electron/preload/index.ts` (workspace namespace) |
| Renderer service (IPC client) | `src/features/workspaces/WorkspaceService.ts` |
| Renderer store (observable) | `src/features/workspaces/WorkspaceStore.ts` |
| 44 service tests | `electron/main/services/__tests__/WorkspaceService.test.ts` |

### Features
- Create, Delete, Rename, Open, Close, Restore
- Recent workspaces (ordered by `last_opened_at`)
- Search by name or description (SQL LIKE)
- Workspace validation with structured errors
- Push events: main → renderer via `workspace:push-changed` IPC
- `WorkspaceStore` is `useSyncExternalStore`-compatible

### Key Decisions
- **`WorkspaceChangeEvent` as discriminated union** — type-safe switch statements in `WorkspaceStore.applyChange()`
- **Synchronous service** — since `better-sqlite3` is sync, no async needed in the service layer
- **`SecureIpcRouter.on()` for fire-and-forget** — used for input channels where no reply is needed
- **77 total tests pass** (33 db + 44 workspace) when run with `npm run rebuild:node && npx vitest run`

---

## Phase 5 — Terminal Engine
**Date:** 2026-06-30

### What Was Built
A full terminal engine: PTY spawning in the main process with xterm.js rendering in the renderer.

| Layer | File |
|---|---|
| Shared types | `electron/shared/terminal.ts` |
| IPC channel constants | `electron/shared/ipc-channels.ts` (TERMINAL namespace) |
| PTY manager | `electron/main/terminal/PtyManager.ts` |
| Terminal session manager | `electron/main/terminal/TerminalManager.ts` |
| IPC handlers | `electron/main/ipc/handlers/terminal.handlers.ts` |
| Preload bridge | `electron/preload/index.ts` (terminal namespace) |
| Terminal UI component | `src/features/terminal/TerminalView.tsx` |
| App shell | `src/app/App.tsx` |

### Supported Shells
| Shell | Resolution |
|---|---|
| PowerShell | `pwsh.exe` (if installed) → `powershell.exe` |
| CMD | `cmd.exe` |
| Git Bash | `C:\Program Files\Git\bin\bash.exe` (path probe) |
| WSL | `wsl.exe` |

### Features
- **One PTY per terminal** — no shared PTYs; each terminal owns its own `node-pty` process
- **Resize** — `ResizeObserver` → `FitAddon.fit()` → `terminal:resize` IPC → `pty.resize()`
- **Scrollback** — 5 000 line buffer in xterm.js
- **ANSI 256-color** — `TERM=xterm-256color`, full color theme
- **Clipboard** — Ctrl+Shift+C copies selection; Ctrl+V pastes via `navigator.clipboard`
- **Mouse support** — forwarded to PTY automatically by xterm.js
- **Keyboard shortcuts** — custom key handler intercepts clipboard shortcuts; all other keys forwarded raw
- **Terminal events** — `terminal:push-data` (PTY output) and `terminal:push-exit` (process exit) pushed to renderer
- **Title changes** — xterm.js parses OSC sequences in-band; `term.onTitleChange` → `window.setTitle()`

### IPC Channels (5)
| Channel | Direction | Type |
|---|---|---|
| `terminal:create` | renderer → main | invoke (returns `TerminalDto`) |
| `terminal:kill` | renderer → main | invoke |
| `terminal:list` | renderer → main | invoke |
| `terminal:input` | renderer → main | fire-and-forget (every keystroke) |
| `terminal:resize` | renderer → main | fire-and-forget |
| `terminal:push-data` | main → renderer | push (PTY stdout) |
| `terminal:push-exit` | main → renderer | push (process exit code) |

### Key Decisions
- **`node-pty` uses N-API prebuilts** — `prebuilds/win32-x64/` directory; no Electron rebuild needed (unlike `better-sqlite3`)
- **`node-pty` marked external in Vite** — native `.node` files cannot be bundled by Rollup
- **Title handled in renderer** — `node-pty` has no title event; xterm.js parses OSC title sequences from the PTY data stream itself
- **`terminal:input` as `ipcMain.on`** — fire-and-forget avoids invoke round-trip overhead on every keystroke

### Verified
App log at startup:
```
IPC: 28 channels registered [..., "terminal:create", "terminal:kill", "terminal:list", "terminal:input", "terminal:resize"]
Terminal created {"id":"...","pid":13120,"shellType":"powershell","cols":80,"rows":24}
```
