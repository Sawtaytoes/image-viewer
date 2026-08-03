# 2026-08-02 — Three work-order sites keep their own component

- **Status:** Locked
- **Date:** 2026-08-02
- **Deciders:** Kevin (owner) + agent
- **Source:** charcuterie M6c phase 2; work order in
  [`docs/2026-07-31-m6c-typescript-and-tailwind.md`](../2026-07-31-m6c-typescript-and-tailwind.md)
  ("What phase 2 gets, itemised")

## Decision (the rule)

`imageViewer/FolderPickerPopover`, `fileBrowser/DateGroupedGrid` and
`workspace/FolderTabStrip` + `FolderTab` **stay hand-rolled**. They are named in
the phase-1 work order against `@charcuterie/ui`'s `Menu`, `Accordion` and
`Tabs`, and each was tried and rejected on evidence. Do not "finish the
migration" by adopting those three.

## What was rejected ("no, that's wrong")

Reading the work order as a checklist and adopting the component because the
table says so. The table was written by agents surveying markup shapes in phase
1, before `@charcuterie/ui@0.2.0` was on the registry and before anyone could
read its props. It is a **survey, not a specification** — it says "this looks
like a `Tabs`", and for these three it looks like one from the outside only.

## Why

Each fails for a reason that is not stylistic.

**`FolderPickerPopover` → `Menu`.** Three independent blockers, any one fatal:

1. `Menu`'s panel is `popover="manual"` and is shown with `showPopover()`, which
   puts it in the **top layer** — out of the pane entirely. That is the exact
   thing [gallery-and-folder-picker-stay-in-the-pane](2026-06-04-gallery-and-folder-picker-stay-in-the-pane.md)
   locks: *"Render the folder picker inside the panel container, not in a
   portal/modal."*
2. Its queued rows carry a trailing **remove-from-queue button**. A `<button>`
   inside a `role="menuitem"` button is invalid markup that browsers repair by
   hoisting it out, and `MenuItem` has no slot for a second action.
3. `Menu` requires a `trigger` element to anchor and clone. This popover is
   rendered by `Pane` when a center tap opens it; there is no trigger, and
   inventing one would be inventing an anchor for a thing that is deliberately
   centred.

**`DateGroupedGrid` → `Accordion`.** It is a **windowed** grid: headers and
tiles are absolutely positioned at offsets computed from a measured viewport,
and only placements inside the viewport plus a pad are rendered at all.
`Accordion` takes `items[].content` as a `ReactNode` and lays panels out in
normal flow, so adopting it means rendering every tile of every expanded group —
deleting the virtualization that
[list-virtualization](2020-11-19-list-virtualization.md) locks after it had
already been removed once and had to be put back.

The work order's own note — *"Explorer's collapse; ours cannot"* — is asking for
a **new feature** (collapsible date groups), not a swap. That feature is
legitimate; it is a windowing change, not a component adoption, and it does not
belong in a milestone about styling.

**`FolderTabStrip` / `FolderTab` → `Tabs`.** The semantic blocker is the one
that matters: this strip **has no tab panels**. `Tabs` renders `content` per
item, and here the "content" is the whole multi-pane workspace rendered
elsewhere in the tree. Worse, selecting a folder does not switch a panel — it
assigns that folder to the *active pane*, and several panes can hold different
folders at once, so `aria-selected` on one tab would be a false statement about
a control that is really an action list. (The close button inside each tab is
the same invalid-nested-button problem as the folder picker's.)

## How to honor it

- Before adopting a `@charcuterie/ui` component anywhere, read its `.d.ts` and
  ask what it *renders*, not what it is called. `Menu` and `Modal` put things in
  the top layer; `Accordion` and `Tabs` render their own content in flow.
- If collapsible date groups are ever wanted, that is a change to
  `DateGroupedGrid`'s placement maths — teach it that a collapsed group
  contributes only its header height — not an `Accordion`.
- The three components are not unused elsewhere: `Menu` **is** adopted, for the
  display picker (`imageViewer/useDisplayMenuItems` + `RevealableChrome`), where
  a top-layer anchored panel is correct.

## Evidence

Work order, phase 1 handoff: *"`Menu` | `imageViewer/FolderPickerPopover`,
`imageViewer/DisplayPickerPopover` — the same shape twice"*; *"`Accordion` |
`fileBrowser/DateGroupedGrid`'s date-group headers. Explorer's collapse; ours
cannot"*; *"`Tabs` | `workspace/FolderTabStrip` + `workspace/FolderTab` — a
closable tab strip"*.

Locked decision being protected: *"Can I have that display not as a modal
overlay, but inside the panel itself?"* — chat (22200a96, 15c0cfc1).

## Related

- [[2026-06-04-gallery-and-folder-picker-stay-in-the-pane]]
- [[2020-11-19-list-virtualization]]
- [[2026-06-04-multi-folder-queue-and-side-by-side-are-core]]
- [[2026-07-31-styling-is-tailwind-on-charcuterie-tokens]]
