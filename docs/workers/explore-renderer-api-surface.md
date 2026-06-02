# Worker: map renderer Node/Electron API surface

- **Agent type:** Explore (read-only)
- **Run:** 2026-06-02, Phase 1 planning
- **Feeds:** [research/0002-electron-security-model.md](../research/0002-electron-security-model.md)
  (the preload bridge design)

## Prompt

> Explore the Electron app at `d:\Projects\Personal\image-viewer` (read-only). I'm migrating it from
> Electron 11 (nodeIntegration, contextIsolation:false, `remote`) to Electron 42 with a SECURE model
> (contextIsolation:true, nodeIntegration:false, preload + contextBridge + IPC). I need an exhaustive
> inventory of every place the RENDERER (everything under `src/` EXCEPT `src/main.js`) touches Node.js
> or Electron APIs, so I can design a complete preload bridge.
>
> For each usage report: file + line, exact call, args, sync vs async, and whether it runs at
> module-load (top-level) or inside a component/callback/effect. Cover: every `electron` import
> (`ipcRenderer` channels + payloads, `remote.getGlobal`), Node built-ins (`fs` methods sync/async,
> `path`, `os`, `child_process`, `process.argv/env`), the `safe-file-protocol` URL construction, and
> which usages are top-level-sync (hardest for async IPC). Also inventory `src/main.js` IPC handlers,
> `global.*` values, the `protocol.registerFileProtocol` call, and `webPreferences`. Finally, summarize
> the Electron Forge **Vite plugin** entry config + injected magic constants from the official docs.

## Outcome (summary — the resulting bridge)

IPC: `send('createNewWindow',{filePath})` (ImageFile, Directory, FileBrowser×2);
`invoke('deleteFilePath',{filePath,isDirectory})→Promise<bool>` (DirectoryControls, FileBrowser).
Top-level sync: `remote.getGlobal('windowsDrives'|'processArgs')` and `fs.lstatSync` in
`FileSystemProvider.js` + `ImageViewerProvider.js`; `process.argv` `--filePath` parsing in both.
Async: `fs.readdir` via RxJS `bindNodeCallback` in `FileSystemProvider.js` + `Directory.js`.
`path.*` used in those plus `TitleBar.js`, `useImageFiles.js`, `reduxObservable.js`.
`safe-file-protocol://<path>` built in `createFileDownloadObservable.js` (browser XHR — unchanged).
Forge Vite constants: `MAIN_WINDOW_VITE_DEV_SERVER_URL`, `MAIN_WINDOW_VITE_NAME`; preload referenced
as `path.join(__dirname,'preload.js')`. → full mapping table in research/0002.
