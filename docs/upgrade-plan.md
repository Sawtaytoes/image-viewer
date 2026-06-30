# Upgrade plan — Phase 1 (living runbook)

> Decisions behind each step live in [`docs/decisions/`](decisions/). Status is tracked in
> [`progress-log.md`](progress-log.md). Later phases are in [`roadmap.md`](roadmap.md).

## Goal

Get Image Viewer **building, running, and packaging on the latest stack with behavior parity** — plus
the secure Electron model, modern tooling, a test harness, and these docs. **No new product features.**

| From | To |
| --- | --- |
| Electron 11 (`nodeIntegration`, `remote`) | Electron 42 (contextIsolation + preload + IPC) |
| electron-forge 6-beta + Webpack | electron-forge 7 + `@electron-forge/plugin-vite` |
| React 17 + react-hot-loader | React 19 + Vite Fast Refresh |
| Emotion 10 (`@emotion/core`) | Emotion 11 (`@emotion/react`) |
| `@material-ui/icons` (4 icons) | inline SVG icons |
| `@ghadyani-eslint` + eslint-loader | Biome 2 + minimal ESLint flat config |
| Babel / node-config | Vite / `import.meta.env` |
| (no TypeScript) | TS tooling (`allowJs`), source conversion deferred |
| (no tests) | Vitest + characterization tests |

## Steps

1. **Tooling baseline** ([0001](decisions/2026-06-02-build-toolchain-electron-forge-vite.md), [0003](decisions/2026-06-02-linting-biome-plus-minimal-eslint.md), [0004](decisions/2026-06-02-typescript-tooling-now-convert-later.md), [0005](decisions/2026-06-02-inline-svg-icons-drop-mui.md))
   - Rewrite `package.json` deps + scripts. Add `forge.config.ts`, `vite.{main,preload,renderer}.config.ts`,
     `forge.env.d.ts`, `tsconfig.json`, `biome.json`, `eslint.config.mjs`, `.editorconfig`.
   - Move `src/index.html` → root `index.html` with `<script type="module" src="/src/renderer.js">`.
   - Delete `webpack.*.config.js`, `webpack.rules.js`, `babel.config.js`, `.eslintrc.js`,
     `.eslintignore`, `.browserslistrc`, `nodemon.json`, `config/`, old `forge.config.js`.
2. **Main process** `src/main.js` ([0002](decisions/2026-06-02-electron-security-contextisolation-preload.md), [0006](decisions/2026-06-02-drive-enumeration-no-wmic.md))
   - Secure `webPreferences`; `protocol.handle` for `safe-file-protocol`; `shell.trashItem` + `fs.rm`
     fallback for delete; pass first-window file path via `additionalArguments`; replace `wmic` drive
     enumeration with `fs.existsSync` probing + `get-windows-drives` sync IPC.
3. **Preload** new `src/preload.js` — `contextBridge.exposeInMainWorld('api', …)` ([0002](decisions/2026-06-02-electron-security-contextisolation-preload.md)).
4. **Renderer** — replace every `electron`/`fs`/`path`/`process` import with `window.api`
   (`FileSystemProvider`, `ImageViewerProvider`, `Directory`, `DirectoryControls`, `FileBrowser`,
   `ImageFile`, `TitleBar`, `useImageFiles`, `reduxObservable`).
5. **React/Emotion/RxJS/icons** — `createRoot`; drop `react-hot-loader`/`hot(module)`;
   `@emotion/core`→`@emotion/react`; rxjs 6→7 (drop `rxjs/_esm2015` alias); 4 inline SVG icons.
6. **Tests** — Vitest (jsdom + Testing Library) on pure logic (imageLoader reducers, natural compare,
   image-extension filter, preload path helpers) + an `App` smoke test with `window.api` stubbed.
7. **Docs** — `AGENTS.md` + keep this runbook and `progress-log.md` current.

## Verification

`yarn` install · `yarn typecheck` · `yarn lint` · `yarn start` (no remote/require errors; `window.api`
present, `window.require` undefined) · manual parity: drives → navigate → thumbnails → open image →
second window → **delete to Recycle Bin** · `yarn test` · `yarn make` then smoke-test the installed app.
