# Progress log — Phase 1 (modernization)

Chronological record of what changed and how it was verified. Newest entries appended at the bottom.

## 2026-06-02 — Planning & research

- Audited the repo (Electron 11 / Forge 6-beta / Webpack / React 17 / Emotion 10 / MUI-icons-only /
  custom `@ghadyani-eslint`; mid-migration and not building).
- Confirmed latest versions: Electron 42, React 19, Vite 8, Forge 7.11.2, Biome 2, TypeScript 6.
- Locked decisions with the owner (see `docs/decisions/` — the 2026-06-02 entries):
  Forge 7 + Vite plugin · secure contextIsolation + preload + IPC · Biome + minimal ESLint from
  mux-magic · TS tooling now / source conversion later · inline 4 SVG icons · replace `wmic`.
- Created `docs/` (research records, worker prompts, roadmap from `TASKS.md`, this log) and the
  approved plan (`docs/upgrade-plan.md`).

## 2026-06-02 — Implementation

**Build & tooling**
- Rewrote `package.json`: Electron 42, Forge 7, React 19, Vite 8, Emotion 11, RxJS 7, Biome 2,
  ESLint 10, TypeScript 6, Vitest 4. Removed react-hot-loader, Babel stack, `@material-ui/*`,
  `@emotion/core`, eslint-loader, node-config, `@ghadyani-eslint`, the webpack relocator loader.
- Added `forge.config.ts` (Squirrel/zip/deb/rpm makers + Fuses hardening), `vite.{main,preload,renderer}.config.ts`,
  `forge.env.d.ts`, `tsconfig.json`, `biome.json`, `eslint.config.mjs`, `.editorconfig`, root `index.html`.
- Deleted `webpack.*`, `babel.config.js`, old `.eslintrc.js`/`.eslintignore`, `.browserslistrc`,
  `nodemon.json`, `config/`, old `forge.config.js`. Folded `TASKS.md` into `docs/roadmap.md`.

**Secure Electron model**
- `src/main.js`: `contextIsolation:true` / `nodeIntegration:false` / `sandbox:false` + preload;
  `protocol.handle` for `safe-file-protocol`; `shell.trashItem` (+ `fs.rm` fallback) for delete;
  `fs.existsSync` drive probing instead of `wmic`; launch path via `additionalArguments`.
- New `src/preload.js` exposes `window.api` (cliFilePath, getWindowsDrives, statPath, readDirectory,
  deleteFilePath, createNewWindow, path.*).
- Refactored every renderer file off `electron`/`fs`/`path`/`process` onto `window.api`
  (FileSystemProvider, ImageViewerProvider, Directory, DirectoryControls, FileBrowser, ImageFile,
  TitleBar, useImageFiles, reduxObservable). Verified clean via grep.

**React / Emotion / icons**
- `createRoot` (React 19); removed `react-hot-loader`/`hot(module)`. `@emotion/core` → `@emotion/react`
  across all `css`-prop files. Inlined 4 SVG icons (`src/components/icons/`), dropped MUI.
- Renamed 26 JSX-bearing `.js` files to `.jsx` (Vite 8/oxc + tsc reject JSX in `.js`) — see
  [research/0007](decisions/2026-06-02-jsx-files-use-jsx-extension.md). Pure-logic files stay `.js`.

**Tooling latest + Yarn 4**
- Restored `@electron/fuses` to latest **v2.1.1** (it was a new addition, not a downgrade); bumped
  jsdom→29, @types/node→25, testing-library/typescript-eslint to latest.
- Moved to **Yarn 4.16** (Corepack). `.yarnrc.yml`: `nodeLinker: node-modules`, `npmMinimalAgeGate: 0`,
  `approvedGitRepositories` (electron/node-gyp), `enableScripts: true` — see
  [research/0008](decisions/2026-06-02-yarn4-nodelinker-node-modules.md). `.gitignore` updated (incl. `.env`).

**Tests**
- Vitest + jsdom + Testing Library set up (`vitest.config.ts`, `vitest.setup.js` stubs `window.api`).
- Characterization tests: `compareNaturalStrings`, `createActionCreator`, `createReducer`,
  `useImageFiles` (extension filter + natural sort), and a React 19 + Emotion render-pipeline smoke test.

**Verification (2026-06-02)**

- `yarn install` (Yarn 4) clean; Electron 42.3.1 binary fetched.
- `yarn typecheck` — passes.
- `yarn lint` (Biome + ESLint) — clean. Notes in [research/0003](decisions/2026-06-02-linting-biome-plus-minimal-eslint.md):
  dropped Biome `--unsafe` after it arrow-converted two `function`-with-`.prototype` action creators
  (would have crashed the app at module load); disabled a few touch-app-inappropriate rules; deleted
  4 dead SSR files.
- `yarn test:run` — **11/11 pass** (a test-only infinite-loop bug from passing an unstable array to
  `useImageFiles` was fixed).
- `yarn package` — **builds and packages** `out/Image Viewer-win32-x64/Image Viewer.exe` (main +
  preload + renderer Vite bundles, Fuses hardening applied; `@electron/fuses` v2 works with the Forge
  plugin despite the cosmetic peer warning).

**Still requires a human (GUI, can't run headless):** the manual parity click-through — drive list,
folder navigation, thumbnail loading via `safe-file-protocol`, opening an image, opening a second
window (Ctrl/Shift+click), and **delete → Recycle Bin** — plus `yarn make` + installing the Squirrel
package and smoke-testing the installed app.

**Gitea push — done.** After the `GITEA_TOKEN` was reissued with `write:user`, the repo
`sawtaytoes/image-viewer` was created and both branches pushed over SSH
(`ssh://git@gitea.octen.dev:30009/sawtaytoes/image-viewer.git`): `master` (original baseline) and
`phase-1-modernization` (this work). Review PR opened:
<https://gitea.octen.dev/sawtaytoes/image-viewer/pulls/1> (`phase-1-modernization` → `master`).
(Initial blocker: the first token lacked `write:user`, and the server has "push to create" disabled.)

## 2026-06-02 — First live run (owner, packaged app, Windows 11 / G:\Pictures)

- PR #1 **merged** to `master`; Gitea repo set **public**. GitHub `origin` left untouched (owner pushes
  there after verifying). Built `out/Image Viewer-win32-x64/Image Viewer.exe` via `yarn package`.
- **Startup is noticeably faster** (owner confirmed) — a Phase-1 win.
- **Folder browsing works** — directories/navigation/title-bar all correct (proves the `window.api`
  bridge + drive enumeration).
- **BUG: images/thumbnails don't load** — `safe-file-protocol` fetch path. Documented in
  [known-issues.md](known-issues.md) + the fix brief [workers/fix-image-loading.md](workers/fix-image-loading.md).
  Per the owner, we stop here and pick it up another day; everything the migrating agent knew is written
  down for a fresh worker.
- Future plan captured: CI release pipeline for downloadable EXEs
  ([workers/release-pipeline.md](workers/release-pipeline.md), [roadmap.md](roadmap.md)).

## 2026-06-02 — Reconciled GitHub's divergent master

- Discovered GitHub `master` had a **separate, earlier** modernization (Electron 12 / Webpack / Yarn 3,
  4 commits) the local clone never had. Per owner, **superseded it with Phase 1** via a non-destructive
  `ours` merge (their history preserved). Ported the one useful bit — the Surface-Pro
  `webFrame.setZoomFactor(0.75)` (now in `src/preload.js`). Details: [research/0009](decisions/2026-06-02-github-master-reconciliation.md).
- Fixed a CRLF/LF thrash (Git autocrlf vs Biome LF) via `.gitattributes` `eol=lf`.
- Pushed `master` to **both** GitHub (`origin`) and Gitea.

## 2026-06-12 — HEIC/HEIF support (branch `feat/heic-support`)

Closes the last open feature brief: iPhone HEIC photos now list and render. Chromium can't decode
HEIC, so `.heic`/`.heif` are transcoded to JPEG in the **main** process and the renderer pipeline is
otherwise untouched. Full brief + rationale: [workers/feature-heic-support.md](workers/feature-heic-support.md).

- `readImageData` ([preload.js](../src/preload.js)) routes only `.heic`/`.heif` to a new
  `ipcMain.handle("readHeicAsJpeg")` ([main.js](../src/main.js)); all other formats keep the fast
  direct-`fs` path. The handler decodes via `heic-convert` (libheif WASM, inlined) and returns
  `{ data: ArrayBuffer, mimeType: "image/jpeg" }`. Decoded JPEGs are cached by `path+mtime` (64-entry LRU).
- Extensions added to `validImageExtensions` ([useImageFiles.js](../src/components/fileBrowser/useImageFiles.js))
  and the MIME table ([imageMimeTypes.js](../src/imageMimeTypes.js)).
- `heic-convert` is **bundled** (not externalized): Forge's Vite plugin ships only `.vite/build` in the
  asar, so the lazy `import()` code-splits into a `heic-convert-*.js` chunk that lands inside `app.asar`
  (verified). Lazy load keeps it off the startup path.
- **Verified:** `yarn typecheck` / `yarn lint` / `yarn test:run` (74 pass) / `yarn package` all green;
  asar confirmed to contain the libheif chunk + handler. A real 2.9 MB HEIC decoded to a valid JPEG
  under Node (~2.6 s) and under Electron's runtime (~1.3 s).
- **Owed (human/GUI):** confirm tiles render + open in single/columns, check EXIF orientation on a real
  portrait shot. **Follow-up:** thumbnail decode is ~1.3 s/image on the main thread — fine per-image,
  slow for a big HEIC folder on first browse (cached after); future work = embedded-preview extraction
  and/or moving the decode to a `utilityProcess`/worker.
