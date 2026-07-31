# TypeScript + Tailwind conventions

How renderer code is written in this repo after M6c. Read this before converting or
adding a file under `src/components/`. The milestone that produced it is
[`2026-07-31-m6c-typescript-and-tailwind.md`](2026-07-31-m6c-typescript-and-tailwind.md);
the settled calls behind individual rules are in [`decisions/`](decisions/).

## File extensions

| Contains | Extension |
| --- | --- |
| JSX | `.tsx` |
| Pure logic (hooks, reducers, epics, contexts, utilities, tests) | `.ts` |
| The Node-side programs `src/main.js`, `src/preload.js` | `.js`, for now |

There is no `.jsx` any more and no `.js` under `src/` except those two.
`tsconfig.json` sets `allowJs: false`, so a stray `.js` is a module `tsc` **cannot
resolve** — a hard error, not a silently-unchecked file. That is deliberate: the
previous setting (`allowJs: true`, `checkJs: false`) is what let a half-finished
conversion look green for a year.

Imports stay **extensionless** (`import App from "./App"`). Nothing in the tree names a
file extension in an import, so renaming a file never touches its callers.

## No `prop-types`

Props are a TypeScript type. The `propTypes` object, the `import PropTypes from
"prop-types"` and the `Component.propTypes = propTypes` line all go.

```tsx
interface PaneProps {
  isActive: boolean
  onSelect: (folderId: string) => void
}

const Pane = ({ isActive, onSelect }: PaneProps) => …
```

Write the type inline on the parameter, not `FC<PaneProps>`: `FC` adds an implicit
`children` that most of these components do not take, and it is the reason a component
that forgot to render `children` never failed anything.

`children` is `ReactNode` and is declared like any other prop.

## No Emotion

There is no `css` prop, no `styled`, no `<Global>` and no `@emotion/*` import. Styling is
Tailwind utilities on `className`.

```tsx
// before
const rowStyles = css`
  align-items: center;
  background-color: #2b2b2b;
  display: flex;
  gap: 8px;
`
<div css={rowStyles} />

// after
<div className="flex items-center gap-2 bg-surface-sunken" />
```

### Where a utility cannot go

Three cases, in order of preference:

1. **A value computed at runtime** — a measured width, a per-item transform, a
   fixture colour — is an inline `style={{ … }}`. Tailwind generates classes by scanning
   **source text**, so `w-[${width}px]` produces no CSS at all: it compiles, it renders,
   and the element has no width. There is no error and no failing test. This is the single
   most likely way to break a conversion.
2. **A runtime value several utilities read** is a CSS custom property in `style`, with
   the utilities reading it: `style={{ "--tile-size": \`${size}px\` }}` plus
   `className="w-(--tile-size) h-(--tile-size)"`. Needs
   `as CSSProperties` on the object, because React's `CSSProperties` has no index
   signature for custom properties.
3. **A selector no utility can express** — `::-webkit-scrollbar`, `@font-face` — is a rule
   in `src/styles/tailwind.css`. Keep this list short; it is the part of the app Tailwind
   cannot see.

### Colours come from tokens, never a hex

`src/styles/tailwind.css` imports `@charcuterie/tokens/theme.css`, which publishes the
palette into Tailwind's own `--color-*` namespace. So `bg-surface-raised` and
`text-content-muted` are **ours** and answer to `data-scheme` / `data-variant` /
`data-density` on `<html>`.

The map used by the M6c conversion, so a later reader can tell a deliberate colour from a
drifted one:

| Was | Is | Notes |
| --- | --- | --- |
| `#fafafa`, `#fff`, `#ffffff` (text) | `text-content-primary` | |
| `#d6d6d6`, `#cfcfcf` | `text-content-secondary` | |
| `#aaa`, `#999`, `#888` | `text-content-muted` | |
| `#777`, `#666` (disabled text) | `text-content-disabled` | |
| `#2b2b2b`, `#222` (page/base chrome) | `bg-surface-sunken` | |
| `#333`, `#3a3a3a`, `#3d3d3d` (raised chrome) | `bg-surface-raised` | |
| `rgba(34,34,34,.95)`, `rgba(51,51,51,.9…)` (bars, menus) | `bg-surface-overlay` | Opaque now — see the milestone doc. |
| `#444`, `#555` (borders/rules) | `border-border-default` / `border-border-strong` | |
| `rgba(255,255,255,0.08…0.15)` (hover wash) | `hover:bg-intent-neutral-surface-hover` | |
| `#2a6f97`, `#3d9be0`, `#61a5c2` (selected/active) | `bg-intent-accent-solid` etc. | **Hue changes.** [Decision](decisions/2026-07-31-selection-blue-becomes-the-accent-intent.md). |
| `red` (destructive button) | `bg-intent-danger-solid` | |
| `green` (confirm button) | `bg-intent-success-solid` | |
| `#ff8a80`, `rgba(255,138,128,.15)` (error text/wash) | `text-intent-danger-content` / `bg-intent-danger-surface` | |
| `rgba(0,0,0,0.4…0.72)` (modal scrim) | `bg-scrim` | The scrim is its own token role. |

`'Source Sans Pro', sans-serif` on a control becomes **nothing**: `<body>` sets
`font-family: var(--font-sans)` and every control inherits it. The reason twelve
components each restated the family is that a `<button>` does not inherit `font-family`
from its ancestor by UA default — Tailwind's Preflight sets `font: inherit` on form
elements, which fixes it once for the whole app. See
[`2026-06-20-app-font-is-source-sans-pro-everywhere`](decisions/2026-06-20-app-font-is-source-sans-pro-everywhere.md);
if a control ever renders in Times again, that Preflight rule is the thing to check.

### Sizes: keep the pixels this phase

The type ramp (`text-sm`, `text-lg`) and the control sizes are **density-aware**, and
`<html>` pins `data-density="comfortable"`. A control that was `font-size: 16px` becomes
`text-[16px]`, not `text-lg` — the two are not the same number, and swapping them changes
every control at once with no way to tell an intended change from a regression. Adopting
the ramp is phase 2's, along with `@charcuterie/ui` and `data-density="kiosk"`.

Spacing is the exception: Tailwind's `--spacing` is `0.25rem`, so `gap: 8px` **is**
`gap-2` exactly. Use the scale for multiples of 4px and an arbitrary value otherwise.

## Lint rules that only fire on TypeScript

`eslint.config.mjs` scopes four rules to `**/*.{ts,tsx}`. Before the conversion there
were eleven such files, all of them config or types, so these have effectively never run
on app code. They will fire now.

- **`id-length` (min 2).** No single-letter identifiers, including callback parameters.
  `(e) => …` is `(event) => …`; `.map((f) => …)` is `.map((file) => …)`. Only `_` and `$`
  are exempt.
- **`@typescript-eslint/naming-convention`, `is`/`has` prefix on booleans.** Any variable,
  parameter, type property or class property whose **type** is `boolean`. This is
  type-driven, so it fires on inferred booleans too. Names beginning `_` are exempt. It is
  a workspace-wide rule, not this repo's own idea.
- **`react/no-multi-comp`.** One component per file, `ignoreStateless: false`. Three files
  broke this and were split in M6c; see the milestone doc.
- **`react-hooks/rules-of-hooks`** — already ran on `.jsx`, still runs.

## Real types, not escape hatches

[`2026-06-03-typescript-conversion-uses-real-types`](decisions/2026-06-03-typescript-conversion-uses-real-types.md)
is locked: generics and correct DOM types, **not** `as` / `any` / `unknown`.

- A handler is `PointerEventHandler<HTMLDivElement>`, not `(event: PointerEvent) => void`
  — React's synthetic event is not the DOM one, and the second form typechecks while
  being wrong about `currentTarget`.
- A ref is `useRef<HTMLImageElement>(null)`, and the null check is real code, not `!`.
- `window.api` is fully typed by `src/preload.d.ts`. If a call site needs a cast, the
  declaration is wrong — fix the declaration. It has been wrong before: the typed
  `vitest.setup.ts` found three whole members `preload.js` exposes that the types had
  never heard of.

## What is deliberately NOT adopted

- **`@charcuterie/biome-config` and `@charcuterie/eslint-config`.** Neither rip-deck nor
  castkit nor mux-magic depends on them; every consumer carries its own `biome.json` and
  `eslint.config.mjs`. Adopting them here would make this the only app in the fleet that
  does, and would silently swap this repo's `lineWidth: 60` and its `useKeyWithClickEvents`
  / `noStaticElementInteractions` exemptions — which exist because this is a
  touch-first app whose surfaces are deliberately not buttons.
- **Logical properties (`ps-`/`pe-`, `start-`/`end-`).** Charcuterie enforces them and
  `@charcuterie/ui` is written in them, so the components arriving in phase 2 are already
  correct. Rewriting this app's own `left`/`right` in the same pass as the Emotion swap
  would put two unrelated changes in one diff on a single-locale Electron app.
