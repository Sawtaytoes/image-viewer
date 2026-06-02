# 0003 — Linting & formatting: Biome + minimal ESLint (drop @ghadyani-eslint)

- **Status:** Accepted (Phase 1)
- **Date:** 2026-06-02
- **Deciders:** Kevin (owner) + agent.

## Context

The repo used a private `@ghadyani-eslint/*` config (the owner's old personal config) on ESLint 7,
run through the now-removed `eslint-loader` inside Webpack. It enforced an unusual "vertical"
formatting style. ESLint 9/10 + the loss of `eslint-loader` break this setup.

## Decision

Owner: *"D:\Projects\Personal\mux-magic uses Biome and ESLint. Copy whatever's in there and let's
stop using my old, custom ESLint library."*

Adopt **Biome 2** as the primary formatter + linter, with a **minimal ESLint flat config** for the
few rules Biome can't express — copied from `mux-magic` and **adapted** from its monorepo layout to
this single-package repo.

## What was copied vs. adapted

Copied largely verbatim from mux-magic:
- `biome.json` — formatter (2-space indent, `lineWidth` 60, double quotes, `semicolons:asNeeded`,
  `trailingCommas:all`, `arrowParentheses:always`), recommended lint rules, `vcs.useIgnoreFile`.
- `.editorconfig`.
- Script names: `lint:biome`, `lint:biome-format`, `lint:eslint`, `lint:eslint-format`, `lint`,
  `typecheck`, `test`.

Adapted (mux-magic is a Yarn-4 ESM monorepo; this repo is a single package):
- **Dropped** mux-magic's monorepo-specific ESLint rules: `import-x/no-barrel-files`, the
  `packages/web` API-shape `no-restricted-syntax` rules, and the `packages/**` path scoping.
- **Kept** the generally-useful rules: `id-length` (spell names out; exceptions `_`, `$`),
  `@typescript-eslint/naming-convention` (booleans start with `is`/`has`),
  `react-hooks` recommended, and `react/no-multi-comp` (one component per file).
- ESLint config file named `eslint.config.mjs` (this package is CommonJS by default; see
  [0004](0004-typescript-strategy.md)); mux-magic uses `eslint.config.js` because it is `type:module`.

## Note on the old "vertical" style

Biome's formatter will **not** reproduce the old hyper-vertical hand-formatting. We accept Biome's
output as the new house style going forward (`lineWidth:60` keeps it fairly narrow, which is close
in spirit). The large reformat diff is expected and is applied with `yarn lint` (`biome check --write`).
Because there are no behavior changes in a format pass, this is safe; tests ([0004]) guard logic.

## Deviations forced by the legacy codebase

- **Dropped `--unsafe`** from `lint:biome-format` (mux-magic uses it). On this legacy code Biome's
  *unsafe* `useArrowFunction` autofix rewrote two `function` expressions
  (`createActionCreator`, `createNamespaceActionCreator`) into arrows — but those attach
  `.prototype.toString`, which arrows don't have. That throws at **module load**, crashing the app on
  launch (the production build doesn't catch it — it bundles, doesn't execute). Restored the `function`
  form and disabled `complexity/useArrowFunction`. Lesson: unsafe autofixes can change semantics; keep
  them off until the codebase is TypeScript and well-covered.
- **Disabled lint rules** (in `biome.json`), all because they fire on intentional legacy patterns we are
  preserving in this parity phase:
  - `a11y/useKeyWithClickEvents`, `a11y/noStaticElementInteractions` — the UI is **touch-first** and
    uses clickable `<div>`s throughout. Real keyboard-a11y is a tracked roadmap item, not a parity change.
  - `complexity/useArrowFunction` — see above (function-with-prototype action creators).
  - `performance/noAccumulatingSpread` — the standard Redux `{...state, [ns]: …}` reduce, run once at
    module load over 7 reducers (negligible).
- **ESLint** registers `react-hooks` for `.js/.jsx` too (not just `.ts/.tsx`) so the legacy inline
  `eslint-disable react-hooks/exhaustive-deps` directives resolve and `rules-of-hooks` is enforced;
  the `.js/.jsx` block enables JSX parsing (`ecmaFeatures.jsx`).
- Deleted 4 dead SSR-scaffolding files (`Html`, `ReactRenderTarget`, `ConfigContext`,
  `ConfigContextProvider`) that `App` never imported — they were the source of `dangerouslySetInnerHtml`
  / `useHtmlLang` lint errors.

## Versions (mirrors mux-magic's working set)

`@biomejs/biome@^2`, `eslint@^10`, `typescript-eslint@^8`, `eslint-plugin-react@^7.37`,
`eslint-plugin-react-hooks@^7.1`.
