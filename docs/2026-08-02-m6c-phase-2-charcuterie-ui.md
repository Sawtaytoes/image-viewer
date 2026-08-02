# M6c phase 2 — image-viewer consumes `@charcuterie/ui`

**Date:** 2026-08-02
**Branch:** `feat/m6c-charcuterie-ui`, pushed, **not merged** (`master` is the owner's call —
[branch-for-non-trivial-work](decisions/2026-05-07-branch-for-non-trivial-work.md)).
**Milestone:** charcuterie M6c, phase 2 of two. Phase 1 is
[`2026-07-31-m6c-typescript-and-tailwind.md`](2026-07-31-m6c-typescript-and-tailwind.md).
**Library version: `@charcuterie/ui@^0.2.0`.** `1.0.0` was expected to land mid-milestone and
did not — the registry still shows `0.1.0`, `0.1.1`, `0.2.0` with `latest → 0.2.0`, checked at
the start and again at the end. **The bump is left for whoever merges this.**

Phase 1 converted the renderer to TypeScript + Tailwind and *deliberately replaced no component*.
This is the replacement.

## Gates

| Gate | Phase 1 | Now |
| --- | --- | --- |
| `yarn typecheck` | clean, 152 files | clean, **153 files** |
| `yarn test:run` | 114 tests, 25 files | **120 tests, 26 files** |
| `yarn lint:biome` | clean, 162 files | clean, **163 files** |
| `yarn lint:eslint` | clean | clean |
| `yarn build:renderer` | green | green |

Six new tests, all on `useDisplayMenuItems`. One file added
(`useDisplayMenuItems.tsx`), one deleted (`DisplayPickerPopover.tsx`), one deleted in the
inherited WIP (`toolkit/Button.tsx`, in favour of the library's).

## What was migrated

| `@charcuterie/ui` | Where |
| --- | --- |
| `Tooltip` | **8 sites** — `TitleBar` (4), `FolderPickerPopover` (2), `RevealableChrome` (1, later lost to `Menu` — see below), `FolderTabStrip` (1) |
| `Select` | `fileBrowser/DirectoryControls`, `imageViewer/PaneGallery` — both sort pickers |
| `Modal` | `toolkit/ConfirmationModal` + `toolkit/DeleteFileModal` |
| `Button` / `IconButton` | `toolkit/Button` deleted; the bare `<div onClick>` icons in `DirectoryControls`; the Toast actions |
| `Field` | `fileBrowser/FileBrowser`'s search input |
| `Toast` | `FileBrowser` and `PaneGallery` multi-select action bars |
| `Menu` | the display picker — `useDisplayMenuItems` + `RevealableChrome` |
| `ProgressBar` | `imageViewer/Image`'s bare `<progress>` |
| `data-density="kiosk"` + the type ramp | `index.html`; 17 `text-[NNpx]` → `text-sm`…`text-2xl` |

`Select`, `Modal`, `Field`, `Toast` and most of `Button`/`IconButton` came from the inherited WIP
commit (`4008211`) and were kept — see "The inherited checkpoint" below.

**All native `title=` on a control is gone.** The only `title` left in `src/components/` is
`Image`'s on the `<img>`, which is a filename on a picture rather than an explanation on a
control. This is the accessibility win of the milestone and it is not about hover polish: a
native `title` never appears on a touch device, and touch is this app's primary input
([touch-first-is-the-whole-point](decisions/2026-06-03-touch-first-is-the-whole-point.md)), so
on the input that matters every one of those explanations was dead text. "Clear queue" throws
away the entire queue and its only warning was unreachable by both touch and keyboard.

## What was NOT migrated, and why

Three of the eleven itemised sites were tried and rejected on evidence, each for a reason that is
not stylistic. Written up as a locked decision so nobody "finishes the job":
[three-work-order-sites-keep-their-own-component](decisions/2026-08-02-three-work-order-sites-keep-their-own-component.md).

- **`FolderPickerPopover` → `Menu`.** `Menu`'s panel is `popover="manual"` shown with
  `showPopover()`, i.e. the **top layer** — out of the pane, which is exactly what
  [gallery-and-folder-picker-stay-in-the-pane](decisions/2026-06-04-gallery-and-folder-picker-stay-in-the-pane.md)
  locks. Plus its rows carry a trailing remove button (a `<button>` inside a `menuitem` button),
  and it has no trigger to anchor to.
- **`DateGroupedGrid` → `Accordion`.** It is a windowed grid — absolute placements computed from
  a measured viewport, only the visible ones rendered. `Accordion` lays panels out in flow, so
  adopting it deletes the virtualization that
  [list-virtualization](decisions/2020-11-19-list-virtualization.md) locks. The work order's own
  note ("Explorer's collapse; ours cannot") is asking for a **new feature**, which is a change to
  the placement maths, not a component swap.
- **`FolderTabStrip` → `Tabs`.** It has no tab panels: the "content" is the whole multi-pane
  workspace elsewhere in the tree. And selecting a folder assigns it to the *active pane* while
  other panes keep theirs, so a single `aria-selected` tab would be a false statement.

**`Icon` does not exist.** The work order lists `Icon` for `icons/SvgIcon` and its 14 glyphs.
`@charcuterie/ui@0.2.0` exports no `Icon` component at all — icons are plain `ReactNode` passed to
`Button`'s `iconStart`/`iconEnd` or `IconButton`'s `children`. `SvgIcon` stays the app's own.
mux-magic reached the same conclusion independently. **This row of the work order is unbuildable
and should be struck rather than carried forward.**

## Library defects hit

### `Menu` and `Tooltip` cannot share a trigger — new, please add to M6f

The brief warned that `Field` and `Tooltip` cannot nest. It is not a property of those two
components; it is a property of **every pair of slot components**, and `Menu`/`Tooltip` is a
second instance.

`@charcuterie/logic`'s `useClonedChild` is a bare `cloneElement(Children.only(child), props)` —
no ref merge, no prop merge, no handler composition. So:

- `<Tooltip><Menu …/></Tooltip>` → `Tooltip` clones the **`Menu` element** with
  `{...getReferenceProps(), ref}`. `MenuProps` is a closed list, so all of it is dropped. The tip
  never opens, nothing errors, `tsc` is green.
- `<Menu trigger={<Tooltip>…</Tooltip>}>` → the same in reverse.
- A mux-magic-style `DescribedControl` forwarding adapter **does not rescue this pair**: both
  parents pass a `ref`, and the second `cloneElement` overwrites the first. Losing `Menu`'s
  reference ref means floating-ui has nothing to position against.

The display button therefore has a menu and no tooltip. `Menu` won because `useRole(context,
{ role: "menu" })` points the panel's `aria-labelledby` at the trigger, so the button's
`aria-label` *is* the menu's accessible name.

**Suggested fix:** make `useClonedChild` merge `ref`s and compose event handlers rather than
overwrite. That fixes `Field`+`Tooltip`, `Menu`+`Tooltip` and every future pair in one change.

### `MenuItem` cannot react to being pointed at

`MenuItem` is `{ icon?, isDisabled?, key, label, onSelect }`. The display picker's whole purpose
is that hovering a row lights up that physical monitor — "Display 2" is unreadable otherwise — and
there is no hook for it.

Worked around by putting the pointer handlers on the `label` node, with two details that the test
found and reading did not:

- `-mx-2 -my-1.5 … px-2 py-1.5` cancels `MenuAction`'s own padding so the label fills the
  button's padding box. Without it the padding is a dead zone and the overlay drops out.
- **The glyph must be rendered inside the `label`, not passed as `MenuItem.icon`.** `icon` is a
  *sibling* of the label inside the button, so an icon passed that way is a hole in the middle of
  the hover region — crossing it fires `pointerleave` and puts the monitor out.

### `SelectProps.options` is `SelectItem[]`, not `readonly SelectItem[]`

A `readonly` options array is rejected outright (TS4104). The only ways to pass one are a spread
(a fresh array every render, defeating `memo` on both call sites) or a cast. `sortOrderOptions` is
mutable as a result. Widening the prop costs the library nothing.

### `LogViewer` inside a collapsed `Accordion` — not applicable

Confirmed moot: the app has no `LogViewer` site, and no `Accordion` was adopted.

## Three jsdom gaps, all shimmed in `vitest.setup.ts`

The library reaches for three platform features jsdom does not implement, and **all three fail as
something other than "unimplemented"**:

1. **`<dialog>`.** jsdom parses the tag and implements none of the dialog — `showModal` is
   `undefined`. `Modal` calls it in a passive effect, so it surfaced as an unrelated-looking
   failure in `FolderPickerPopover`'s delete-confirm test.
2. **The Popover API.** `Menu` uses `showPopover()` plus a `matches(":popover-open")` guard, and
   `:popover-open` is not a selector jsdom's parser knows — so `matches()` **throws** rather than
   returning `false`, turning the guard itself into the crash.
3. **jsdom's UA rule `[popover]:not(:popover-open) { display: none }`** — the confusing one.
   Patching `Element.prototype.matches` satisfies `Menu`'s guard but cannot reach the *cascade*, so
   the panel rendered with the right role and the right children while
   `getByRole("menu")` reported "Unable to find role=menu", because Testing Library filters on
   computed `display`. An author `!important` rule outranks the UA rule.

Each shim models only what a test can observe. None fakes a focus trap, a top layer or
`::backdrop` — jsdom has no rendering to hang them on, and pretending otherwise would invite
assertions about behaviour the browser owns.

## Test-shape changes worth copying

- **`getByTitle` → `getByRole` / driving the tip open.** The close control's name moved from a
  native `title` to an `IconButton`'s `aria-label`. The role query is strictly stronger:
  `findByTitle` matched a `<div>` just as happily.
- **A `Tooltip` is not in the document until it opens.** `FolderPickerPopover`'s "open in another
  column" test now fires `focus` and asserts `getByRole("tooltip")`. The old assertion proved an
  attribute was spelled correctly and could not have caught a tip that never opens.
- **`fireEvent.blur` does not close a floating-ui tooltip.** `useFocus` reads `relatedTarget` to
  decide whether focus left the pair and `fireEvent.blur` supplies none. Negative cases assert
  their own text rather than `queryByRole("tooltip")` returning nothing, or they blame the wrong
  row.
- **`pointerOver`, not `pointerEnter`.** React has no `pointerenter` listener — it derives
  `onPointerEnter`/`onPointerLeave` from the `pointerover`/`pointerout` pair. `fireEvent.pointerEnter`
  dispatches a real `pointerenter` that React ignores, and the assertion fails for a reason that
  has nothing to do with the component.

## Running the app in this sandbox — it works, here is how

Phase 1's handoff says *"No screenshots. There is no GUI in this sandbox."* **That is wrong**, and
[the fleet rule](../../agentic/docs/runbooks/) says never to claim it. Every surface below was
driven in the real Electron app.

The trap to avoid: `MAIN_WINDOW_VITE_DEV_SERVER_URL` is baked into `.vite/build/main.js`, and a
stale build carried `http://localhost:5199` from a previous agent's session — a *different* agent's
build had `:5173` and loaded rip-deck's dev server. **Do not use a dev server at all.** Build the
renderer to `.vite/renderer/main_window` with `--base ./`, and build main/preload with
`MAIN_WINDOW_VITE_DEV_SERVER_URL` defined as `undefined` so `main.js` takes its `loadFile` branch:

```
vite build --config vite.renderer.config.ts \
  --outDir .vite/renderer/main_window --base ./ --emptyOutDir

# main + preload: lib/cjs build, electron + node builtins external,
# define MAIN_WINDOW_VITE_DEV_SERVER_URL=undefined,
#        MAIN_WINDOW_VITE_NAME='"main_window"'

IMAGE_VIEWER_FAKE_FS=1 xvfb-run -n 71 -s "-screen 0 1600x1000x24" \
  ./node_modules/.bin/electron . \
  --remote-debugging-port=9333 --user-data-dir=/tmp/iv-userdata --no-sandbox
```

Then drive it with Playwright over CDP (`chromium.connectOverCDP("http://127.0.0.1:9333")`,
picking the page whose URL contains `main_window`). `playwright-core` is not a dependency of this
repo; a sibling repo's copy is enough since nothing is installed.

## Screenshot evidence

In `__screenshots__/` (gitignored — scratch, not deliverables), each driven to the state that
changed rather than a default render:

| File | What it proves |
| --- | --- |
| `00-boot.png` | pre-flip, `data-density="comfortable"` |
| `01-kiosk-browser.png` | the same view at `kiosk` — the sort `Select`, search field and title bar all grow, nothing reflows or clips |
| `02-tooltip-keyboard-focus.png` | the fullscreen button focused **by keyboard**, focus ring visible, "Enter fullscreen (F11)" open. A native `title` cannot do this |
| `04-modal-delete-confirm.png` | the real `<dialog>` — `::backdrop` dimming the page, heading as the accessible name, No/Yes splayed to opposite ends (the mis-tap guard) |
| `05-toast-multiselect.png` | `Toast` pinned open (`duration={0}`) with its "Open 2 folders" action and dismiss |
| `08-menu-open-focused-item.png` | `Menu` anchored `bottom-end` under the display button, roving focus on the first `menuitem`, showing the real display |

**`ProgressBar`'s loading state could not be driven, and that is worth recording.** With the
in-memory fake FS, `readImageData` resolves inside the same tick and
`createFileDownloadObservable` emits `100` immediately — it never emits an intermediate value at
all ("local disk reads are effectively instant"). The obvious workaround, stalling the bridge from
the renderer, is impossible: `contextBridge` freezes `window.api`, so the patch silently no-ops.
CPU throttling at 20× and a 600-iteration poll never caught a frame with the bar up. The component
is covered by `typecheck`, the renderer build and the code path; its *appearance under load* is
the one thing in this milestone unverified by eye. A `IMAGE_VIEWER_FAKE_FS_DELAY_MS` knob on the
fake FS would fix that permanently and is the cheapest next win here.

## Still open — the accent hue

Unchanged and still wanting the owner's eye:
[selection-blue-becomes-the-accent-intent](decisions/2026-07-31-selection-blue-becomes-the-accent-intent.md).
**This phase did not touch those sites** — the selection colours live in `Directory.tsx` and
`FolderTab.tsx`, and nothing here modified them beyond the type-ramp rename. The comparison
renders the previous agent left in `__screenshots__/` (`filebrowser-VIOLET.png`,
`filebrowser-CYAN_2A6F97.png`, `filebrowser-BLUE_3D9BE0.png`) are still the right ones to look at.
`05-toast-multiselect.png` shows the violet in situ on two selected tiles if a fresher look helps.

## Found, not fixed

- **The multi-select check badge renders as a tofu box.** `Directory.tsx`'s badge content is `✓`
  (U+2713), and the bundled Source Sans Pro is the **latin** subset, which has no glyph for it —
  visible in `05-toast-multiselect.png` as `⊠` on the selected tiles. Pre-existing (phase 1 fixed
  that badge's *colour*, not its glyph) and out of this milestone's scope, but it is a real visual
  defect on a touch affordance. An inline SVG check, as `icons/` already does for 14 other glyphs,
  is the fix that matches
  [inline-svg-icons-drop-mui](decisions/2026-06-02-inline-svg-icons-drop-mui.md).
- **`Modal` renders a "Close" text button in its header** on top of the confirm's own No/Yes.
  Harmless (it is non-destructive, same as "No") but it is a third dismissal control on a dialog
  whose layout is deliberately a two-option mis-tap guard. `isDismissable={false}` would remove
  it; left alone because losing the Escape affordance it advertises is the worse trade.
- **`ConfirmationModal` has an empty body strip** between heading and footer, since the question
  is the heading and there are no `children`. Cosmetic.

## What phase 3 (or M6f) gets

1. **Bump to `@charcuterie/ui@^1.0.0`** once it publishes, and re-run all five gates.
2. **The `useClonedChild` ref/handler merge** — one library change that unblocks `Field`+`Tooltip`,
   `Menu`+`Tooltip` and every future slot pair.
3. **`MenuItem` pointer hooks**, or an accepted answer for "a menu row with a hover side effect".
4. **Strike `Icon` from the work order** — the component does not exist.
5. **`readonly SelectItem[]`** on `SelectProps.options`.
6. **A fake-FS delay knob**, so the `ProgressBar` and any future loading state can be seen.
7. **Collapsible date groups**, if wanted — as windowing maths in `DateGroupedGrid`, not as an
   `Accordion`.

## The inherited checkpoint

This session resumed commit `4008211` (`wip(m6c-ph2): … INCOMPLETE`), left by a session a usage
limit killed mid-edit. **It was kept essentially as written** — the judgement in it was sound and
its comments were better than a rewrite would have been. It was two typecheck errors, two failing
tests and two formatting misses from green:

- `sortOrderOptions` was `readonly`, which `SelectProps` rejects (TS4104).
- `Modal` needs `<dialog>.showModal`, which jsdom lacks.
- `PaneGallery`'s close-control test still queried `findByTitle`.

None was a design problem. The lesson for the next resumed checkpoint is the cheap one: **run the
gates before reading the diff** — five minutes established that the inherited work was ~15 lines
from green, which is a very different starting posture from "this may not compile".
