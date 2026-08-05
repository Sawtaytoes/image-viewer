# 2026-08-05 — Handoff: non-native sort Select, "Delete saved" test, browser cross-tab queue sync

Three follow-ups accumulated from the 2026-08-05 session (after PRs
[#11](https://github.com/Sawtaytoes/image-viewer/pull/11) — viewer UI/nav/queue
fixes — and [#12](https://github.com/Sawtaytoes/image-viewer/pull/12) — the
`dev:browser` harness — merged to `master`). Each is independent; do them in any
order, one PR each is fine.

## Dev / verify workflow (read first)

- Package manager is **corepack yarn** (global yarn is the wrong version): run
  `corepack yarn typecheck`, `corepack yarn test:run`, `corepack yarn biome check --write <files>`,
  `corepack yarn eslint <files>`. CI runs the same; keep all green.
- **Lint gotchas that bit this session:** biome enforces line-wrapping (run
  `biome check --write`); eslint's `@typescript-eslint/naming-convention` requires
  **boolean** vars/params to start with `is`/`has` (e.g. `isNext`, not `next`), and
  flags non-`is/has` boolean *props* — the codebase disables that per-line with
  `// eslint-disable-next-line @typescript-eslint/naming-convention` where a bridge
  field name must stay (see `preload.d.ts`'s `spawnedViewer`).
- **See changes live in a browser** (no Electron needed): `corepack yarn dev:browser`
  serves the app at `http://localhost:5175/index.browser.html` with a stubbed
  `window.api` (fake filesystem: Cats/Dogs/Landscapes/Abstract). To show Kevin,
  `devshare 5175 "<name>"` → a `*.temp.t3code.octen.dev` link (he can't see inline
  chat images or the container FS — see `agentic/docs/runbooks/showing-visual-output.md`).
  Headless screenshots + the real app under Xvfb: `docs/2026-08-05-run-in-a-browser.md`.

---

## Task 1 — Replace the native sort `Select` with the non-native `Listbox` (and make it 44px)

**Why:** the sort picker ("Name / Newest") is `@charcuterie/ui`'s `Select`, which
is a **styled native `<select>`** — ugly OS dropdown — and it currently renders
**40px tall**; the kiosk touch target should be **44px**.

**The component:** `@charcuterie/ui@2.2.0` exports **`Listbox`** — described in its
own dsoc as "the single-select fancy dropdown — the rich-option sibling of the
native `Select`." That's the non-native one. (Not `Combobox` — that's the
searchable/filtering variant, overkill for two options. Not `SegmentedControl` —
different always-visible UX.)

`Listbox` API (`node_modules/@charcuterie/ui/dist/Listbox/Listbox.d.ts`):
```ts
Listbox({
  isVisible: boolean,
  onDismiss: () => void,          // outside-press + Escape land here
  onSelect: (value: string) => void,
  options: readonly { label: ReactNode; value: string; textValue?: string; isDisabled?: boolean }[],
  selectedValue?: string,         // initial seed; the listbox owns it after
  trigger: ReactElement,          // the control it hangs off — CLONED, names the panel via aria-labelledby
  placement?: Placement,
  className?: string,
})
```
It portals to `document.body` and is named by its trigger, so the trigger button
must carry the accessible name (`aria-label="Sort order"`).

**Do this:**

1. **Extract a shared component** — both call sites are identical, so don't inline
   twice. Suggest `src/components/fileBrowser/SortOrderSelect.tsx` (one component
   per file per `docs/typescript-and-tailwind-conventions.md`). Props: `value:
   SortOrder`, `onChange: (value: string) => void`. Internally:
   - `const [isOpen, setIsOpen] = useState(false)`.
   - `options`: reuse `sortOrderOptions` from `src/components/settings/sortOrders.ts`
     (`[{ label: "Name", value: "name" }, { label: "Newest", value: "modifiedDesc" }]`)
     — already shaped like `ListboxItem`.
   - `trigger`: a `<button type="button" aria-label="Sort order">` showing the
     current option's `label` + `<ChevronDownIcon />` (exists at
     `src/components/icons/ChevronDownIcon.tsx`, no props). Toggle `isOpen` on click.
   - `onSelect`: call `onChange(next)` then `setIsOpen(false)`. `onDismiss`:
     `setIsOpen(false)`. `selectedValue={value}`.
2. **44px height:** style the trigger to `MIN_TOUCH_TARGET_CLASS` (exported from
   `@charcuterie/ui`) or `min-h-[2.75rem]` / `h-11` (2.75rem = 44px, the kiosk
   `--control-min-touch-target`). Match the app's control look — bordered box like
   the screenshot: `rounded-[5px] border border-border-default bg-surface-sunken
   px-2 text-content-primary` + a neutral hover (`hover:bg-intent-neutral-surface-hover`),
   `inline-flex items-center gap-1`. Cross-check against the `IconButton`s in the
   same bar (`appearance="ghost" intent="neutral" size="sm"`).
3. **Swap both call sites** (keep the leading `SortIcon` + the wrapper width):
   - `src/components/fileBrowser/DirectoryControls.tsx:202` — inside
     `sortPickerClassName` (`flex w-[132px] flex-none items-center gap-1`), replace
     `<Select … />` with `<SortOrderSelect value={sortOrder} onChange={changeFolderSortOrder} />`.
     Drop the now-unused `Select` import; keep `SortIcon`.
   - `src/components/imageViewer/PaneGallery.tsx:379` — same swap inside
     `SORT_PICKER_CLASSES`. **Note the `key={browsePath}`** there: it existed only
     because the native `<select>` is uncontrolled and had to be re-seeded per
     folder. `Listbox` is driven by `selectedValue` + your `value` prop, so the
     `key` is likely unnecessary now — remove it and verify the picker shows the
     right order after drilling into a folder with a different sort.
4. **Tests:** `DirectoryControls`/`PaneGallery` (and any test) that finds the sort
   control by `getByRole("combobox")` must change — the `Listbox` trigger is a
   `button` that opens a `role="listbox"`. Update selectors to the button
   (`getByRole("button", { name: "Sort order" })`) and, for a change, open it and
   click an option (`getByRole("option", { name: "Newest" })`). Add a test for the
   shared `SortOrderSelect`.
5. Verify at 44px in `dev:browser` (measure the trigger's `getBoundingClientRect().height`).

There are exactly **two** native `<Select>` usages (`DirectoryControls.tsx:202`,
`PaneGallery.tsx:379`) — grep `grep -rn "<Select" src/components` to confirm none
were added since.

---

## Task 2 — Unit test for the "Delete saved" button (TitleBar)

The button (added in #11) shows when `hasSavedQueue` and calls `clearSavedQueue`
→ `window.api.queue.clearSaved`. It has no dedicated test yet.

`src/components/convenience/TitleBar.test.tsx` renders a real `WorkspaceProvider`,
which hydrates `hasSavedQueue` from `window.api.queue.hasSaved()` on mount and
`queue.onSavedChanged` (see `WorkspaceProvider.tsx:126-140`). Two options:

- **Simplest (matches the pattern I used for `RevealableChrome`):** render `TitleBar`
  wrapped in an explicit `WorkspaceContext.Provider` value spreading
  `defaultWorkspaceContextValue` with `hasSavedQueue: true` and
  `clearSavedQueue: vi.fn()`. Assert the **"Delete saved"** button renders and a
  click calls the spy. Also assert it's **absent** when `hasSavedQueue: false`.
- **Or** keep the real provider and stub `window.api.queue.hasSaved` →
  `Promise.resolve(true)` before render, `await` the button, click it, and assert
  `window.api.queue.clearSaved` was called (spy the stub).

The default `window.api.queue.clearSaved` stub already exists in `vitest.setup.ts`.

---

## Task 3 — Cross-tab queue sync in the browser harness

**Why:** `browserApi.ts`'s queue/`openFolders` are per-tab in-memory, so a
window opened via `createNewWindow` (`window.open`, incl. `?spawnedViewer=1`)
boots with an empty queue — the spawn-on-display flow can't mirror the source
window. (Harness-only; the Electron app already shares via main.)

**Do this in `src/browserApi.ts`:**
- Back `liveQueue` / `savedQueue` (and `openFolders`' set) with **`localStorage`**
  (so a freshly-opened tab hydrates) **+ a `BroadcastChannel`** (so open tabs
  update live), mirroring Electron main's shared store:
  - On every mutation (`queue.add/addMany/clear/clearSaved/save/load/remove`,
    `openFolders.set`): write JSON to `localStorage` and `postMessage` on a channel
    (e.g. `new BroadcastChannel("image-viewer-queue")`).
  - On channel `message`: replace local state and fire the registered
    `onChanged` / `onSavedChanged` / openFolders `onChanged` listeners.
  - On `installBrowserApi`: hydrate `liveQueue`/`savedQueue`/openFolders from
    `localStorage` before assembling `window.api`.
- Keep it self-contained in `browserApi.ts` (don't touch the Electron path).
- Guard for `BroadcastChannel`/`localStorage` being unavailable (older/embedded
  browsers) — degrade to the current per-tab behaviour.
- Verify: `dev:browser`, open two tabs, queue a folder in one → it appears in the
  other; open a `?spawnedViewer=1` tab → it boots into the viewer with the shared
  queue.

---

## State at handoff

- `master` @ `338bd6b` (both PRs merged, CI green). Working tree clean.
- Live harness (may still be up): https://image-viewer-browser-3af3.temp.t3code.octen.dev/index.browser.html
- Everything typechecks, 134 tests pass, biome/eslint clean.
