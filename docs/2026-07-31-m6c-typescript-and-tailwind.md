# M6c phase 1 — image-viewer becomes TypeScript + Tailwind

**Date:** 2026-07-31
**Branch:** `feat/m6c-typescript-tailwind`, pushed, **not merged** (`master` is the owner's
call — [branch-for-non-trivial-work](decisions/2026-05-07-branch-for-non-trivial-work.md)).
**Milestone:** charcuterie M6c, phase 1 of two. Phase 2 is gated on `@charcuterie/ui@0.2.0`.

Charcuterie's M6 survey found that the component layer reaches React + Tailwind consumers and
nothing else, and that image-viewer was React 19 already — `.jsx` and Emotion were the entire
gap. This closes it. **No component was replaced with a `@charcuterie/ui` one**; that is phase
2, and the nine P1 components it needs are not on the registry yet.

## Gates

| Gate | Before | After |
| --- | --- | --- |
| `yarn typecheck` | clean, **16 files** — 8 of them app modules, out of 143 | clean, **152 files** |
| `yarn test:run` | 108 tests, 23 files | **114 tests, 25 files** |
| `yarn lint:biome` | clean, 157 files | clean, **162 files** |
| `yarn lint:eslint` | clean | clean |
| `yarn build:renderer` | **did not exist** | green, and now in CI |

The typecheck row is the honest headline. `tsc --noEmit` was green on `master` because its
program was five config files, two `.d.ts` files, and **four** app modules with their four tests
— `compareNaturalStrings`, `createActionCreator`, `createReducer`, `imageMimeTypes`. The other
**132 source files were not in the program at all**, by design: `allowJs: true` with
`checkJs: false` is what
[the 2026-06-02 decision](decisions/2026-06-02-typescript-tooling-now-convert-later.md)
deliberately set up so the conversion could wait. It waited fourteen months.

## Numbers

| | Before | After |
| --- | --- | --- |
| `.tsx` / `.ts` under `src/` | 0 / 11 | **58 / 87** |
| `.jsx` / `.js` under `src/` | 56 / 76 | 0 / **2** (`main.js`, `preload.js`) |
| Colour literals in `src/components/` | **119**, in 22 files | **0** |
| — distinct values among them | 35 | — |
| Files importing `@emotion/react` | 26 | 0 |
| Emotion `css` props | 125 | 0 |
| `propTypes` blocks | 24 | 0 |
| `any` / `as` / `unknown` / `!` in `src/` | — | **0** |
| `eslint-disable` in `src/` | 5 | 6 |
| Renderer JS, gz | 99.18 KB | **89.50 KB** |
| Renderer CSS, gz | 8.19 KB (tokens only, no utilities) | **11.99 KB** |
| Fonts in the bundle | 0 (Google CDN, per request) | 108 KB (six files, bundled) |

The bundle rows are measured against **the foundation commit**, not `master` — the tokens were
already in by then, so the delta isolates the Emotion→Tailwind swap rather than flattering it.
Emotion leaving is worth 31 KB raw / 9.7 KB gz of JavaScript; the utility layer costs 18 KB raw
/ 3.8 KB gz of CSS. Net **−5.9 KB gz**, which is a rounding error and is not why the swap
happened.

`aria-*` went 8 → 8 and `role=` 0 → 0. rip-deck's first consumer milestone moved those numbers
because it *adopted components*; this one deliberately did not, and reporting a change here
would mean something had been smuggled in.

## Four things that were already broken and had no gate that could see them

### The self-hosted fonts had never been switched on

`src/fonts/SourceSansPro.css` existed, with all six woff/woff2 files beside it, and was
**imported by nothing**. `index.html` still carried the Google Fonts `<link>` pair. So
[self-host-the-fonts-locally](decisions/2026-06-30-self-host-fonts-locally.md) — written
because [startup speed is the top priority](decisions/2026-06-03-startup-speed-is-top-priority.md)
and this app opens several windows — had been recorded, half-implemented, and never taken
effect.

It could not have worked as written, either: the `url()`s were absolute (`/fonts/…`) against a
`public/` directory this repo does not have, and in the packaged app the renderer loads from
`file://`, where a leading `/` is the drive root. Relative paths make them module specifiers,
so Vite hashes them into the bundle.

### `preload.d.ts` had never heard of three whole API members

`window.api.fullScreen`, `window.api.searchFolders`, and `queue.hasSaved` / `.load` / `.save` /
`.onSavedChanged` have been exposed by `preload.js` for weeks. The declaration file did not
mention any of them, and the test stub was missing `readImageData` entirely.

Nothing could see it, because nothing was typed: `allowJs: true` + `checkJs: false` meant every
call site was `any`. Typing `vitest.setup.ts` as the real `Window["api"]` found all of it in one
compile.

### Two contexts were `createContext()` with no argument

`WorkspaceContext` (21 members) and `SettingsContext` (three) both defaulted to `undefined`, and
eight consumers destructured them on faith. Reading a provider-less one threw; nothing said so.

### `searchFolders` depended on a variable shadow

`createFakeFileSystem`'s `searchFolders(rootPath, query)` shadowed the tree's own `rootPath`
twenty lines up. The behaviour was correct and entirely dependent on the shadow — renaming the
parameter without repointing the queue turns "search under what you asked for" into "search the
whole drive", with no error, no failing test, and a plausible result set. Found by the rename,
not by a test.

## The one visible change, and it wants the owner's eye

**The selection blue changes hue** — `#2A6F97` cyan to the accent intent's `#5A54E8`
blue-violet, at nine sites.
[Decision, with the rejected alternatives](decisions/2026-07-31-selection-blue-becomes-the-accent-intent.md).
It is flagged rather than assumed because commit `b8d84ae` is Kevin tuning this exact colour by
hand ("brighter selection blue"). If it is wrong, the fix is a different `data-variant` or a
change to the token — **not** a hex coming back.

Two smaller ones in the same family, both written up in
[the conventions doc](typescript-and-tailwind-conventions.md):

- **The file browser's search bar flips luminance.** It was `#3a3a3a` on a `#444` page — darker
  than its page. `bg-surface-raised` is *lighter* than `bg-surface-base` in this palette, and
  there is no token above `raised`, so the semantic role won and the bar now sits lighter with
  its input as a sunken well inside it.
- **The multi-select check badge went invisible and was fixed before landing.** Following the
  accent row literally put the badge on a tile of the same colour, in two files. It is
  `intent-accent-content` now — 2.71:1 against the tile where the original managed 2.01, and
  the ✓ at 7.81:1 where the original's white-on-light-blue managed 2.74. Caught by two agents
  comparing notes, **not by any gate**, which is the point: WCAG contrast is gated in
  charcuterie and nothing gates it here.

## Five traps this migration hit, in order of how quietly they fail

1. **A Tailwind class built from a template literal generates no CSS.** Tailwind scans source
   *text*. `` className={`w-[${size}px]`} `` compiles, renders, and the element has no width —
   no error, and `tsc`, Biome, ESLint and every jsdom test see a perfectly good string. This is
   why `yarn build:renderer` exists and is now a CI step. It is still not a *proof*: the build
   fails on nothing, so two of the five agents additionally ran the real Tailwind compiler over
   every class string they emitted (136 and 104 tokens; zero empty).
2. **Two utilities setting the same property resolve by stylesheet order, not `className`
   order.** Emotion's `css={[base, cond && override]}` relied on the override winning. Ported
   directly, the result works by luck. Six places were restructured so the branches are
   disjoint.
3. **A comment in `biome.json` silently drops the whole config.** Biome reads `.json` strictly;
   a `//` does not error, it falls back to defaults — which reformats with tabs and semicolons
   and re-enables the rules the file turns off. It happened once here, mid-run, and rewrote two
   `function` expressions into arrows, killing `.prototype` and five tests. The agent that hit
   it caught and reverted it; `createActionCreator.ts` is byte-identical to `master`.
4. **`--font-sans` must be overridden unlayered *and* matching `[data-variant]`.** The tokens
   set it at specificity 0,1,0, so a `:root` override — or anything in `@layer base` — loses,
   and the app renders in Outfit. Correctly, silently, and against a locked decision.
5. **Biome cannot parse `@theme` without being told.** It is a *parse* error, so the entire
   stylesheet goes unformatted and unlinted rather than one at-rule being skipped.
   `css.parser.tailwindDirectives` fixes it.

## What phase 2 gets, itemised

Written down by the agents as they went, so phase 2 starts with a work order rather than a
survey. **Nothing here was migrated.**

| `@charcuterie/ui` | Sites |
| --- | --- |
| `Menu` | `imageViewer/FolderPickerPopover`, `imageViewer/DisplayPickerPopover` — the same shape twice: scrim, pop-in panel, icon+label rows, Esc and backdrop dismiss |
| `Tooltip` | Every `title=` attribute — `PaneGallery` (up / sort / close), `RevealableChrome` (spawn-on-display), `FolderPickerPopover` (remove, open-elsewhere), `TitleBar`, `FolderTabStrip`. **All native `title`, and every one of them is unreachable on a touch device** |
| `Select` | `fileBrowser/DirectoryControls`'s sort toggle and `imageViewer/PaneGallery`'s — two-value controls rendered as click-to-cycle buttons |
| `Field` | `fileBrowser/FileBrowser`'s search input + clear button + pending hint |
| `Accordion` | `fileBrowser/DateGroupedGrid`'s date-group headers. Explorer's collapse; ours cannot |
| `Toast` | `FileBrowser`'s and `PaneGallery`'s bottom-centred multi-select action bars — Toast-shaped, though semantically an action bar |
| `Button` / `IconButton` | `toolkit/Button` (already the app's own), plus the bare `<div onClick>` icons in `DirectoryControls` |
| `Modal` | `toolkit/ConfirmationModal` + `toolkit/DeleteFileModal` |
| `Tabs` | `workspace/FolderTabStrip` + `workspace/FolderTab` — a closable tab strip |
| `ProgressBar` | `imageViewer/Image`'s bare `<progress>`. rip-deck already consumes the shared one |
| `Icon` | `icons/SvgIcon` and its 14 glyphs |

**No `LogViewer`, `SortableTableHeader` or `FileDropZone` shape exists anywhere in this app.**
Three of the nine P1 components have no consumer here — which is worth reporting upward, given
that `Toast`, `FileDropZone` and `SortableTableHeader` were the three M6a built on the plan's
authority rather than on evidence.

Phase 2 also gets two things that are cheap only once the components arrive:

- **`data-density="kiosk"`.** The app is touch-first on a Surface
  ([decision](decisions/2026-06-03-touch-first-is-the-whole-point.md)) and every control still
  carries the explicit pixel size it had under Emotion. Flipping density today would resize all
  of them at once with no way to tell an intended change from a regression; once the controls
  come from the library, density is the thing that sizes them.
- **The type ramp.** `text-[16px]` becomes `text-lg` for the same reason.

## Not done, deliberately

- **`src/main.js` and `src/preload.js` are still JavaScript.** 1,338 lines of Electron
  main-process and preload code. They are not a blocker for `@charcuterie/ui` — the renderer
  was the whole gap — and they are the two files `forge.config.ts` names as build entries, so
  the gate that matters for them is `yarn package` on Windows, which this sandbox cannot run.
  Converting them here would have meant landing an unverifiable packaging change inside a
  milestone about styling. `tsconfig.json` excludes them by name rather than by leaving
  `allowJs` on, so nothing else can quietly join them.
- **`@charcuterie/biome-config` and `@charcuterie/eslint-config` are not adopted.** They publish
  (both `0.1.0`), and **no consumer in the fleet uses them** — rip-deck, castkit and mux-magic
  each carry their own `biome.json` and `eslint.config.mjs`. Adopting them here would make this
  the only app that does, and would swap this repo's `lineWidth: 60` and its
  `useKeyWithClickEvents` / `noStaticElementInteractions` exemptions, which exist because this
  is a touch-first app whose surfaces are deliberately not buttons. The brief said "if that
  matches the sibling consumers' setup"; it does not.
- **Logical properties are not adopted.** Charcuterie enforces `ps-`/`pe-`/`start-`/`end-` and
  `@charcuterie/ui` is written in them, so the components arriving in phase 2 are already
  correct. Rewriting this app's own `left`/`right` in the same diff as the Emotion swap, on a
  single-locale Electron app, is two unrelated changes in one review.
- **No screenshots.** There is no GUI in this sandbox, and
  [no-snapshot-or-screenshot-tests](decisions/2026-05-10-no-snapshot-or-screenshot-tests.md) is
  locked anyway. The substitute was the renderer build plus a class-by-class grep of the
  emitted CSS, which catches a class that generates nothing and cannot catch a colour that
  looks wrong. **The accent hue and the search bar's luminance flip are the two places a human
  look pays off.**

## Bugs found and left alone

Each is dead or latent today; none is in this milestone's scope.

1. **`reduxObservable`'s hot-reload name match can never succeed.** It passed a second argument
   to `window.api.path.basename`, and the preload's wrapper discards it — so the comparison was
   `"addFilePathEpic.js" === "addFilePathEpic"`. The discarded argument is gone (the only way to
   typecheck without lying about the bridge); behaviour is bit-identical, and the `module.hot`
   block that would reach it is commented out.
2. **The `filePathsQueue` slice is permanently empty.** Its two action creators are the only
   namespace creators built without a `namespaceIdentifier`, so their actions carry
   `namespace: undefined` and the reducer creator early-returns. Nothing dispatches them and
   nothing reads the slice. `queueStates.ts` is imported by nobody either.
3. **`useEdgeSwipe` reports reveal progress for gestures that did not start at the edge.** No
   caller passes `onProgress` today, so it is latent — a future progress indicator would flash
   on unrelated drags.
4. **`useEdgeSwipe` and `useLongPress` only clear their tracked `pointerId` on a matching
   `pointerup`/`pointercancel`.** A release lost outside the window leaves the hook armed to a
   dead id until remount.

## How this was run, and what it cost

Five subagents, one per directory, in one tree — the layer-ownership model from
`agentic/docs/runbooks/subagent-pr-workflow.md`, since this repo has no PR-per-agent CI. It
worked, with one collision worth recording: **two agents ran `biome --write` while a third was
editing `biome.json`**, and Biome's silent fallback to defaults reformatted 39 files that were
not theirs. Layer ownership protects source files; it does not protect the shared config a
formatter reads. Next time, the lead settles `biome.json` before any agent starts.

Three of the five independently reached for `src/styles/tailwind.css` — the one file no
directory owns, because `@keyframes` is a top-level at-rule. Two `@theme` blocks landed and were
merged afterwards.
