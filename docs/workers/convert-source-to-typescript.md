# Convert `src/**` to TypeScript — cleanly

Executes **Phase 2** of [ADR 0004](../research/0004-typescript-strategy.md) ("tooling now, source
conversion later"). The tooling is already in place: `tsconfig.json` with `strict:true`,
`allowJs:true`, `checkJs:false`; `@types/react`, `@types/react-dom`, `@types/node`,
`typescript-eslint`; and the Vite/Forge build understands `.ts`/`.tsx`. What's missing is the source
conversion itself, and guidance on doing it *well*.

**The bar:** type as precisely as the code already behaves. `any`, `as`, and `unknown` are smells,
not tools — every one is an admission the type is unknown, and the goal here is that almost nothing
is. Reach for **generics** and the **correct DOM types** (`HTMLDivElement`, `HTMLImageElement`,
`PointerEvent`, …) instead. This whole codebase is small, clean, and factory-driven, which maps
onto TS generics almost one-to-one — so the precise types are reachable, not aspirational.

## Principles — when (not) to use the escape hatches

- **`any` — never.** It doesn't widen a type, it *deletes* it, and the deletion spreads through
  every value it touches. There is no case in this codebase that needs it. If you can't name a type,
  it's a generic (you don't know it *yet*, the caller does) or `unknown` at a boundary (you don't
  know it *here*). Set `@typescript-eslint/no-explicit-any` to **error** so this can't regress.
- **`as` — only when you genuinely know more than the compiler and cannot express it otherwise.**
  Legitimate: `as const` for literal tuples/keys, narrowing a `Record` lookup the compiler can't
  prove. Illegitimate (the common case): `as Foo` to make a red squiggle go away — that just moves
  the bug to runtime. If you're tempted, first try a generic, a type guard, or fixing the source
  type. Enable `no-unnecessary-type-assertion` and `consistent-type-assertions`.
- **`unknown` — only at true boundaries, narrowed immediately.** IPC payloads and `JSON.parse` land
  as `unknown`; narrow them with a type guard *at the boundary* and hand typed values inward. Never
  let `unknown` propagate past the function that received it.
- **`!` (non-null assertion) — never.** It's `as` wearing a smaller hat. Use the safe-context hook
  pattern (below) or an explicit guard. Enable `no-non-null-assertion`.

These rules can be tightened file-by-file as conversion proceeds; the ESLint flat config
(`eslint.config.mjs`) and Biome (`biome.json`) already exist to hold them.

## DOM refs — name the element, and the type comes for free

`useRef()` with no argument infers `MutableRefObject<undefined>`, which then needs casting at every
use. Instead, name the element type and seed with `null`:

```ts
const canvasRef = useRef<HTMLDivElement>(null)        // container <div>
const imageRef = useRef<HTMLImageElement>(null)       // <img>
```

`useRef<HTMLDivElement>(null)` produces `RefObject<HTMLDivElement>`, and `<div ref={canvasRef}>` is
then type-checked against it. Apply to:

- container divs: `canvasRef` ([Image.jsx:49](../../src/components/imageViewer/Image.jsx)), the
  overlay refs ([ImageView.jsx:84-85](../../src/components/imageViewer/ImageView.jsx)),
  `scrollContainerRef`/`virtualizedListRef`
  ([VirtualizedList.jsx](../../src/components/fileBrowser/VirtualizedList.jsx)),
  `virtualizedListContainerRef` ([FileBrowser.jsx](../../src/components/fileBrowser/FileBrowser.jsx)).

Non-element refs are still real types, not `any`:

- **`requestAnimationFrame` ids** → `useRef<number>(undefined)`. `requestAnimationFrame` returns a
  `number`; the ref holds a number or nothing.
- **boolean flags** (`isCtrlKeyHeldRef`) → `useRef(false)` infers `boolean` already; leave it bare.
- **callback refs** (`callbackRef.current = callback`) → type the ref to the function signature so
  reassignment and `.current(...)` are both checked — see usePointerHover / useKeyboardControls
  below.

**Correct DOM types are often already inferred — don't re-cast them.**
`document.createElement("img")` returns `HTMLImageElement`, not `HTMLElement`
([imageDomElementLoaderEpic.js](../../src/components/imageLoader/imageDomElementLoaderEpic.js)), so
`imageDomElement.setAttribute(...)` and passing it to `fromEvent` already type-check with no
annotation. Likewise `element.querySelector<HTMLImageElement>("img")` takes a generic instead of a
cast. Trust the lib.dom overloads before reaching for `as`.

## Event handlers — `PointerEventHandler` for props, lib.dom events for `addEventListener`

There are **two** kinds of handler in this codebase and they take **different** types. Getting this
wrong is the #1 source of needless `as` in React+TS code.

### 1. JSX prop handlers → React's `*EventHandler` types

For handlers passed to JSX props (`onPointerDown`, `onClick`, `onAnimationEnd`, …), **annotate the
function**, not the parameter. The handler type supplies the event type, so the `event` param is
inferred — you never write `event: PointerEvent` by hand:

```ts
// ✗ don't hand-annotate the parameter
const goToNextImage = useCallback((event: PointerEvent) => { … }, [])

// ✓ annotate the function; `event` is inferred as React.PointerEvent<HTMLDivElement>
const goToNextImage: PointerEventHandler<HTMLDivElement> =
  useCallback((event) => { … }, [])
```

The family (all generic over the element `T`):

| Prop | Type |
| --- | --- |
| `onPointerDown` / `onPointerUp` / … | `PointerEventHandler<T>` |
| `onClick` / `onMouseEnter` / … | `MouseEventHandler<T>` |
| `onKeyDown` / `onKeyUp` | `KeyboardEventHandler<T>` |
| `onAnimationEnd` | `AnimationEventHandler<T>` |
| `onWheel` | `WheelEventHandler<T>` |

Grounds: `onPointerDown` ([ImageView.jsx:144,150](../../src/components/imageViewer/ImageView.jsx)),
`onAnimationEnd` + `onClick` ([ConfirmationModal.jsx](../../src/components/toolkit/ConfirmationModal.jsx)),
`onClick` ([ImageFile.jsx](../../src/components/fileBrowser/ImageFile.jsx)). Where a handler ignores
its event entirely (e.g. `goToNextImage` from `useImageNavigation` is just `() => void`), keep it
`() => void` — don't widen it to a handler type it doesn't use.

### 2. Native `addEventListener` inside effects → lib.dom event types

Handlers registered with `addEventListener` receive **native DOM** events, which are **not** the same
types as React's synthetic events. Type them with the lib.dom globals:

```ts
useEffect(() => {
  const onKeyDown = (event: KeyboardEvent) => {        // DOM KeyboardEvent, not React's
    if (scrollKeys.includes(event.code)) event.preventDefault()
  }
  window.addEventListener("keydown", onKeyDown)
  return () => window.removeEventListener("keydown", onKeyDown)
}, [])
```

Grounds: `onKeyDown` in [useKeyboardControls.js](../../src/components/convenience/useKeyboardControls.js),
[useDisableScrollKeyFunctions.js](../../src/components/convenience/useDisableScrollKeyFunctions.js),
[ImageViewControls.jsx](../../src/components/imageViewer/ImageViewControls.jsx); the pointer handlers
in [usePointerHover.js](../../src/components/imageViewer/usePointerHover.js) take a DOM
`PointerEvent`. Observer callbacks get their own named types — `IntersectionObserverCallback`
([Image.jsx](../../src/components/imageViewer/Image.jsx)) and `ResizeObserverCallback`
([FileBrowser.jsx](../../src/components/fileBrowser/FileBrowser.jsx)) — so you don't annotate the
entry parameters by hand.

For `usePointerHover`, type the callback ref to the data shape it carries:

```ts
interface PointerHoverData { event: PointerEvent; isHovering: boolean }

const callbackRef = useRef<(data: PointerHoverData) => void>(callback)
```

## `useState` — infer scalars, but generics for collections and objects

- Booleans / numbers / strings infer correctly from the initial value — leave them bare
  (`useState(false)`, `useState(1)`, `useState("")`).
- **Empty arrays need an explicit generic**, or they infer `never[]` and reject every push:

  ```ts
  const [directories, setDirectories] = useState<ImageFile[]>([])
  ```

  This bites [useDirectories.js](../../src/components/fileBrowser/useDirectories.js) and
  [useImageFiles.js](../../src/components/fileBrowser/useImageFiles.js) (both start `useState([])`).
- **Object state → an `interface`**: `useState<ImageFile>(initialImageFile)`
  ([ImageViewerProvider.jsx](../../src/components/imageViewer/ImageViewerProvider.jsx)) and the
  `viewData` shape (`{ itemSize; numberOfChildren; numberOfItemsInView }`) in
  [VirtualizedList.jsx](../../src/components/fileBrowser/VirtualizedList.jsx).

## Context — typed, with no `as` and no `!`

`createContext()` with no value tempts two bad habits: `createContext<T>(null as unknown as T)` at
the definition, and `useContext(Ctx)!` at every consumer. Avoid both with a wrapper hook that
narrows once:

```ts
interface ImageViewerContextValue {
  imageFileName: string | undefined
  imageFilePath: string | undefined
  leaveImageViewer: () => void
  setImageFile: (file: ImageFile) => void
}

const ImageViewerContext =
  createContext<ImageViewerContextValue | undefined>(undefined)

// One guard, in one place; consumers get a non-optional value with zero casts.
export const useImageViewer = () => {
  const value = useContext(ImageViewerContext)
  if (!value) {
    throw new Error("useImageViewer must be used within an ImageViewerProvider")
  }
  return value
}
```

Define a value `interface` and a `use*` hook for each of `ImageViewerContext`, `FileSystemContext`,
and `ImageLoaderContext`. The `if (!value) throw` narrows `T | undefined` → `T` structurally — no
`!`, no `as` — and centralizes the "used outside provider" failure.

## Generics — the factories and hooks are already generic, just unspoken

- **`useStateSelector<Selected>`** — the selector's return type *is* the hook's return type, so make
  it a type parameter and seed `useState` with the typed initial instead of `{}`:

  ```ts
  const useStateSelector = <Selected>(
    stateSelector: (state: RootState) => Selected,
    dependencies: unknown[],
  ): Selected => { … }
  ```

  ([useStateSelector.js](../../src/components/imageLoader/useStateSelector.js))

- **`createActionCreator<Payload>`** — it returns a callable that also carries a static `.type` and
  a `.toString()`. Describe the augmented function with an interface so both the call and the statics
  type-check (the `function`+`prototype` trick stays as-is at runtime):

  ```ts
  interface Action<Payload> { payload: Payload; type: string }

  interface ActionCreator<Payload> {
    (payload: Payload): Action<Payload>
    type: string
    toString(): string
  }

  const createActionCreator =
    <Payload>({ actionType }: { actionType: string }): ActionCreator<Payload> => { … }
  ```

  ([createActionCreator.js](../../src/components/imageLoader/createActionCreator.js))

- **`createReducer<State, Action>`** — generic over the state and a discriminated-union `Action`
  (discriminated on `type`), so each branch narrows the action automatically
  ([createReducer.js](../../src/components/imageLoader/createReducer.js)).

- **Epics** — define one alias and reuse it across every epic:

  ```ts
  type Epic<State, Action, Deps> =
    (action$: Observable<Action>, state$: BehaviorSubject<State>, deps: Deps) => Observable<Action>
  ```

  RxJS is fully generic — `new Subject<Action>()`, `new BehaviorSubject<State>(initialState)`,
  `Observable<Selected>` — so the pipelines type end-to-end without a single cast
  ([reduxObservable.js](../../src/components/imageLoader/reduxObservable.js)).

## preload / IPC bridge — type it once, at the boundary

Renderer code reads `window.api.*` everywhere; without a typed bridge that becomes
`(window as any).api` at every call site. Instead:

1. **Shared domain types** in one module (e.g. `src/types.ts`) imported by both processes:

   ```ts
   export interface DirectoryEntry {
     fileName: string; filePath: string; isDirectory: boolean; isFile: boolean
   }
   export interface ImageFile { name: string; path: string }
   export interface PathStat { exists: boolean; isDirectory: boolean; isFile: boolean }
   export interface ImageData { data: ArrayBuffer; mimeType: string }
   ```

2. **A `src/preload.d.ts`** that augments the global `Window` with the full `api` surface, so every
   `window.api.readImageData(...)` is typed with no cast
   ([preload.js:77-96](../../src/preload.js)):

   ```ts
   declare global {
     interface Window {
       api: {
         cliFilePath: string
         createNewWindow: (payload: { filePath: string }) => void
         deleteFilePath: (payload: { filePath: string }) => Promise<boolean>
         getWindowsDrives: () => string[]
         readDirectory: (directoryPath: string) => Promise<DirectoryEntry[]>
         readImageData: (filePath: string) => Promise<ImageData>
         statPath: (targetPath: string) => PathStat
         path: { /* basename | dirname | extname | join | resolve | sep */ }
       }
     }
   }
   ```

3. **`ipcRenderer.invoke` returns `Promise<unknown>`.** Assert the real return type **once**, inside
   the bridge definition — this is the single sanctioned boundary cast in the codebase, because the
   main-process handler is the source of truth for that shape. Callers then stay clean. (`send` and
   `sendSync` results are typed by the bridge signature; no cast needed.)

## PropTypes → typed props

Replace each component's `propTypes` + `prop-types` import with a props `interface` and a typed
destructure; `memo()` preserves the inference:

```ts
interface ImageViewProps { imageFileName: string; imageFilePath: string }

const ImageView = ({ imageFileName, imageFilePath }: ImageViewProps) => { … }
```

Grounds: [ImageView.jsx](../../src/components/imageViewer/ImageView.jsx),
[Image.jsx](../../src/components/imageViewer/Image.jsx),
[ConfirmationModal.jsx](../../src/components/toolkit/ConfirmationModal.jsx),
[Button.jsx](../../src/components/toolkit/Button.jsx). Drop `prop-types` from `package.json` once no
component imports it.

## Suggested conversion order

Work bottom-up so each file's dependencies are already typed when you reach it:

1. **Shared domain types + `src/preload.d.ts`** (Window augmentation) — unblocks every renderer file.
2. **Leaf utilities** `.js` → `.ts`: `imageMimeTypes`, `compareNaturalStrings`, and the factories
   (`createActionCreator`, `createReducer`).
3. **Hooks** `.js` → `.ts` with generics (`useStateSelector`, the convenience hooks, the file-browser
   hooks).
4. **Contexts** → value `interface` + safe-consumer `use*` hook.
5. **Components** `.jsx` → `.tsx`: props interfaces, handler types, drop PropTypes.
6. **redux-observable** actions / reducers / epics.
7. **`main.js` / `preload.js`** → `.ts` last (Node side), matching the bridge types from step 1.
8. Rename `*.test.js(x)` → `*.test.ts(x)` alongside their subjects, and tighten ESLint
   (`no-explicit-any` → error) once the tree is clean.

## Progress (branch `feat/typescript-conversion`)

The conversion is **incremental and safe** — `allowJs` lets `.ts` and `.js` coexist, so each wave lands
green on its own and the remainder stays untouched. Done so far (**wave 1 — foundation + leaf factories**):

- ☑ **`src/types.ts`** — shared domain types (`DirectoryEntry`, `ImageFile`, `PathStat`, `ImageBytes`).
  (Named `ImageBytes`, not the brief's `ImageData`, to avoid the lib.dom `ImageData` global.)
- ☑ **`src/preload.d.ts`** — `Window.api` augmentation typing every `window.api.*` call site.
- ☑ **`src/imageMimeTypes.ts`** (+ `.test.ts`) — typed `Record<string, string>` map.
- ☑ **`src/components/imageLoader/createActionCreator.ts`** (+ `.test.ts`) — generic over `Payload`,
  with `Action<Payload>` / `ActionCreator<Payload>` interfaces; `Object.assign` augments the function
  with its static `.type` so no cast is needed.
- ☑ **`src/components/imageLoader/createReducer.ts`** (+ `.test.ts`) — generic over `State` and the
  action (minimal `{ type: string }` constraint — the reducer only dispatches on `type`).
- ☑ **ESLint fix (prereq):** `eslint-plugin-react`'s `version: "detect"` crashed on the first `.ts`
  file (it calls the `context.getFilename()` API removed in ESLint 9+). Pinned to `"19.2"` in
  `eslint.config.mjs`. Also added one documented `naming-convention` disable for `PathStat.exists`
  (mirrors the preload/`fs` API; renaming would churn the whole bridge).

**Verified:** `yarn typecheck` / `yarn lint` / `yarn test:run` (72) green; `yarn package` builds (the
preload's `./imageMimeTypes` import resolves now that it's `.ts`).

**Remaining waves** (still `.js`/`.jsx`, in suggested order): leaf `compareNaturalStrings`;
hooks (`useStateSelector` + the convenience/file-browser hooks); contexts → value `interface` + safe
`use*` hook; components `.jsx` → `.tsx` (props interfaces, handler types, drop PropTypes); the
redux-observable actions/reducers/epics; `main.js` / `preload.js` last. Then tighten
`no-explicit-any`/`no-non-null-assertion` to **error** and do the escape-hatch audit below.

## How to verify

- **`yarn typecheck`** (`tsc --noEmit`) — clean. This is near-empty today; it becomes the real gate
  once source is typed.
- **`yarn lint`** (Biome + typescript-eslint) — clean with the tightened `no-explicit-any` /
  `no-unnecessary-type-assertion` / `no-non-null-assertion` rules.
- **`yarn test`** (Vitest, jsdom) — green; renamed `.test.ts(x)` files still pass.
- **Escape-hatch audit** — grep the converted tree for `: any`, `<any`, `\bas \b`, and `unknown`.
  Every survivor must sit at a documented boundary (the IPC `invoke` cast, a guarded `unknown`
  payload). If you can't point to the boundary, it's a bug to fix, not a cast to keep.
