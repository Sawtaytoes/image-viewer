# 0007 — Rename JSX files from `.js` to `.jsx`

- **Status:** Accepted (Phase 1)
- **Date:** 2026-06-02
- **Deciders:** agent (forced by the toolchain), flagged for review.

## Context

The original codebase put JSX inside `.js` files (Babel didn't care about the extension). Two pieces
of the modern toolchain reject JSX in `.js`:

1. **Vite 8** transforms with **oxc** (it replaced esbuild). `@vitejs/plugin-react@6` only auto-processes
   `.jsx`/`.tsx`; a `.js` file containing JSX falls through to oxc, which fails with a parse error
   (`vite:oxc … DeleteForeverIcon.js`). This broke both `vite` builds and `vitest`.
2. **`tsc`** also refuses JSX in `.js` regardless of `checkJs` (it's a parse error, not a type error).

## Options considered

1. Configure the bundler to treat `.js` as JSX (oxc/esbuild loader override). Fragile across Vite 8 /
   oxc / plugin-react versions and has to be repeated for Vite, Vitest, and tsc.
2. **Rename every JSX-bearing file to `.jsx`** *(chosen)*. The idiomatic fix, works with every tool
   with zero config, and is a natural stepping stone to the later `.jsx → .tsx` conversion.

## Decision

Renamed the 26 JSX files (components, providers, the four icons, `renderer.js`) to `.jsx`. Pure-logic
files (hooks, reducers, epics, contexts, utilities, `main.js`, `preload.js`, tests) stay `.js`.

## Notes

- Imports are extensionless (`import App from "./App"`), so no import statements changed — Vite
  resolves `.jsx` automatically.
- The only extension-specific reference updated: `index.html` → `<script src="/src/renderer.jsx">`.
- `forge.config.ts` entries `src/main.js` / `src/preload.js` are unchanged (no JSX there).
- This is **not** the TypeScript conversion (that's a later phase, [0004](0004-typescript-strategy.md));
  it's just the correct extension for files that contain JSX.
- The JSX file list was derived mechanically: `grep -rlE "/>|</[A-Za-z]" --include="*.js" src`.
