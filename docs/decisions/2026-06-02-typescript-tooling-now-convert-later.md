# 2026-06-02 — Stand up TypeScript tooling now, convert source later

- **Status:** Locked
- **Date:** 2026-06-02
- **Deciders:** Kevin (owner) + agent
- **Source:** Migrated from `docs/research/0004-typescript-strategy.md` (Phase 1 modernization)

## Decision (the rule)

Stand up TypeScript **tooling** in Phase 1 (`tsconfig.json`, `@types/*`, TS-capable Vite/Forge), but **convert application source under `src/` later**. Set `allowJs:true` and `checkJs:false` so `.js` and `.ts` coexist and legacy JS is not yet type-checked.

## What was rejected ("no, that's wrong")

Converting `src/**/*.js` → `.ts`/`.tsx` and turning on `checkJs`/`strict` now — which would unleash a flood of type errors before any conversion work, blocking the modernization. Also rejected: not adding TS at all (the codebase is entirely pre-TypeScript `.js`).

## Why

The owner wanted both: *"this is all JS… we'll wanna fix that too after updating it to the latest"* and *"we should also add TS though. I know it's useless right now, but we'll need to add it."* These reconcile to: tooling now, conversion later.

## How to honor it

- Build/config files that are naturally TS — `forge.config.ts`, `vite.*.config.ts`, `forge.env.d.ts` — are authored in TS immediately; **application source under `src/` stays `.js`** until the dedicated conversion phase.
- `yarn typecheck` = `tsc --noEmit` (near-empty now, grows as files convert).
- `tsconfig` based on mux-magic's `tsconfig.base.json` (strict, `target:ESNext`, `esModuleInterop`, `skipLibCheck`, `isolatedModules`, `resolveJsonModule`) with deltas: `allowJs:true`, `checkJs:false`, `module:ESNext`, `moduleResolution:bundler`, `noEmit:true`, `jsx:react-jsx`, `jsxImportSource:@emotion/react`, `lib:["DOM","DOM.Iterable","ESNext"]`, `types:["vite/client","node"]`.
- `package.json` stays CommonJS (no `"type":"module"`) to match the Forge template; ESLint flat config is `eslint.config.mjs`.
- Out of scope here (later phase): renaming `src/**/*.js`→`.ts`/`.tsx`, typing props (currently `prop-types`), typing `window.api` (`src/preload.d.ts` / `Window` augmentation), flipping `checkJs`/`strict` on source.

## Evidence

Original ADR `docs/research/0004-typescript-strategy.md`, quoting the owner's kickoff and build-tool conversation verbatim.

## Related

- [[2026-06-02-build-toolchain-electron-forge-vite]]
- [[2026-06-02-jsx-files-use-jsx-extension]]
- [[2026-06-02-inline-svg-icons-drop-mui]]
