# AGENTS.md

Slim guide for working in this repo without breaking it. Deeper rationale lives in
[`docs/`](docs/) (locked decisions in [`docs/decisions/`](docs/decisions/), the runbook in
[`docs/upgrade-plan.md`](docs/upgrade-plan.md), the wishlist in [`docs/roadmap.md`](docs/roadmap.md)).

> **Before you "fix", "clean up", or revert anything that looks odd, check
> [`docs/decisions/`](docs/decisions/).** It is the paper trail of settled decisions and the things
> the owner explicitly rejected ("no, that's wrong"). Every entry is **locked** — if a change really
> needs to reverse one, add a new dated file that supersedes it ([`TEMPLATE.md`](docs/decisions/TEMPLATE.md));
> do not quietly undo it. A few that bite most often: images load via `window.api.readImageData`, **not**
> a custom protocol; render with `<img>`, **not** `<canvas>`; the packaged app is one word `ImageViewer`;
> fonts are self-hosted locally, **not** the Google CDN.

## What this is

A touch-friendly **Electron** image browser (used on a Surface tablet). Renderer is **React 19** +
**Emotion** (`css` prop), state via **RxJS** + a small custom redux-observable. Built with **Electron
Forge 7 + the Vite plugin**. Package manager is **Yarn 4** (Corepack).

## Commands

```bash
corepack enable          # once per machine (Yarn 4 is Corepack-managed)
yarn                     # install
yarn start               # dev (electron-forge start; Vite HMR)
yarn test                # vitest (watch)   |  yarn test:run for one-shot
yarn typecheck           # tsc --noEmit (TS config files only for now)
yarn lint                # biome check --write --unsafe  +  eslint . --fix
yarn package             # build main/preload/renderer + package the app (no installer)
yarn make                # build + Windows Squirrel installer (and zip/deb/rpm)
```

## The one rule that matters: the renderer has no Node access

`contextIsolation` is **on**, `nodeIntegration` is **off**. The renderer (everything in
`src/components/**`) **must NEVER** `import` from `electron`, `fs`, `path`, `os`, `child_process`, or
read `process`. All of that goes through the preload bridge, exposed as **`window.api`**
(see [`src/preload.js`](src/preload.js)).

`window.api` surface:

| Member | Purpose |
| --- | --- |
| `cliFilePath` | file/folder the window was launched with (from `--filePath=` additionalArguments) |
| `getWindowsDrives()` | `["C:\\", "D:\\", …]` (sync IPC) |
| `statPath(p)` | `{ exists, isFile, isDirectory }` (sync) |
| `readDirectory(dir)` | `Promise<[{ fileName, filePath, isDirectory, isFile }]>` |
| `readImageData(filePath)` | `Promise<{ data: ArrayBuffer, mimeType }>` — image bytes for the renderer Blob |
| `deleteFilePath({ filePath, isDirectory })` | `Promise<boolean>` — trash, then permanent-delete fallback |
| `createNewWindow({ filePath })` | open another window |
| `path.{dirname,basename,join,resolve,extname,sep}` | path helpers |

To add a privileged capability: add it to `src/preload.js` (and an `ipcMain` handler in
`src/main.js` if it needs the main process), then call `window.api.*` from the renderer. Keep
everything crossing `contextBridge` **plain/serializable** (map `Dirent`/`Stats` to plain objects).

## Main process invariants (`src/main.js`)

- **IPC channels:** `get-windows-drives` (sync), `createNewWindow` (send), `deleteFilePath` (invoke).
  Don't rename without updating preload + renderer.
- **Delete** = `shell.trashItem` → on failure, `fs.promises.rm({recursive,force})`. (`moveItemToTrash`
  was removed in Electron 13.) Keep delete going to the Recycle Bin.
- **Image bytes** are read off disk in preload via `window.api.readImageData(filePath)` (returns
  `{ data: ArrayBuffer, mimeType }`) and turned into a `Blob` in
  ([`createFileDownloadObservable.js`](src/components/imageLoader/createFileDownloadObservable.js)).
  There is **no custom protocol** — the old `safe-file-protocol://` scheme (`protocol.handle` +
  `net.fetch` + XHR) was removed because it was fragile on Windows paths; see
  [`docs/workers/fix-image-loading.md`](docs/workers/fix-image-loading.md).
- **Drive list** comes from probing `A:`–`Z:` with `fs.existsSync` (NOT `wmic`, which is gone on
  Win11 — see [`drive-enumeration-no-wmic`](docs/decisions/2026-06-02-drive-enumeration-no-wmic.md)).
- The launch file path is read from `process.argv` and passed to every window via
  `additionalArguments: ['--filePath=…']`.

## Conventions

- **File extensions:** JSX → **`.jsx`**, pure logic → **`.js`** (Vite 8/oxc rejects JSX in `.js`).
  Source is still JavaScript; the `.js → .ts`/`.tsx` conversion is a later phase
  ([`typescript-tooling-now-convert-later`](docs/decisions/2026-06-02-typescript-tooling-now-convert-later.md)).
  Imports are extensionless.
- **Formatting/linting:** Biome is primary (`biome.json`); a minimal ESLint flat config
  (`eslint.config.mjs`) adds a few `.ts/.tsx`-only rules. Run `yarn lint` before committing.
- **Entry points** referenced by `forge.config.ts`: `src/main.js`, `src/preload.js`, and the root
  `index.html` → `/src/renderer.jsx`. Don't move these without updating the config.

## Don't break these

1. Renderer importing Node/electron directly (use `window.api`).
2. Delete-to-trash flow and the `deleteFilePath` IPC contract.
3. Image loading via `window.api.readImageData` (preload) → `Blob`. **Do NOT reintroduce the old
   `safe-file-protocol` custom scheme** — it never delivered pixels on Windows and was deliberately
   removed (see [`no-custom-protocol-read-image-bytes-in-preload`](docs/decisions/2026-06-03-no-custom-protocol-read-image-bytes-in-preload.md)).
4. Passing the launch path via `additionalArguments` / reading `cliFilePath` in preload.
5. `nodeLinker: node-modules` in `.yarnrc.yml` (PnP breaks Electron Forge packaging).

## Tests

Vitest + jsdom + Testing Library. `vitest.setup.js` stubs `window.api` so renderer modules import
cleanly. Pure logic (reducers, natural sort, image filtering) is the easiest to cover — add tests
there when changing behavior.
