# 2026-06-02 — Build with Electron Forge 7 + the Vite plugin

- **Status:** Locked
- **Date:** 2026-06-02
- **Deciders:** Kevin (owner) + agent
- **Source:** Migrated from `docs/research/0001-build-toolchain.md` (Phase 1 modernization)

## Decision (the rule)

Build with **Electron Forge 7 + `@electron-forge/plugin-vite`**. Keep Forge's maker pipeline (Squirrel installer for Windows) and swap Webpack for Vite. Standardize on **vite 8** + `@vitejs/plugin-react@6`.

## What was rejected ("no, that's wrong")

- **Electron Forge 7 + Webpack 5** — lowest churn, but slower dev loop and keeps an older toolchain we'd replace anyway.
- **electron-vite + electron-builder** — best DX, but replaces Forge entirely and forces re-authoring the Windows installer config from scratch (largest blast radius).
- The prior stack — `electron-forge@6.0.0-beta.54` with `plugin-webpack` (Webpack 4), Babel, and bespoke `webpack.*.config.js` — no longer installs/builds cleanly on Node 24 and is slow to iterate.

## Why

The owner's top product goal is **startup speed** plus general modernization, with a clean runway to TypeScript. Forge + Vite gives fast dev cold-start + HMR, TS-native transforms, and minimal packaging risk because Forge still owns `make`/`package`.

## How to honor it

- Config ported verbatim from the official Forge **vite-typescript** template to wire the magic constants (`MAIN_WINDOW_VITE_DEV_SERVER_URL`, `MAIN_WINDOW_VITE_NAME`) and electron/node-builtin externalization.
- `forge.config.ts` recreates makers (Squirrel/zip/deb/rpm) and adds template **Fuses** hardening (`RunAsNode:false`, `OnlyLoadAppFromAsar:true`, ASAR integrity).
- `index.html` lives at project root with `<script type="module" src="/src/renderer.js">`.
- Entries stay `.js` (`src/main.js`, `src/preload.js`, `src/renderer.js`); `tsconfig` uses `allowJs:true`.
- `@electron-forge/plugin-vite@7.11.2` is vite-version-agnostic. Fallback if vite 8 trips the plugin: `vite@7` + `@vitejs/plugin-react@5.0.4`.
- Removed: `webpack.*.config.js`, `webpack.rules.js`, `babel.config.js`, `.browserslistrc`, `nodemon.json`, `config/`, old `forge.config.js`.

## Evidence

Original ADR `docs/research/0001-build-toolchain.md`. Owner: *"electron forge uses vite right? so forge 7 + vite plugin seems like the correct path… we should also add TS."* Version compatibility verified 2026-06-02.

## Related

- [[2026-06-02-typescript-tooling-now-convert-later]]
- [[2026-06-02-electron-security-contextisolation-preload]]
