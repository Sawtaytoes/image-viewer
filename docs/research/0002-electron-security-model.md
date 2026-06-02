# 0002 — Electron security model: contextIsolation + preload + IPC

- **Status:** Accepted (Phase 1)
- **Date:** 2026-06-02
- **Deciders:** Kevin (owner) + agent.

## Context

The app ran with the legacy insecure model: `nodeIntegration:true`, `contextIsolation:false`,
`enableRemoteModule:true`, and the `@electron/remote` (`remote`) module. Electron removed `remote`
from core in v14 and `enableRemoteModule` no longer exists, so the app cannot run on Electron 42 as
written. The renderer imported `electron`, `fs`, `path`, and read `process.argv` directly.

## Options considered

1. **Minimal:** add the `@electron/remote` package back, keep `nodeIntegration:true` /
   `contextIsolation:false`, only fix the removed APIs. Fastest to a running build, but keeps the
   insecure model and `@electron/remote` (itself discouraged), guaranteeing a second migration later.
2. **Secure now** *(chosen)*: `contextIsolation:true`, `nodeIntegration:false`, `sandbox:false`, a
   **preload** script exposing a curated API via `contextBridge`, and IPC for privileged actions.

## Decision

Option 2 — owner selected "Secure: contextIsolation + preload + IPC now." `@electron/remote` is
**not** reintroduced.

## Design — the preload bridge

The renderer must never import `electron`/`fs`/`path`/`process` again. A single `src/preload.js`
exposes `window.api` via `contextBridge.exposeInMainWorld`. Key insight: with `sandbox:false` the
**preload has full Node access** while the **renderer does not**, so the synchronous values the
React providers compute *at module-load time* are preserved as plain serializable data instead of
being forced through async IPC:

| Renderer used to do… | Now goes through `window.api`… | Mechanism |
| --- | --- | --- |
| `remote.getGlobal('processArgs')[1]` / `process.argv` | `api.cliFilePath` | preload reads `process.argv` |
| `remote.getGlobal('windowsDrives')` | `api.getWindowsDrives()` | sync IPC `sendSync('get-windows-drives')` |
| `fs.lstatSync(p).isFile()/isDirectory()` | `api.statPath(p)` → `{exists,isFile,isDirectory}` | preload `fs.lstatSync` (plain object) |
| `bindNodeCallback(fs.readdir)(...)` + map | `api.readDirectory(dir)` → `Promise<entry[]>` | preload maps `Dirent`→plain object |
| `path.*` | `api.path.{dirname,basename,join,resolve,extname,sep}` | preload-bound functions |
| `ipcRenderer.invoke('deleteFilePath', …)` | `api.deleteFilePath(payload)` | IPC invoke |
| `ipcRenderer.send('createNewWindow', …)` | `api.createNewWindow(payload)` | IPC send |

Only plain data and functions cross the bridge — `Dirent`/`Stats` are flattened in preload so
`contextBridge`'s structured-clone constraints are satisfied.

`src/main.js` changes that follow from this:
- `webPreferences`: `contextIsolation:true`, `nodeIntegration:false`, `sandbox:false`,
  `preload: path.join(__dirname, 'preload.js')`; `enableRemoteModule` removed.
- The first window's file path is computed from `process.argv` in main and passed via
  `additionalArguments: ['--filePath='+filePath]` (same channel `createNewWindow` already used) so
  `global.processArgs` is no longer needed.
- Custom `safe-file-protocol` migrated from deprecated `registerFileProtocol` to
  `registerSchemesAsPrivileged` + `protocol.handle` (see [0001](0001-build-toolchain.md) and the main
  process source). The renderer's XHR to `safe-file-protocol://<path>` is unchanged.

## Consequences

- More files touched in Phase 1, but no second security pass later.
- Invariant for all future work, recorded in `AGENTS.md`: **renderer code goes through `window.api`;
  never import `electron`/`fs`/`path`/`process` in `src/components`.**
- `sandbox:false` is a deliberate trade-off: it keeps Node in the *preload* (needed for sync
  `fs`/`path`) while the *renderer* stays Node-free. Revisit if we later move all fs work to IPC.
