# 0004 — TypeScript strategy: tooling now, source conversion later

- **Status:** Accepted (Phase 1)
- **Date:** 2026-06-02
- **Deciders:** Kevin (owner) + agent.

## Context

The codebase is entirely `.js` (pre-TypeScript). The owner's kickoff: *"this is all JS… we'll wanna
fix that too **after** updating it to the latest."* In the build-tool answer they added: *"we should
also add TS though. I know it's useless right now, but we'll need to add it."*

These reconcile to: **stand up TypeScript tooling now; convert source files later.**

## Decision

- Add `tsconfig.json`, `@types/*`, and a TS-capable Vite/Forge setup in Phase 1.
- Set `allowJs:true` and `checkJs:false` so `.js` and `.ts` coexist and existing JS is not
  type-checked yet (avoids a flood of errors before conversion).
- Build/config files that are naturally TS (`forge.config.ts`, `vite.*.config.ts`, `forge.env.d.ts`)
  are authored in TS immediately; **application source under `src/` stays `.js`** until the dedicated
  conversion phase.
- `yarn typecheck` = `tsc --noEmit`; it is near-empty now and becomes meaningful as files convert.

## tsconfig shape

Based on mux-magic's `tsconfig.base.json` (strict, `target:ESNext`, `esModuleInterop`,
`skipLibCheck`, `isolatedModules`, `resolveJsonModule`) with these deltas for this repo:
- `allowJs:true`, `checkJs:false` (coexistence; mux-magic uses `allowJs:false`).
- `module:ESNext`, `moduleResolution:bundler`, `noEmit:true`.
- `jsx:react-jsx`, `jsxImportSource:@emotion/react` (Emotion css prop — see [0005](0005-icons-and-deps.md)).
- `lib:["DOM","DOM.Iterable","ESNext"]`, `types:["vite/client","node"]`.

## Module type

`package.json` stays CommonJS (no `"type":"module"`) to match the Forge vite-typescript template
and avoid converting every config file. Source uses ESM `import`/`export` syntax compiled by Vite;
package "type" does not affect that. ESLint flat config is therefore `eslint.config.mjs`.

## Out of scope here (later phase)

Renaming `src/**/*.js` → `.ts`/`.tsx`, adding types to props (currently `prop-types`), typing the
`window.api` bridge (a `src/preload.d.ts` / global `Window` augmentation), and flipping
`checkJs`/`strict` enforcement on the source tree.
