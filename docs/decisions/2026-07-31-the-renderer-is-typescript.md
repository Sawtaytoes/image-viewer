# 2026-07-31 — The renderer is TypeScript; `allowJs` is off

- **Status:** Locked
- **Date:** 2026-07-31
- **Deciders:** Kevin (owner) + agent
- **Source:** charcuterie milestone M6c, branch `feat/m6c-typescript-tailwind`. Completes [[2026-06-02-typescript-tooling-now-convert-later]], which deferred exactly this.

## Decision (the rule)

Every file under `src/` is `.ts` or `.tsx`, except the two Node-side programs `src/main.js`
and `src/preload.js`. `tsconfig.json` sets **`allowJs: false`**, and `checkJs` is gone with it.

`prop-types` is not used. Props are TypeScript types, written inline on the parameter.

## What was rejected ("no, that's wrong")

- **Leaving `allowJs: true` after the conversion**, on the reasonable-sounding grounds that
  `main.js` and `preload.js` still exist. It is the wrong default: with `allowJs` on, a `.js`
  file that slips back under `src/components/` is *silently unchecked*, and a half-finished
  conversion looks green. With it off, the same file is a module `tsc` cannot resolve — a
  hard error at the first import. The two survivors are excluded by name instead.
- **Keeping `prop-types` alongside the types**, "for runtime checking". It is a second
  declaration of the same facts that only disagrees with the first.
- **An `any`-heavy conversion.** Already settled by
  [[2026-06-03-typescript-conversion-uses-real-types]] and re-confirmed here: generics and
  real DOM types, not `as` / `any` / `unknown`.

## Why

The 2026-06-02 decision stood up TypeScript tooling and deferred the source conversion, with
`allowJs: true` / `checkJs: false` so `.js` and `.ts` could coexist. That was correct then and
it expired the moment the conversion actually happened — leaving it on preserves the exact
loophole the milestone closed.

The immediate payoff was not theoretical. Typing `vitest.setup.ts` as the real `Window["api"]`
found that `preload.d.ts` had never been told about `fullScreen`, `searchFolders`, or the four
saved-queue members `preload.js` had been exposing for weeks, and that the test stub was
missing `readImageData` entirely.

## How to honor it

- JSX goes in `.tsx`, pure logic in `.ts`. Imports stay **extensionless**, so renaming a file
  never touches its callers.
- `window.api` is fully typed by `src/preload.d.ts`. **If a call site needs a cast, the
  declaration is wrong** — fix the declaration, not the call site. It has been wrong before.
- Four ESLint rules are scoped to `**/*.{ts,tsx}` and had effectively never run on app code:
  `id-length` (min 2), the `is`/`has` boolean-name rule, `react/no-multi-comp`, and the
  react-hooks pair. They run on everything now.
- `main.js` and `preload.js` are the remaining work. They are Node-side, they are what
  `forge.config.ts` names as build entries, and converting them is a packaging risk that does
  not block `@charcuterie/ui`. See the M6c handoff for what it will take.

## Evidence

> "we should also add TS though. I know it's useless right now, but we'll need to add it."
> — Kevin, kickoff, quoted in [[2026-06-02-typescript-tooling-now-convert-later]]

> "convert this to TypeScript without depending on a bunch of `as` and `any`, and `unknown`…
> use generics… PointerEventHandler instead of `event: PointerEvent`." — Kevin, chat 61528c25

## Related

[[2026-06-02-typescript-tooling-now-convert-later]] ·
[[2026-06-03-typescript-conversion-uses-real-types]] ·
[[2026-06-02-jsx-files-use-jsx-extension]] ·
[[2026-07-31-styling-is-tailwind-on-charcuterie-tokens]]
