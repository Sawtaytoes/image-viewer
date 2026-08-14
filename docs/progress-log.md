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
- `yarn package` — **builds and packages** `out/Image-Viewer-win32-x64/Image-Viewer.exe` (main +
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
  there after verifying). Built `out/Image-Viewer-win32-x64/Image-Viewer.exe` via `yarn package`.
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

## 2026-07-31 — TypeScript + Tailwind (branch `feat/m6c-typescript-tailwind`)

Charcuterie milestone **M6c phase 1**: the renderer becomes TypeScript and Tailwind v4 on
`@charcuterie/tokens`, so the app can consume `@charcuterie/ui` in phase 2. Full write-up:
[2026-07-31-m6c-typescript-and-tailwind.md](2026-07-31-m6c-typescript-and-tailwind.md); the house
rules it establishes are in
[typescript-and-tailwind-conventions.md](typescript-and-tailwind-conventions.md).

- **132 files** converted `.js`/`.jsx` → `.ts`/`.tsx`. `allowJs` is now **false**, so a `.js`
  under `src/` is a module `tsc` cannot resolve rather than one it silently skips. `main.js` and
  `preload.js` are excluded by name and remain the open work.
- **Emotion is gone** — 26 files, 125 `css` props, 24 `propTypes` blocks, and **119 colour
  literals → 0**. `@emotion/react` and `prop-types` are out of `package.json`.
- **Typecheck went from 16 files to 152.** It was green on `master` while 132 source files were
  not in the program at all.
- Four things found that no gate could see: the self-hosted fonts had **never been switched on**
  (the CSS was imported by nothing, its `url()`s pointed at a `public/` dir that does not exist,
  and `index.html` still hit the Google CDN); `preload.d.ts` had never heard of `fullScreen`,
  `searchFolders` or the four saved-queue members; two contexts were `createContext()` with no
  argument; and `fakeFileSystem`'s `searchFolders` depended on a variable shadow that a rename
  would have silently turned into "search the whole drive".
- **Verified:** `yarn typecheck` / `yarn lint:biome` (162 files) / `yarn lint:eslint` /
  `yarn test:run` (**114 pass**, was 108) / `yarn build:renderer` — all green. `build:renderer`
  is new and is in CI, because it is the only gate that can see a Tailwind class which generates
  no CSS.
- **Owed (human/GUI):** the selection blue changes hue (cyan → the accent intent's blue-violet)
  and the file browser's search bar flips luminance. Both are deliberate, both are recorded, and
  both want a look on the tablet. `yarn package` was not run — this sandbox cannot build for
  Windows.

## 2026-08-02 — `@charcuterie/ui` components (branch `feat/m6c-charcuterie-ui`)

Phase 2 of M6c: phase 1 made the renderer TypeScript + Tailwind and deliberately replaced no
component; this replaces them. Full write-up:
[`docs/2026-08-02-m6c-phase-2-charcuterie-ui.md`](2026-08-02-m6c-phase-2-charcuterie-ui.md).

- **Eight of the eleven itemised sites adopted** — `Tooltip` (8 call sites), `Select` (2), `Modal`
  (2), `Button`/`IconButton`, `Field`, `Toast` (2), `Menu` (the display picker), `ProgressBar` —
  plus `data-density="kiosk"` and the type ramp (17 `text-[NNpx]` → `text-sm`…`text-2xl`).
- **Every native `title` on a control is gone.** The only one left is `Image`'s on the `<img>`.
  This is the milestone's real win: a `title` never appears on touch, which is this app's primary
  input, so those explanations were dead text on the input that matters — and "Clear queue" wipes
  the whole queue with no other warning.
- **Three sites were tried and rejected on evidence**, recorded as a locked decision so nobody
  "finishes" them: `FolderPickerPopover`→`Menu` (top layer, breaks the in-pane rule; nested
  button; no trigger), `DateGroupedGrid`→`Accordion` (would delete the windowing), and
  `FolderTabStrip`→`Tabs` (no tab panels, and `aria-selected` would be a false statement).
  **`Icon` does not exist in the library at all** — that work-order row is unbuildable.
- **New library defect: `Menu` and `Tooltip` cannot share a trigger.** Same root cause as the
  known `Field`+`Tooltip` bug — `useClonedChild` is a bare `cloneElement` with no ref or prop
  merge — so it is a property of *every* slot pair, not those two components. A forwarding
  adapter does not fix this pair, because the second clone overwrites the first one's ref.
- **Three jsdom gaps shimmed** (`<dialog>`, the Popover API, and jsdom's UA
  `[popover]:not(:popover-open){display:none}` rule), each of which failed as something other
  than "unimplemented".
- **The app was run.** Phase 1's "there is no GUI in this sandbox" was wrong: built without a dev
  server, launched under Xvfb with the fake-FS fixtures, driven over CDP with Playwright. Six
  surfaces screenshotted in their *changed* state — tooltip open on keyboard focus, the real
  `<dialog>` with its backdrop, the pinned Toast, the Menu with roving focus on its first item,
  and the density flip before/after. The recipe is in the handoff.
- **Verified:** `yarn typecheck` (152 files) / `yarn test:run` (**120 pass**, was 114) /
  `yarn lint:biome` (163 files) / `yarn lint:eslint` / `yarn build:renderer` — all green.
- **Ended on `@charcuterie/ui@^1.0.0`.** The whole milestone was built against `^0.2.0` — `1.0.0`
  was not on the registry at the start or at any check during the work — and it published as the
  handoff was being written. Bumped, all five gates re-run, and the app relaunched and re-driven
  on it: **no source change was needed**. Cost: renderer 336.41 → 357.19 kB raw, 105.27 → 111.86
  kB gz.
- **Owed (human/GUI):** the accent hue is still open from phase 1 and **was not touched here**.
  `ProgressBar`'s loading state is the one surface that could not be driven — the fake FS resolves
  reads in-tick and `contextBridge` freezes `window.api`, so it cannot be stalled.

## 2026-08-11 — `@charcuterie/*` to latest (branch `chore/charcuterie-latest`)

Mechanical dependency bump: `tokens` 1.1.0 → **1.5.0**, `ui` 2.2.0 → **2.10.2**, `logic`
1.1.0 → **1.2.0**. The five `@charcuterie/*` dev configs (`biome-config`, `eslint-config`,
`tsconfig`, `vite-config`, `vitest-config`) were already at their latest published versions,
so nothing moved there.

- **No source change was needed.** `Menu` still takes a plain `MenuItem[]`: 2.6.0 widened
  `items` into a discriminated union (`MenuItem | MenuSeparator | MenuGroup`) but kept the
  bare item shape assignable, so `useDisplayMenuItems`' `MenuItem[]` return type still
  type-checks. The overlay layer was already portalled — this app adopted that in 2.0.0.
- **Two visual changes come with it, both intended upstream.** `ui@2.9.0` rebuilt the type
  ramp around a 17px body (`15 · 16 · 17 · 19 · 24 · 30px`), so text is larger everywhere;
  `tokens@1.5.0` strengthened `content.muted` so it clears AA on a highlighted row, so fine
  print (the display menu's resolution lines) reads stronger.
- **Nothing reflowed badly.** Before/after was measured, not eyeballed: at 900x700,
  1400x900 and 1920x1080, in both schemes, `documentElement.scrollWidth` equals
  `clientWidth`, no text-bearing element overflows its clipping box, and nothing lands
  off-viewport — an identical result to the pre-bump build. Control heights are unchanged
  (`Sort order` stays 44px; the colour-scheme button's 2px overhang of the 40px title bar
  predates this bump). The display menu panel grows 192x188 → 216x219 and the chrome bar's
  folder tab 43 → 47px, both inside their bars.
- **The display overflow menu is unaffected.** It opens, portals to `document.body`, does
  roving focus with Arrow/Home/End (wrapping at both ends), dismisses on Escape and Tab,
  and returns focus to its trigger — byte-for-byte the same behaviour as before the bump.
- **Verified:** `tsc --noEmit`, `biome check` (174 files), `eslint .`, `vite build` (renderer),
  and `vitest run` — 142 pass. The two failures in `ColorSchemeControl.test.tsx` are
  **pre-existing and unrelated**: this container's jsdom leaves `window.localStorage`
  undefined, so the suite's `afterEach` throws. They fail identically on `master`.
- **Still open upstream:** `Menu` and `Tooltip` sharing a trigger (see the comment in
  `RevealableChrome.tsx`) was not re-tested against 2.10.2 — worth a look now that
  `slotWiring` shares `mergeRefs` with `@charcuterie/logic` (2.5.0).
