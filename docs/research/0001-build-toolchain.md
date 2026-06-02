# 0001 — Build toolchain: Electron Forge 7 + Vite plugin

- **Status:** Accepted (Phase 1)
- **Date:** 2026-06-02
- **Deciders:** Kevin (owner) + agent, via the kickoff conversation.

## Context

The repo built on `electron-forge@6.0.0-beta.54` with the `@electron-forge/plugin-webpack`
(Webpack 4 era), Babel, and a bespoke `webpack.{main,renderer}.config.js` + `webpack.rules.js`.
That stack no longer installs/builds cleanly on modern Node (24) and is slow to iterate. The
owner's top product goal is **startup speed** and a general modernization, and we want a clean
runway to TypeScript.

## Options considered

1. **Electron Forge 7 + `@electron-forge/plugin-vite`** *(chosen)* — keeps Forge's maker pipeline
   (Squirrel installer already configured for Windows) and swaps Webpack for Vite. Fast dev
   cold-start + HMR, TS-native, minimal packaging risk because Forge still owns `make`/`package`.
2. **Electron Forge 7 + Webpack 5** — lowest churn, but slower dev loop and keeps us on an
   older-feeling toolchain we'd likely replace later anyway.
3. **electron-vite + electron-builder** — best-in-class DX, but replaces Forge entirely and forces
   us to re-author the Windows installer config from scratch (largest blast radius).

## Decision

Option 1. The owner confirmed: *"electron forge uses vite right? so forge 7 + vite plugin seems
like the correct path… we should also add TS."*

## Consequences & implementation notes

- Config ported from the official `electron-forge` **vite-typescript** template (fetched verbatim
  from the `electron/forge` repo) to guarantee correct wiring of the magic constants
  (`MAIN_WINDOW_VITE_DEV_SERVER_URL`, `MAIN_WINDOW_VITE_NAME`) and electron/node-builtin externalization.
- `forge.config.ts` recreates the existing makers (Squirrel/zip/deb/rpm) and adds the template's
  **Fuses** hardening (`RunAsNode:false`, `OnlyLoadAppFromAsar:true`, ASAR integrity, etc.).
- `index.html` moves to the **project root** with `<script type="module" src="/src/renderer.js">`
  (Vite convention); the old Webpack HTML-injection setup is dropped.
- Entries stay `.js` for now (`entry: 'src/main.js'`, `src/preload.js`, renderer `src/renderer.js`);
  `tsconfig` uses `allowJs:true` so `.ts` can be introduced incrementally (see [0004](0004-typescript-strategy.md)).

## Version compatibility (verified 2026-06-02)

- `@electron-forge/plugin-vite@7.11.2` declares **no** `vite` dependency/peer → it uses the
  project's installed vite, so it is vite-version-agnostic.
- `@vitejs/plugin-react@6` requires **vite ^8**; `vitest@4` supports vite 6/7/8. → We standardize on
  **vite 8** + `@vitejs/plugin-react@6`.
- **Fallback if vite 8 trips the Forge plugin:** drop to `vite@7` + `@vitejs/plugin-react@5.0.4`
  (peer range `^4||^5||^6||^7`). Record the outcome in `docs/progress-log.md`.

Superseded build files removed: `webpack.*.config.js`, `webpack.rules.js`, `babel.config.js`,
`.browserslistrc`, `nodemon.json`, `config/` (node-config), old `forge.config.js`.
