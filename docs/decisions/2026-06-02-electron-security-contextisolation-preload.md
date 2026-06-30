# 2026-06-02 — Secure Electron with contextIsolation + preload + IPC

- **Status:** Locked
- **Date:** 2026-06-02
- **Deciders:** Kevin (owner) + agent
- **Source:** Migrated from `docs/research/0002-electron-security-model.md` (Phase 1 modernization)

## Decision (the rule)

Run the secure model: `contextIsolation:true`, `nodeIntegration:false`, `sandbox:false`, a **preload** exposing a curated `window.api` via `contextBridge`, and IPC for privileged actions. **Renderer code goes through `window.api`; never import `electron`/`fs`/`path`/`process` in `src/components`.** Do **not** reintroduce `@electron/remote`.

## What was rejected ("no, that's wrong")

The minimal path — add `@electron/remote` back, keep `nodeIntegration:true` / `contextIsolation:false`, only patch removed APIs. Fastest to a running build, but keeps the insecure model and a discouraged package, guaranteeing a second migration later. The legacy app used exactly this (`nodeIntegration:true`, `enableRemoteModule:true`, renderer importing `electron`/`fs`/`path`).

## Why

The legacy insecure model cannot run on Electron 42: `remote` was removed from core in v14 and `enableRemoteModule` no longer exists. Doing the secure pass now avoids a forced second migration. With `sandbox:false` the preload keeps full Node access while the renderer does not, so providers' synchronous module-load values survive as plain serializable data instead of being forced through async IPC.

## How to honor it

- `src/preload.js` exposes `window.api` via `contextBridge.exposeInMainWorld`. Mappings: `process.argv`→`api.cliFilePath`; `windowsDrives`→`api.getWindowsDrives()` (sync IPC `get-windows-drives`); `fs.lstatSync`→`api.statPath(p)`→`{exists,isFile,isDirectory}`; `fs.readdir`→`api.readDirectory(dir)`; `path.*`→`api.path.{dirname,basename,join,resolve,extname,sep}`; delete/new-window via `api.deleteFilePath`/`api.createNewWindow`.
- Only plain data/functions cross the bridge — `Dirent`/`Stats` are flattened in preload for structured-clone.
- `src/main.js`: set `webPreferences` as above with `preload: path.join(__dirname, 'preload.js')`, drop `enableRemoteModule`; pass first window's file path via `additionalArguments: ['--filePath='+filePath]` (no more `global.processArgs`); migrate `safe-file-protocol` from `registerFileProtocol` to `registerSchemesAsPrivileged` + `protocol.handle`.
- `sandbox:false` is deliberate: keeps Node in preload (sync `fs`/`path`) while renderer stays Node-free. Revisit if all fs work later moves to IPC.

## Evidence

Original ADR `docs/research/0002-electron-security-model.md`. Owner selected *"Secure: contextIsolation + preload + IPC now."* Invariant recorded in `AGENTS.md`.

## Related

- [[2026-06-02-build-toolchain-electron-forge-vite]]
- [[2026-06-02-drive-enumeration-no-wmic]]
