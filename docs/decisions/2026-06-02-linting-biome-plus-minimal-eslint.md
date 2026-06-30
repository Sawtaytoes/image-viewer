# 2026-06-02 — Lint and format with Biome + minimal ESLint

- **Status:** Locked
- **Date:** 2026-06-02
- **Deciders:** Kevin (owner) + agent
- **Source:** Migrated from `docs/research/0003-linting-and-formatting.md` (Phase 1 modernization)

## Decision (the rule)

Adopt **Biome 2** as the primary formatter + linter, with a **minimal ESLint flat config** for the few rules Biome can't express — both copied from `mux-magic` and adapted to this single-package repo. Accept Biome's output as the new house style.

## What was rejected ("no, that's wrong")

The owner's old private `@ghadyani-eslint/*` config on ESLint 7, run via the now-removed `eslint-loader`, which enforced an unusual hyper-"vertical" formatting style. Owner: *"stop using my old, custom ESLint library."* Biome will **not** reproduce that hand-formatting; the large reformat diff is expected (`lineWidth:60` keeps it close in spirit).

## Why

ESLint 9/10 plus the loss of `eslint-loader` break the old setup. `mux-magic` already has a working Biome + minimal-ESLint stack to copy, minimizing invention.

## How to honor it

- Copied verbatim: `biome.json` (2-space, `lineWidth` 60, double quotes, `semicolons:asNeeded`, `trailingCommas:all`, `arrowParentheses:always`, recommended rules, `vcs.useIgnoreFile`), `.editorconfig`, script names (`lint:biome`, `lint:biome-format`, `lint:eslint`, `lint:eslint-format`, `lint`, `typecheck`, `test`).
- Adapted: dropped mux-magic monorepo rules (`import-x/no-barrel-files`, `packages/web` `no-restricted-syntax`, `packages/**` scoping); kept `id-length` (exceptions `_`, `$`), `@typescript-eslint/naming-convention` (booleans `is`/`has`), `react-hooks` recommended, `react/no-multi-comp`. ESLint config is `eslint.config.mjs` (this repo is CommonJS).
- **Dropped `--unsafe`** from `lint:biome-format`: Biome's unsafe `useArrowFunction` rewrote `createActionCreator`/`createNamespaceActionCreator` `function` exprs into arrows, breaking `.prototype.toString` and crashing at module load. Restored `function` form; disabled `complexity/useArrowFunction`.
- Disabled rules firing on intentional legacy patterns: `a11y/useKeyWithClickEvents`, `a11y/noStaticElementInteractions` (touch-first clickable `<div>`s), `performance/noAccumulatingSpread` (Redux reduce at module load).
- ESLint runs `react-hooks` on `.js/.jsx` too; deleted 4 dead SSR files (`Html`, `ReactRenderTarget`, `ConfigContext`, `ConfigContextProvider`).
- Versions: `@biomejs/biome@^2`, `eslint@^10`, `typescript-eslint@^8`, `eslint-plugin-react@^7.37`, `eslint-plugin-react-hooks@^7.1`.

## Evidence

Original ADR `docs/research/0003-linting-and-formatting.md`. Owner: *"mux-magic uses Biome and ESLint. Copy whatever's in there and let's stop using my old, custom ESLint library."*

## Related

- [[2026-06-02-typescript-tooling-now-convert-later]]
- [[2026-06-02-inline-svg-icons-drop-mui]]
