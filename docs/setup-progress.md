# Setup Progress — NexusTerminal

> Tracks every configuration and scaffolding decision made during environment bootstrap.

---

## Status Legend

| Symbol | Meaning       |
| ------ | ------------- |
| ✅     | Done          |
| 🔧     | Partial / WIP |
| ❌     | Not started   |

---

## 1. Project Initialization

| Task                                    | Status | Notes                                                         |
| --------------------------------------- | ------ | ------------------------------------------------------------- |
| `package.json` with all scripts         | ✅     | `dev`, `build`, `lint`, `format`, `typecheck`, `prepare`      |
| `node_modules` installed                | ❌     | Run `npm install` after cloning                               |

---

## 2. Build Tooling

| Task                     | Status | Notes                                                                          |
| ------------------------ | ------ | ------------------------------------------------------------------------------ |
| Vite 5 configured        | ✅     | `vite.config.ts` — dual entry (renderer + electron)                            |
| vite-plugin-electron     | ✅     | Compiles main + preload on file change; restarts Electron via `onstart`        |
| vite-plugin-electron-renderer | ✅ | Polyfills Electron APIs in the renderer context                               |
| Hot reload (renderer)    | ✅     | Vite HMR on port 5173                                                          |
| Hot reload (main/preload)| ✅     | vite-plugin-electron rebuilds and restarts on change                           |
| Dev mode                 | ✅     | `VITE_DEV_SERVER_URL` env var detected in main process; DevTools auto-opens    |
| Production mode          | ✅     | `vite build` outputs `dist/` + `dist-electron/`; loaded via `loadFile`         |

---

## 3. Electron

| Task                             | Status | Notes                                                                |
| -------------------------------- | ------ | -------------------------------------------------------------------- |
| Main process (`electron/main/`)  | ✅     | `BrowserWindow`, IPC handler registration, external link guard       |
| Preload script (`electron/preload/`) | ✅ | `contextBridge.exposeInMainWorld('electron', ...)` with typed API    |
| Context Isolation                | ✅     | `contextIsolation: true`                                             |
| Node Integration disabled        | ✅     | `nodeIntegration: false`                                             |
| Renderer sandbox                 | ✅     | `sandbox: true`                                                      |
| IPC channel allowlist            | ✅     | Only `AppChannel` union type passes through preload `invoke`/`on`    |
| `electron-builder` configured    | ✅     | Win (NSIS + zip), Mac (dmg + zip), Linux (AppImage + deb)            |
| Custom titlebar                  | ✅     | `titleBarStyle: 'hidden'` + `titleBarOverlay` for native controls    |

---

## 4. TypeScript

| Task                       | Status | Notes                                                         |
| -------------------------- | ------ | ------------------------------------------------------------- |
| `tsconfig.json`            | ✅     | Target ES2022, `moduleResolution: bundler`                    |
| Strict mode                | ✅     | `strict`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `exactOptionalPropertyTypes` |
| Path aliases (tsconfig)    | ✅     | `@/`, `@app/`, `@components/`, `@features/`, `@shared/`, `@core/`, `@assets/`, `@electron/` |
| Path aliases (Vite)        | ✅     | Matching aliases in `vite.config.ts` → `resolve.alias`        |
| `tsconfig.node.json`       | ✅     | Covers `vite.config.ts` compilation                           |
| `vite-env.d.ts`            | ✅     | `ImportMetaEnv` declaration                                   |
| `env.d.ts` (preload)       | ✅     | `Window.electron` global type declaration                     |

---

## 5. Code Quality

| Task                        | Status | Notes                                                                |
| --------------------------- | ------ | -------------------------------------------------------------------- |
| ESLint 8 configured         | ✅     | `.eslintrc.cjs` with `@typescript-eslint/recommended-type-checked`   |
| React + React Hooks plugins | ✅     | `plugin:react/recommended`, `plugin:react-hooks/recommended`         |
| Import ordering rule        | ✅     | `import/order` enforces group order + alphabetize                    |
| Prettier 3 configured       | ✅     | `.prettierrc` — single quotes, no semi, 100 cols, LF                 |
| ESLint + Prettier integrated| ✅     | `eslint-config-prettier` disables conflicting rules                  |
| `.editorconfig`             | ✅     | UTF-8, LF, 2-space indent                                            |

---

## 6. Git Hooks

| Task                    | Status | Notes                                              |
| ----------------------- | ------ | -------------------------------------------------- |
| Husky 9 configured      | ✅     | `prepare` script runs `husky` on `npm install`     |
| `.husky/pre-commit`     | ✅     | Runs `lint-staged`                                 |
| `.husky/commit-msg`     | ✅     | Runs `commitlint` (conventional commits)           |
| lint-staged configured  | ✅     | In `package.json` — ESLint + Prettier on staged TS/TSX; Prettier on JSON/CSS/MD |

---

## 7. Enterprise Folder Structure

```
src/
├── app/            ✅  Root App component, global providers
├── components/
│   ├── ui/         ✅  (empty — ready for Button, Input, etc.)
│   └── terminal/   ✅  (empty — ready for TerminalPane, etc.)
├── features/
│   ├── terminal/   ✅  (empty — Terminal feature slice)
│   ├── sessions/   ✅  (empty — Session management slice)
│   └── settings/   ✅  (empty — Settings slice)
├── core/
│   ├── di/         ✅  Container + TOKENS registry
│   ├── events/     ✅  Typed EventBus
│   └── config/     ✅  AppConfig interface + factory
├── shared/
│   ├── types/      ✅  Brand types, utility generics
│   ├── errors/     ✅  AppError + ErrorCode
│   ├── utils/      ✅  generateId, entries, assertNever
│   └── constants/  ✅  (empty — ready for app-wide constants)
└── assets/
    └── styles/     ✅  global.css with CSS design tokens
```

---

## 8. Dependency Injection Foundation

| Task                          | Status | Notes                                                               |
| ----------------------------- | ------ | ------------------------------------------------------------------- |
| `Container` class             | ✅     | `register` / `resolve` / `has` / `reset` — zero dependencies       |
| Singleton support             | ✅     | `singleton: true` (default) caches instance after first resolution  |
| Transient support             | ✅     | `singleton: false` calls factory fresh each time                    |
| `TOKENS` registry             | ✅     | `Symbol.for()` keys for EventBus, ConfigService, TerminalService…   |
| `EventBus<Events>`            | ✅     | Generic typed event bus with `on` / `off` / `emit` / `once`        |

---

## 9. Documentation

| Task           | Status | Notes                         |
| -------------- | ------ | ----------------------------- |
| `README.md`    | ✅     | Scripts, arch diagram, security model, alias table, tech stack |
| `docs/setup-progress.md` | ✅ | This file                 |

---

---

## 10. Electron Backend Architecture

> Completed in phase 2. All services verified running via `npm run dev` output.

### Shared Types (`electron/shared/`)

| File                  | Status | Notes                                                        |
| --------------------- | ------ | ------------------------------------------------------------ |
| `ipc-channels.ts`     | ✅     | `IPC` const tree + `IpcChannel` union — single source of truth for all channel strings |
| `config-schema.ts`    | ✅     | `AppConfigSchema` + `DEFAULT_CONFIG` + `WindowState` — shared between main and preload |

### Core (`electron/main/core/`)

| File                               | Status | Notes                                                      |
| ---------------------------------- | ------ | ---------------------------------------------------------- |
| `logger/Logger.ts`                 | ✅     | Structured logger: console (colorized) + file (appendFileSync). Queues pre-init entries. Static `initFileLogging` / `setMinLevel` |
| `di/container.ts` + `tokens.ts`    | ✅     | `MainContainer` class (register/resolve/singleton/transient) + `MAIN_TOKENS` Symbol registry |
| `events/MainEventBus.ts`           | ✅     | Typed `MainEvents` map covering app lifecycle, window events, config, errors, crash recovery |

### Services (`electron/main/services/`)

| File                        | Status | Notes                                                        |
| --------------------------- | ------ | ------------------------------------------------------------ |
| `EnvironmentManager.ts`     | ✅     | isDev/isProd/devServerUrl, typed paths (preload, renderer, userData, logs), trusted origins for IPC validation |
| `ConfigService.ts`          | ✅     | JSON persistence to `userData/config.json`; deep-merge on load; `set`/`patch`/`reset`; emits `config:changed` events |
| `WindowManager.ts`          | ✅     | `createMainWindow` with saved bounds restore; window state persistence on close; push `window:push-maximized/unmaximized` to renderer; tracks windows by id |
| `AppLifecycleManager.ts`    | ✅     | Single orchestration point for `app.on()` hooks; calls `crashRecovery.register()`, `ipcManager.registerAll()`, `windowManager.createMainWindow()` |

### IPC (`electron/main/ipc/`)

| File                          | Status | Notes                                                        |
| ----------------------------- | ------ | ------------------------------------------------------------ |
| `SecureIpcRouter.ts`          | ✅     | Wraps `ipcMain.handle/on`; validates sender origin (dev: localhost, prod: file://); allowlist prevents duplicate registration; error isolation per handler |
| `handlers/app.handlers.ts`    | ✅     | `app:get-version`, `app:get-platform`, `app:get-environment` |
| `handlers/window.handlers.ts` | ✅     | `window:minimize/maximize/unmaximize/close/is-maximized/set-title` |
| `handlers/config.handlers.ts` | ✅     | `config:get/set/reset` with key validation                   |
| `handlers/log.handlers.ts`    | ✅     | `log:write` — forwards renderer log entries to main Logger with level/context validation |
| `IpcManager.ts`               | ✅     | Composes all handler modules; logs registered channel count on startup (13 channels) |

### Errors (`electron/main/errors/`)

| File                  | Status | Notes                                                        |
| --------------------- | ------ | ------------------------------------------------------------ |
| `ErrorHandler.ts`     | ✅     | `process.on('uncaughtException')` + `process.on('unhandledRejection')`; emits to EventBus; in prod shows native dialog + exits |
| `CrashRecovery.ts`    | ✅     | Tracks crashes per window with timestamps; max 3 in 60s; exponential backoff (1s → 2s → 4s → 8s cap); native dialog on unrecoverable |

### Entry + Bootstrap

| File             | Status | Notes                                                        |
| ---------------- | ------ | ------------------------------------------------------------ |
| `bootstrap.ts`   | ✅     | Composition root — registers all 10 services in dependency order; pushes `config:changed` events to renderer windows |
| `index.ts`       | ✅     | Single-instance lock; pre-boot error sink; second-instance focus handler; calls `bootstrap()` inside `app.whenReady()` |

### Preload Bridge (`electron/preload/`)

| File        | Status | Notes                                                        |
| ----------- | ------ | ------------------------------------------------------------ |
| `index.ts`  | ✅     | Exposes `window.electron.{app, window, config, log}` via `contextBridge`; uses `IPC` constants; push subscriptions return unsubscribe functions |
| `env.d.ts`  | ✅     | `Window.electron: ElectronAPI` type augmentation             |

### Verified Runtime Output (2026-06-30)
```
✓ 20 modules transformed → dist-electron/main/index.js (30.47 kB)
✓ 2 modules transformed  → dist-electron/preload/index.js (2.27 kB)
INFO  [App:ErrorHandler]   Global error handlers registered
INFO  [App:ConfigService]  Config loaded
INFO  [App:IpcManager]     13 channels registered
INFO  [App:WindowManager]  Window created [main] id=1
INFO  [App:Lifecycle]      Application ready
INFO  [App]                NexusTerminal v0.1.0 started {env: development, platform: win32}
```

---

## Next Steps (not yet implemented)

- [ ] Terminal emulator core (xterm.js integration)
- [ ] PTY / shell spawn IPC handlers
- [ ] Session management (multi-tab with SessionService)
- [ ] Unit tests (Vitest — DI container, EventBus, ConfigService)
- [ ] E2E tests (Playwright + Electron)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Auto-updater (electron-updater)
