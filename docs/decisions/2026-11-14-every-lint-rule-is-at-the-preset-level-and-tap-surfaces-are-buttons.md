# 2026-11-14 — Every lint rule is at the preset's level, and a tap surface is a real button

- **Status:** Locked
- **Date:** 2026-11-14
- **Type:** Tooling / Accessibility
- **Supersedes:** In part, [[2026-06-02-linting-biome-plus-minimal-eslint]]: its bullet that turns off
  `a11y/useKeyWithClickEvents`, `a11y/noStaticElementInteractions`, and
  `performance/noAccumulatingSpread`.
- **Superseded by:** —
- **Deciders:** Kevin (owner) + agent
- **Source:** Owner, 2026-11-14, on the fleet's lowered lint rules; the 2026-11-14 fleet change that
  made a lint warning fail CI (this repo's #58)

## Decision (the rule)

`biome.json` lowers no rule from `@charcuterie/biome-config`, and `eslint.config.mjs` sets
`react-hooks/exhaustive-deps` to `error`, the level Biome's preset gives the same check
(`correctness/useExhaustiveDependencies`). Anything a user taps is a real `<button>`, never a
clickable `<div>`.

## Context

On 2026-11-14 the fleet made a lint warning fail CI (#58 here). The rules that `biome.json` and
`eslint.config.mjs` still lowered were left for a follow-up: three Biome rules off, and
`react-hooks/exhaustive-deps` at `warn`. All four came from the Phase 1 modernization on
2026-06-02.

## What was rejected ("no, that's wrong")

Keeping the three Biome rules off and `exhaustive-deps` at `warn` because the app is Electron and
touch-first. Electron is not a reason: the renderer is a Chromium page, and a screen reader, a
keyboard, and Windows' accessibility tree read it as they read any web page. The rules were turned
off on 2026-06-02 (`d7fcb47`, "Phase 1: modernize build") so the upgrade could keep its legacy
clickable `<div>`s unchanged, with "real keyboard accessibility" left as a roadmap item. That
reason was about the size of the upgrade, not about the platform.

## Why

The owner, 2026-11-14, about the rules that were still lowered: *"Those are Electron-based, and
that might be why right?"* The history answers no for every one of them:

| Rule | Lowered | Reason then | Platform reason? |
| --- | --- | --- | --- |
| `a11y/useKeyWithClickEvents` | `d7fcb47`, 2026-06-02 | touch-first clickable `<div>`s, kept for parity | No |
| `a11y/noStaticElementInteractions` | `d7fcb47`, 2026-06-02 | the same `<div>`s | No |
| `performance/noAccumulatingSpread` | `d7fcb47`, 2026-06-02 | a Redux `{...state}` reduce at module load | No; that code is gone and the rule has no finding |
| `react-hooks/exhaustive-deps` at `warn` | `d7fcb47`, 2026-06-02 | copied from the plugin's recommended set via mux-magic | No; it has no finding |

A `<button>` puts each tile in the accessibility tree with a role and a name, and Enter or Space
on it does what a tap does. Pointer input is unchanged: Tailwind's preflight strips a button's
background, border, and padding, and the class strings add `block` and `text-left` where a
button's defaults differ from a `<div>`'s.

## How to honor it

- Sixteen findings, eight elements, all fixed as buttons: the home gallery's folder and image
  tiles (`fileBrowser/Directory.tsx`, `fileBrowser/ImageFile.tsx`), the in-pane gallery's tiles
  (`imageViewer/PaneGalleryFolderTile.tsx`, `imageViewer/PaneGalleryImageTile.tsx`), the
  viewer's center zone (`imageViewer/ImageView.tsx`), the empty pane
  (`imageViewer/EmptyPaneAffordance.tsx`), the folder menu's backdrop
  (`imageViewer/FolderPickerPopover.tsx`), and the folder tab (`workspace/FolderTab.tsx`).
- **A button keeps focus after a click, and Enter on a focused button clicks it.** The window
  shortcuts already own Enter: the home gallery opens its keyboard selection, and the viewer
  leaves. Each new button carries `data-tap-surface`, and a shortcut that handles Enter asks
  `getTapSurfaceFocus(event)` how the user reached that surface. If the user tabbed to it and
  has not pressed it with a pointer since, the shortcut stands aside and Enter clicks the
  surface. In every other case (a tap left it focused, or code such as a closing dialog put
  focus back on it), the shortcut runs and calls `preventDefault()`, which cancels the button's
  click, so Enter does what it did when these were `<div>`s. `:focus-visible` cannot make this choice: Chromium makes the focused
  element match it on any key press, before `keydown` listeners run. Space, which no shortcut
  uses, always clicks the focused surface. A new tap surface gets the attribute too.
- The home gallery's image tile is named by its file name (`aria-label`), because `Image` draws
  its `<img>` with no `alt`.
- A click from the keyboard has `detail` 0 and no pointer position. `getTapPoint` returns no point
  for it, so the center zone and the empty pane open the menu without a tap ripple, as the `Q`
  shortcut does.
- The folder tab cannot be one button, because its close button cannot sit inside another button.
  Its select button's `::before` stretches over the whole tab, so a tap anywhere on the tab still
  selects it.
- The menu's backdrop is a `<button>` under the menu, with `tabIndex={-1}`, because Escape already
  closes the menu from the keyboard.
- Do not turn a rule off for a file or a folder. A per-line suppression is allowed only for a shape
  that something outside this repo fixes, with that contract in its reason.

## Evidence

- `biome check` with the three rules on, before the fix: 16 errors (the two a11y rules on eight
  elements) and 0 from `noAccumulatingSpread`. `eslint .` with `exhaustive-deps` at `error`: 0.
- After: 0 Biome and 0 ESLint findings. The VRT capture (`scripts/vrtCapture.mjs`, 28 shots) of
  this change matches `master` byte for byte, and so do shots of the open folder menu and the
  in-pane gallery. The new pixels are the browser's focus ring when a keyboard focuses a tile.

## Related

- [[2026-06-02-linting-biome-plus-minimal-eslint]]
- [[2026-11-13-main-and-preload-are-typescript]]
