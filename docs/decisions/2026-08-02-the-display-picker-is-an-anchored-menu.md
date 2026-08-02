# 2026-08-02 — The display picker is an anchored menu, not a centred sheet

- **Status:** Locked
- **Date:** 2026-08-02
- **Deciders:** Kevin (owner) + agent
- **Source:** charcuterie M6c phase 2; commit removing `DisplayPickerPopover.tsx`

## Decision (the rule)

The "open a new window on another display" picker is `@charcuterie/ui`'s `Menu`,
anchored under the chrome bar's display button
(`imageViewer/useDisplayMenuItems` + `RevealableChrome`). It is **not** a
full-viewport scrim with a centred sheet any more, and `DisplayPickerPopover` is
deleted rather than kept alongside.

## What was rejected ("no, that's wrong")

Two things.

**Keeping the hand-rolled centred sheet** because it was bigger and therefore
"more touch-friendly". Size is what `data-density="kiosk"` is for; the rows are
44px+ targets at kiosk density, which is the documented minimum, and a menu that
hangs off the control that opened it says *where it came from* in a way a
sheet floating over the image does not.

**Treating this as the same case as the folder picker.**
[gallery-and-folder-picker-stay-in-the-pane](2026-06-04-gallery-and-folder-picker-stay-in-the-pane.md)
forbids a top-layer/portalled panel — but it is about the **folder** picker
staying inside its column. This menu was always deliberately the opposite: it is
summoned from the chrome bar and floats above the whole viewer, because the
window it spawns is not any one pane's business. Applying the folder-picker rule
here would be reading the decision by its component name instead of its subject.

## Why

`Menu` brings three things the hand-rolled sheet never had: roving focus with
Arrow/Home/End, a real `role="menu"` / `role="menuitem"` tree, and dismissal
that a keyboard can reach. The sheet was a `<div>` of `<button>`s with an Escape
listener.

The hover-identify behaviour — pointing at a row lights up that physical
monitor — is the entire reason the menu exists, and it survives. `MenuItem` has
no pointer hooks, so the handlers ride on the `label` node with negative margins
cancelling `MenuAction`'s padding, and the glyph is rendered *inside* the label
rather than passed as `MenuItem`'s `icon` so it is not a hole in the hover
region.

## How to honor it

- The rows live in `useDisplayMenuItems`, not in a component. Adding a row means
  adding a `MenuItem`, and anything that must react to *hover* has to go inside
  the `label` node — `MenuItem` has no `onPointerEnter`.
- The empty state is a **disabled row**, not an empty panel: `role="menu"` with
  no children is announced as "menu, 0 items", which reads as a bug.
- `window.api.stopIdentifyDisplay()` is called explicitly in `onSelect`. Do not
  remove it as redundant with `onPointerLeave` — the menu unmounts under the
  pointer, so the leave event is not guaranteed and the overlay would stay lit
  on a real monitor.
- **Do not put a `Tooltip` on the trigger.** `Menu` and `Tooltip` cannot share
  one in `@charcuterie/ui@0.2.0`; see the M6c phase-2 handoff for why, and note
  that `Menu` takes the button's `aria-label` as the whole menu's accessible
  name via `aria-labelledby`.

## Evidence

Phase-1 work order: *"`Menu` … the same shape twice: scrim, pop-in panel,
icon+label rows, Esc and backdrop dismiss."* The shape survey was right that
these were menus; it did not know `Menu` would place its panel in the top layer,
which is what separates this site from the folder picker.

Verified in the running app under Xvfb: menu open, anchored `bottom-end` under
the display button, focus on the first `menuitem`, showing the real display
("Display 1 — 1600×1000 · primary").

## Related

- [[2026-08-02-three-work-order-sites-keep-their-own-component]]
- [[2026-06-04-gallery-and-folder-picker-stay-in-the-pane]]
- [[2026-06-03-touch-first-is-the-whole-point]]
