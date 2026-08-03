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

A touch-friendly **Electron** image browser (used on a Surface tablet). Renderer is **React 19 +
TypeScript**, styled with **Tailwind v4 on `@charcuterie/tokens`**, state via **RxJS** + a small
custom redux-observable. Built with **Electron Forge 7 + the Vite plugin**. Package manager is
**Yarn 4** (Corepack).

**There is no Emotion.** It was removed in M6c (2026-07-31) so the app could consume
`@charcuterie/ui`, the fleet's shared component library. If you are about to write a `css` prop,
read [`docs/typescript-and-tailwind-conventions.md`](docs/typescript-and-tailwind-conventions.md)
first — it is the specification for renderer code and it has the hex→token map.

## Commands

```bash
corepack enable          # once per machine (Yarn 4 is Corepack-managed)
yarn                     # install
yarn start               # dev (electron-forge start; Vite HMR)
yarn test                # vitest (watch)   |  yarn test:run for one-shot
yarn typecheck           # tsc --noEmit — covers all of src/ now, not just the configs
yarn lint                # biome check --write  +  eslint . --fix
yarn build:renderer      # vite build of the renderer alone — the gate that can see Tailwind
yarn package             # build main/preload/renderer + package the app (no installer)
yarn make                # build + Windows Squirrel installer (and zip/deb/rpm)
```

`yarn build:renderer` matters more than it looks. jsdom does not compute styles from a
stylesheet, so **no test can tell a real utility from a class name Tailwind never generated** —
a `className` assertion passes either way. The Vite build runs the real Tailwind pass and is
the only gate that can.

There is no working global `yarn` on the sandbox host; `corepack yarn <script>` works without
installing anything (`corepack enable` may fail on EACCES writing `/usr/local/bin`), or call the
binaries directly (`node_modules/.bin/tsc`, `node_modules/.bin/vitest`, …), which is what a
subagent scoped to one directory should do anyway.

## Running the app in the sandbox — you can, so do

**Never write "there is no GUI in this sandbox."** It is false, it has been written in this
repo's docs before, and the fleet rule forbids it. Any change with a visual result gets run and
screenshotted *in the state that changed* — an open menu with focus on an item, a tooltip opened
by keyboard, a dialog with its backdrop. A default render proves nothing.

**Do not use the dev server.** `MAIN_WINDOW_VITE_DEV_SERVER_URL` is baked into
`.vite/build/main.js`, and a stale build carries whatever port the last agent used — one session
loaded a *different app* from another agent's `:5173`. Build for `file://` instead, which is
`main.js`'s `loadFile` branch:

```bash
# renderer → the path main.js looks for, with relative asset URLs
yarn vite build --config vite.renderer.config.ts \
  --outDir .vite/renderer/main_window --base ./ --emptyOutDir

# main + preload → cjs lib build, electron + node builtins external, and
# define MAIN_WINDOW_VITE_DEV_SERVER_URL=undefined + MAIN_WINDOW_VITE_NAME='"main_window"'

IMAGE_VIEWER_FAKE_FS=1 xvfb-run -n 71 -s "-screen 0 1600x1000x24" \
  ./node_modules/.bin/electron . \
  --remote-debugging-port=9333 --user-data-dir=/tmp/iv-userdata --no-sandbox
```

Then drive it with Playwright over CDP — `chromium.connectOverCDP("http://127.0.0.1:9333")` and
pick the page whose URL contains `main_window` (a DevTools page is also listed). `playwright-core`
is not a dependency here; import a sibling repo's copy rather than installing one.

Two things that will waste your time if you don't know them: **`window.api` is frozen** by
`contextBridge`, so you cannot stub the preload bridge from the renderer to simulate slow disk or
errors; and the fake FS resolves reads within the same tick, so any "loading" state is unreachable
without a delay knob in `src/fakeFileSystem.ts`. Screenshots go in `__screenshots__/` (gitignored).

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

Full version, with the colour map and the traps:
[`docs/typescript-and-tailwind-conventions.md`](docs/typescript-and-tailwind-conventions.md).
The short version:

- **File extensions:** JSX → **`.tsx`**, pure logic → **`.ts`**. `tsconfig.json` sets
  `allowJs: false`, so a `.js` under `src/` is a module `tsc` **cannot resolve** — not one it
  silently skips. The only survivors are `src/main.js` and `src/preload.js`, excluded by name.
  Imports are extensionless, so renaming a file never touches its callers.
- **Props are types, not `prop-types`.** Write the type inline on the parameter; do not use
  `FC<Props>` (its implicit `children` is how a component that forgot to render them passed).
- **Styling is Tailwind utilities on `className`**, with colours from `@charcuterie/tokens`.
  A hex literal in a component is a bug. **A runtime-computed value never goes in a class** —
  Tailwind scans source *text*, so `` className={`w-[${size}px]`} `` generates no CSS and the
  element has no width, with no error and no failing test. Computed values go in an inline
  `style`, or in a CSS custom property a utility reads.
- **Formatting/linting:** Biome is primary (`biome.json`); a minimal ESLint flat config
  (`eslint.config.mjs`) adds four rules Biome cannot express, all scoped to `.ts`/`.tsx`:
  `id-length` (min 2 — no `(e) =>`), the `is`/`has` boolean-name rule, `react/no-multi-comp`
  (one component per file), and the react-hooks pair. Run `yarn lint` before committing.
- **Entry points** referenced by `forge.config.ts`: `src/main.js`, `src/preload.js`, and the root
  `index.html` → `/src/renderer.tsx`. Don't move these without updating the config.
- **`window.api` is fully typed** by [`src/preload.d.ts`](src/preload.d.ts), with the payload
  shapes in [`src/types.ts`](src/types.ts). If a call site needs a cast, **the declaration is
  wrong** — fix the declaration. It has been wrong before: it had never been told about
  `fullScreen`, `searchFolders` or the four saved-queue members.

## Don't break these

1. Renderer importing Node/electron directly (use `window.api`).
2. Delete-to-trash flow and the `deleteFilePath` IPC contract.
3. Image loading via `window.api.readImageData` (preload) → `Blob`. **Do NOT reintroduce the old
   `safe-file-protocol` custom scheme** — it never delivered pixels on Windows and was deliberately
   removed (see [`no-custom-protocol-read-image-bytes-in-preload`](docs/decisions/2026-06-03-no-custom-protocol-read-image-bytes-in-preload.md)).
4. Passing the launch path via `additionalArguments` / reading `cliFilePath` in preload.
5. `nodeLinker: node-modules` in `.yarnrc.yml` (PnP breaks Electron Forge packaging).
6. The **self-hosted** fonts. `src/styles/tailwind.css` imports `src/fonts/SourceSansPro.css`;
   do not put a Google Fonts `<link>` back in `index.html`. That import existed and was wired to
   nothing until M6c, which is why the CDN link survived a decision that had already banned it.
7. **`@charcuterie/tokens/fonts.css` is not imported**, deliberately — it ships Baloo 2 / Outfit /
   Victor Mono, and Source Sans Pro is a locked decision. `--font-sans` is overridden in
   `src/styles/tailwind.css`, **unlayered and matching `[data-variant]`**, because a `:root` or
   `@layer base` override loses to the tokens' own selector and the app quietly renders in Outfit.

## Tests

Vitest + jsdom + Testing Library. `vitest.setup.ts` stubs `window.api` — typed as the real
`Window["api"]`, so a member the bridge exposes and the stub forgets is a typecheck failure
rather than an `undefined is not a function` in whichever test reaches it first. Pure logic
(reducers, natural sort, image filtering) is the easiest to cover — add tests there when
changing behavior.

Two tests exist only to stop a copied constant drifting, because nothing else can see it:

- `src/styles/firstPaintColour.test.ts` — `index.html`'s inline anti-flash hex against
  `surface.base` from `@charcuterie/tokens`. That rule paints before any stylesheet parses, so
  it cannot read a custom property; the hex has to be a copy. It failed on its first run.
- `src/components/convenience/titleBarHeight.test.ts` — the title bar's height across its three
  homes: the TS constant, `--title-bar-height` in the stylesheet, and `titleBarOverlay.height`
  in the main process. Drift puts the native window controls off our strip and throws nothing.
