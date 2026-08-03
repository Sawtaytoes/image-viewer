# 2026-07-31 — Styling is Tailwind v4 on `@charcuterie/tokens`, not Emotion

- **Status:** Locked
- **Date:** 2026-07-31
- **Deciders:** Kevin (owner) + agent
- **Source:** charcuterie milestone M6c; `charcuterie/docs/2026-07-31-m6a-the-p1-components.md` §"What M6 turned out to be"; branch `feat/m6c-typescript-tailwind`

## Decision (the rule)

The renderer is styled with **Tailwind v4 utilities on `className`**, reading colours, radii,
motion and the type ramp from **`@charcuterie/tokens`**. There is no Emotion — no `css` prop,
no `styled`, no `<Global>`, no `@emotion/*` dependency. Colours come from tokens; a hex
literal in a component is a bug.

The three Charcuterie axes live on `<html>` in `index.html`: `data-scheme="dark"`,
`data-density="comfortable"`, and `data-variant` omitted because `daylight` is the default.

## What was rejected ("no, that's wrong")

- **Keeping Emotion and consuming Charcuterie's tokens through it.** Mechanically possible —
  the tokens are CSS custom properties and a `css` block can read a `var()`. It is the wrong
  answer because `@charcuterie/ui`'s components are Tailwind classes, so the app would carry
  two styling systems the moment phase 2 lands, and Tailwind's `@source` scanning would still
  be needed for the component package. The whole point of the milestone is that image-viewer
  **cannot consume `@charcuterie/ui` until it is TypeScript + Tailwind**.
- **Reproducing the app's exact greys as a custom Tailwind theme.** That keeps the pixels and
  throws away the reason for the swap: a hardcoded hex is a decision no attribute can revisit,
  which is exactly why this app could never have a light scheme.
- **`@charcuterie/tokens/fonts.css`.** It ships Baloo 2 / Outfit / Victor Mono. Source Sans
  Pro is a locked decision here, so `--font-sans` is overridden in
  `src/styles/tailwind.css` and the tokens' font stylesheet is never imported.

## Why

M6 surveyed the fleet and found the component layer reaches React + Tailwind consumers and
nothing else. image-viewer was React 19 already; `.jsx` and Emotion were the whole gap. Kevin's
call was to modernize it — *"modernize image-viewer, plex-channels and gallery-downloader to
React + Tailwind so they can consume the library"*.

The second reason is the one the migration proved: the twenty-four Emotion blocks held **38
distinct colour literals**, and every one of them was a decision no attribute could revisit.
The app is dark because it is *painted* dark, not because it *chose* dark.

## How to honor it

- Colours are `bg-surface-*` / `text-content-*` / `border-border-*` / `bg-intent-<name>-*`.
  The hex→token map used by the conversion is in
  [`docs/typescript-and-tailwind-conventions.md`](../typescript-and-tailwind-conventions.md);
  follow it rather than picking a token by eye, so a later reader can tell a deliberate change
  from a drifted one.
- **A runtime-computed value never goes in a class.** Tailwind generates CSS by scanning
  source text, so `` className={`w-[${size}px]`} `` produces no CSS at all — it compiles, it
  renders, and the element has no width, with no error and no failing test. Computed values go
  in an inline `style`, or in a CSS custom property that a utility reads.
- `src/styles/tailwind.css` is the renderer's **one** stylesheet and `src/renderer.tsx` is the
  only module allowed to import it.
- Rules a utility genuinely cannot express — `::-webkit-scrollbar`, `@font-face` — live in
  that stylesheet. Keep that list short; it is the part of the app Tailwind cannot see.
- **Phase 2** adds `@import "@charcuterie/ui/styles.css"` and, critically,
  `@source "../../node_modules/@charcuterie/ui/dist"`. Without the `@source` every shared
  component renders unstyled, silently.

## Evidence

> "modernize image-viewer, plex-channels and gallery-downloader to React + Tailwind so they can
> consume the library" — Kevin, recorded in charcuterie's M6a handoff

> "The goal of Charcuterie is having reusable logic and components that expand as we build
> higher level components." — Kevin, M5

## Related

[[2026-07-31-selection-blue-becomes-the-accent-intent]] ·
[[2026-07-31-the-renderer-is-typescript]] ·
[[2026-06-20-app-font-is-source-sans-pro-everywhere]] ·
[[2026-06-30-self-host-fonts-locally]]
