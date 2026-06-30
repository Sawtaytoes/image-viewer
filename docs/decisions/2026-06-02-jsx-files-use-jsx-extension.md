# 2026-06-02 — Give JSX-bearing files the `.jsx` extension

- **Status:** Locked
- **Date:** 2026-06-02
- **Deciders:** Kevin (owner) + agent
- **Source:** Migrated from `docs/research/0007-jsx-file-extensions.md` (Phase 1 modernization)

## Decision (the rule)

Rename every JSX-bearing file from `.js` to `.jsx`. Pure-logic files (hooks, reducers, epics, contexts, utilities, `main.js`, `preload.js`, tests) stay `.js`.

## What was rejected ("no, that's wrong")

- The original convention of putting JSX inside `.js` files (Babel didn't care about the extension).
- Configuring the bundler to treat `.js` as JSX via an oxc/esbuild loader override — fragile across Vite 8 / oxc / plugin-react versions, and the override must be repeated for Vite, Vitest, and tsc.

## Why

The modern toolchain rejects JSX in `.js`: **Vite 8** transforms with **oxc** (replaced esbuild) and `@vitejs/plugin-react@6` only auto-processes `.jsx`/`.tsx`, so a `.js` file with JSX falls through to oxc and fails with a parse error (`vite:oxc … DeleteForeverIcon.js`), breaking both `vite` and `vitest`. **`tsc`** also refuses JSX in `.js` regardless of `checkJs` (parse error, not type error). Renaming is the idiomatic fix, works with every tool zero-config, and is a natural stepping stone to the later `.jsx → .tsx` conversion.

## How to honor it

- Renamed the **26** JSX files (components, providers, the four icons, `renderer.js`) to `.jsx`.
- Imports are extensionless (`import App from "./App"`), so no import statements changed — Vite resolves `.jsx` automatically.
- Only extension-specific reference updated: `index.html` → `<script src="/src/renderer.jsx">`.
- `forge.config.ts` entries `src/main.js` / `src/preload.js` are unchanged (no JSX there).
- The JSX file list was derived mechanically: `grep -rlE "/>|</[A-Za-z]" --include="*.js" src`.

## Evidence

Original ADR `docs/research/0007-jsx-file-extensions.md`. This is **not** the TypeScript conversion — just the correct extension for files containing JSX.

## Related

- [[2026-06-02-typescript-tooling-now-convert-later]]
- [[2026-06-02-build-toolchain-electron-forge-vite]]
