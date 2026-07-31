# 2026-07-31 — The selection blue becomes the `accent` intent, and its hue changes

- **Status:** Locked — **but flagged for the owner's eye.** This is the one visible change
  in an otherwise parity-preserving migration; see "How to honor it".
- **Date:** 2026-07-31
- **Deciders:** agent, pending Kevin's confirmation
- **Source:** charcuterie milestone M6c, branch `feat/m6c-typescript-tailwind`; commit b8d84ae "fix: brighter selection blue, visible menu X icons, and fill target monitor"

## Decision (the rule)

Every "this is selected / this is active" affordance uses the **`accent` intent** from
`@charcuterie/tokens` — `bg-intent-accent-solid`, `border-intent-accent-border`,
`text-intent-accent-content` — not a hex. Under the fleet default (`daylight`, `dark`) the
accent is **`#5A54E8`, a blue-violet**, where the app's own selection blue was `#2A6F97` /
`#3D9BE0` / `#61A5C2`, a cyan-leaning blue.

**The hue changes.** That is accepted rather than worked around.

## What was rejected ("no, that's wrong")

1. **Mapping the selection blue to the `info` intent** because `#2A8DAE` is the nearest ink
   to `#2A6F97`. It would have preserved the hue almost exactly — and `info` means
   *informational*, which a selection is not. Choosing a token by how it looks rather than by
   what it means is the failure mode the whole token layer exists to prevent; do it once and
   the next reader has no way to tell a semantic choice from a colour match.
2. **Overriding `--color-intent-accent-*` in `src/styles/tailwind.css` to the app's own
   blue.** castkit did exactly this for `--accent` and had a reason: `NowPlaying` repaints it
   at runtime from album art. This app has no such reason, so the override would be a private
   palette wearing a shared name — worse than a hex, because it looks tokenised.

## Why

The nine sites (`ImageViewer`, `Pane`, `PaneGalleryImageTile`, `PaneGalleryFolderTile`,
`FolderPickerPopover`, `FolderTabStrip`, `Directory`, `FileBrowser`) all say the same thing —
*this one is chosen* — in four different hexes, two of which are the same colour at different
brightnesses. That is one meaning with four spellings, which is precisely what an intent is.

The counter-argument is real and is why this file exists: commit b8d84ae is Kevin *deliberately
adjusting this blue* ("brighter selection blue"). Changing a colour the owner has already tuned
by hand is not a free move, and a migration should not smuggle a taste change in under a
mechanical one.

It goes ahead because the alternative is worse in a way that lasts longer: the app now has a
`data-variant` axis, and a selection painted from a private hex follows none of it. Under
`legible` or `hairline` the chrome would re-theme and the selection would not.

## How to honor it

- Selection/active affordances take `intent-accent-*`. Never a hex, never `info` "because it
  looks closer".
- **If Kevin says the violet is wrong**, the fix is not to reintroduce a hex. It is either
  (a) a different `data-variant` whose accent he likes, or (b) a change to the accent in
  `@charcuterie/tokens` itself, which is the fleet-wide answer and reaches rip-deck and
  mux-magic too. Record whichever he picks as a superseding decision.
- The before/after hexes are in
  [`docs/typescript-and-tailwind-conventions.md`](../typescript-and-tailwind-conventions.md)'s
  colour table, so reverting is a table lookup rather than an archaeology exercise.

## Evidence

> "fix: brighter selection blue, visible menu X icons, and fill target monitor" — commit
> b8d84ae, the owner tuning this exact colour

### Correction, 2026-07-31 — the b8d84ae evidence above is wrong

Kevin read this record and said he did not hand-tune that colour. He is right, and the
citation fails on both halves:

1. **It is not "the owner tuning by hand."** `b8d84ae` is authored under Kevin's git
   identity like every commit in this repo, and carries
   `Co-Authored-By: Claude Opus 4.8` — an agent session, not a hand edit.
2. **It does not endorse `#2A6F97`. It deletes it.** The commit body reads *"Bump the
   'selected item' highlight … from the dull `#2a6f97` to a brighter `#3d9be0`"*, and the
   diff changes exactly two sites (`FolderPickerPopover` active row, `FolderTabStrip`
   active tab) in that direction. Citing it to protect `#2A6F97` inverts it.

So the "counter-argument" this record weighed against itself never existed. Nothing was
smuggled past a taste Kevin had set. What the repo's own history actually asks for is
**more brightness**, which the token accent `#5A54E8` delivers — it is brighter and more
saturated than `#2A6F97`, and closer in luminance to `#3D9BE0`.

The decision (selection = `accent` intent) is therefore **better supported than when it
was written**, not worse. It stands unchanged pending Kevin's look at
[`docs/previews/2026-07-31-selection-blue-comparison.html`](../previews/2026-07-31-selection-blue-comparison.html),
which shows both sites under `#5A54E8`, `#2A6F97`, and `#3D9BE0` in the real app.

M5's precedent for the general move: rip-deck's `LoadedDiscsBanner` "was hardcoded slate, which
said *this is information* by accident. `info` says it on purpose."

## Related

[[2026-07-31-styling-is-tailwind-on-charcuterie-tokens]] ·
[[2026-06-04-fake-fixtures-are-color-coded-per-folder]]
