// Browser-only assembly of the `window.api` bridge that `preload.js` provides
// under Electron. This lets the renderer run in a plain browser — for the T3
// Code preview or Playwright — backed by the in-memory fake filesystem
// (`fakeFileSystem.ts`) plus simulated window controls. It is loaded ONLY by
// `browserEntry.tsx`, which only `index.browser.html` loads, so the Electron
// build never sees it. See `docs/2026-08-05-run-in-a-browser.md`.

import { createFakeFileSystem } from "./fakeFileSystem"
import type { Display, QueuedFolder } from "./types"

// Pure POSIX `path`. The fake tree is built with "/" semantics (its root is "/"
// whenever `sep === "/"`), so the renderer's `path.*` calls must agree.
// Node's `path.posix` isn't in the browser; these mirror the members the
// renderer and the fake FS actually use.
const normalizePosix = (input: string): string => {
  const isAbsolute = input.startsWith("/")
  const stack: string[] = []

  for (const part of input.split("/")) {
    if (!part || part === ".") {
      continue
    }

    if (part === "..") {
      if (
        stack.length > 0 &&
        stack[stack.length - 1] !== ".."
      ) {
        stack.pop()
      } else if (!isAbsolute) {
        stack.push("..")
      }
    } else {
      stack.push(part)
    }
  }

  const joined = stack.join("/")

  return isAbsolute ? `/${joined}` : joined || "."
}

const posixBasename = (input: string): string => {
  const trimmed = input.replace(/\/+$/, "")
  const index = trimmed.lastIndexOf("/")

  return index >= 0 ? trimmed.slice(index + 1) : trimmed
}

const posixPath = {
  sep: "/",
  basename: posixBasename,
  dirname: (input: string): string => {
    const trimmed =
      input.replace(/\/+$/, "") ||
      (input.startsWith("/") ? "/" : "")
    const index = trimmed.lastIndexOf("/")

    if (index === -1) {
      return "."
    }

    return index === 0 ? "/" : trimmed.slice(0, index)
  },
  extname: (input: string): string => {
    const name = posixBasename(input)
    const index = name.lastIndexOf(".")

    return index > 0 ? name.slice(index) : ""
  },
  join: (...segments: string[]): string => {
    const joined = segments
      .filter((segment) => segment.length > 0)
      .join("/")

    return joined ? normalizePosix(joined) : "."
  },
  resolve: (...segments: string[]): string => {
    let resolved = ""
    let isAbsolute = false

    for (
      let index = segments.length - 1;
      index >= 0 && !isAbsolute;
      index -= 1
    ) {
      const segment = segments[index]

      if (!segment) {
        continue
      }

      resolved = resolved
        ? `${segment}/${resolved}`
        : segment
      isAbsolute = segment.startsWith("/")
    }

    return normalizePosix(
      isAbsolute ? resolved : `/${resolved}`,
    )
  },
}

// The OS colour scheme comes from the browser itself here (the Electron seam
// reads main's `nativeTheme`). `get` is the synchronous read the resolver needs;
// `onChanged` tracks light/dark flips — including the T3 preview's
// `prefers-color-scheme` emulation — and returns an unsubscribe.
const darkSchemeQuery = (): MediaQueryList =>
  window.matchMedia("(prefers-color-scheme: dark)")

const colorScheme = {
  get: (): "dark" | "light" =>
    darkSchemeQuery().matches ? "dark" : "light",
  onChanged: (callback: () => void): (() => void) => {
    const media = darkSchemeQuery()
    const listener = (): void => callback()

    media.addEventListener("change", listener)

    return () =>
      media.removeEventListener("change", listener)
  },
}

// Fullscreen state the in-app button toggles, broadcast to subscribers exactly
// like the Electron `window:fullScreenChanged` event so the renderer's layout
// (pinned title bar + inset browser) follows. `toggle` ALSO drives the browser's
// real Fullscreen API, so the preview goes genuinely fullscreen the way the
// packaged app does — best-effort, since a sandboxed iframe can refuse it, so the
// flag flips regardless and the layout always follows. `installBrowserApi` wires
// the `fullscreenchange` sync so leaving via Esc/F11 also exits the app layout.
let isFullScreenState = false
const fullScreenListeners = new Set<
  (isFullScreen: boolean) => void
>()

const setFullScreenState = (isNext: boolean): void => {
  if (isNext === isFullScreenState) {
    return
  }

  isFullScreenState = isNext

  for (const listener of fullScreenListeners) {
    listener(isFullScreenState)
  }
}

const fullScreen = {
  get: (): Promise<boolean> =>
    Promise.resolve(isFullScreenState),
  onChanged: (
    callback: (isFullScreen: boolean) => void,
  ): (() => void) => {
    fullScreenListeners.add(callback)

    return () => fullScreenListeners.delete(callback)
  },
  toggle: (): Promise<boolean> => {
    const isNext = !isFullScreenState

    try {
      if (isNext) {
        document.documentElement
          .requestFullscreen()
          .catch(() => {})
      } else if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    } catch {
      // No Fullscreen API (old browser) — the flag below still flips so the
      // layout follows.
    }

    setFullScreenState(isNext)

    return Promise.resolve(isNext)
  },
}

// A browser tab is one "window"; `createNewWindow` opens another tab at the same
// app, carrying the launch path (and the spawned-viewer flag) as query params
// the way main passes them as argv. The queue and "open elsewhere" set are
// shared across tabs via the `localStorage` + `BroadcastChannel` layer below, so
// a spawned viewer boots mirroring this window's queue rather than empty.
const createNewWindow = (payload: {
  filePath?: string
  displayId?: number
  // eslint-disable-next-line @typescript-eslint/naming-convention -- matches the bridge's payload field
  spawnedViewer?: boolean
}): void => {
  const url = new URL(window.location.href)

  url.search = ""

  if (payload.filePath) {
    url.searchParams.set("filePath", payload.filePath)
  }

  if (payload.spawnedViewer) {
    url.searchParams.set("spawnedViewer", "1")
  }

  window.open(url.toString(), "_blank", "noopener")
}

// One synthetic display (the browser's own screen) so the "spawn on another
// screen" menu is populated instead of "No displays detected". Selecting it just
// opens another tab via `createNewWindow`.
const getDisplays = (): Promise<Display[]> => {
  const width = window.screen?.width || 1920
  const height = window.screen?.height || 1080
  const rect = { height, width, x: 0, y: 0 }

  return Promise.resolve([
    {
      bounds: rect,
      id: 1,
      isPrimary: true,
      label: "This screen",
      resolutionLabel: `${width}×${height}`,
      workArea: rect,
    },
  ])
}

// Set on a tab opened with `?spawnedViewer=1` (see `createNewWindow`) so it boots
// into the viewer, mirroring the Electron `--spawnedViewer` argv flag.
const isSpawnedViewer = new URLSearchParams(
  window.location.search,
).has("spawnedViewer")

// --- Shared queue + open-folders backing (harness only) ---
//
// The Electron app shares the queue (and the "open elsewhere" set) through the
// main process; a browser tab has no main, so a window opened via
// `createNewWindow` (`window.open`, incl. `?spawnedViewer=1`) used to boot with
// an empty queue and could not mirror its source. Back the shared state with
// `localStorage` (a freshly-opened tab hydrates) plus a `BroadcastChannel` (open
// tabs update live), mirroring main's shared store closely enough to exercise
// the spawn-on-display flow. Both are best-effort: without them (an older or
// embedded browser) each tab keeps its own in-memory copy, exactly as before.
const QUEUE_STORAGE_KEY = "imageViewer.browser.queue"
const SAVED_QUEUE_STORAGE_KEY =
  "imageViewer.browser.savedQueue"
const OPEN_FOLDERS_STORAGE_KEY =
  "imageViewer.browser.openFolders"
const QUEUE_CHANNEL_NAME = "image-viewer-queue"

// This tab's identity, so its own open folders are never counted among the
// folders open *elsewhere* — the same per-window exclusion main does.
const tabId = crypto.randomUUID()

// Guarded reads/writes, matching `SettingsProvider`: a private-mode or disabled
// `localStorage` (or malformed JSON) degrades to the in-memory copy rather than
// throwing.
const readStored = <Value>(
  key: string,
  fallback: Value,
): Value => {
  try {
    const raw = window.localStorage.getItem(key)

    return raw === null
      ? fallback
      : (JSON.parse(raw) as Value)
  } catch {
    return fallback
  }
}

const writeStored = (key: string, value: unknown): void => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // No persistence — live tabs still sync via the channel below.
  }
}

// One channel carries all three kinds of update. Constructed once and guarded so
// an environment without `BroadcastChannel` degrades to per-tab silently.
type QueueBroadcastMessage =
  | { folders: QueuedFolder[]; kind: "queue" }
  | { folders: QueuedFolder[] | null; kind: "savedQueue" }
  | { kind: "openFolders"; paths: string[]; tabId: string }

const queueChannel: BroadcastChannel | null = (() => {
  try {
    return typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel(QUEUE_CHANNEL_NAME)
  } catch {
    return null
  }
})()

// The folders open in OTHER tabs (never this one), mirroring main's per-window
// tracking so a spawned viewer skips whatever another window already shows. Each
// tab reports its own paths under its `tabId`; the union of everyone else's is
// the "open elsewhere" set the workspace reads.
let ownOpenPaths: string[] = []
const othersOpenPaths = new Map<string, string[]>()
const openFolderListeners = new Set<
  (paths: string[]) => void
>()

const openFoldersElsewhere = (): string[] => [
  ...new Set(Array.from(othersOpenPaths.values()).flat()),
]

const emitOpenFolders = (): void => {
  const elsewhere = openFoldersElsewhere()

  for (const listener of openFolderListeners) {
    listener([...elsewhere])
  }
}

// Persist the full `tabId → paths` map so a freshly-opened tab hydrates what's
// already open elsewhere before anyone re-broadcasts.
const persistOpenFolders = (): void => {
  const stored = readStored<Record<string, string[]>>(
    OPEN_FOLDERS_STORAGE_KEY,
    {},
  )

  stored[tabId] = ownOpenPaths
  writeStored(OPEN_FOLDERS_STORAGE_KEY, stored)
}

const openFolders = {
  get: (): Promise<string[]> =>
    Promise.resolve(openFoldersElsewhere()),
  onChanged: (
    callback: (paths: string[]) => void,
  ): (() => void) => {
    openFolderListeners.add(callback)

    return () => openFolderListeners.delete(callback)
  },
  // Reporting this tab's own paths never changes its *own* "open elsewhere" set,
  // so it only persists and broadcasts — no local `emitOpenFolders`.
  set: (paths: string[]): void => {
    ownOpenPaths = [...paths]
    persistOpenFolders()
    queueChannel?.postMessage({
      kind: "openFolders",
      paths: ownOpenPaths,
      tabId,
    } satisfies QueueBroadcastMessage)
  },
}

// Mirror of main's shared queue, now backed by the `localStorage` +
// `BroadcastChannel` layer above so every tab sees the same live/saved queue.
// The renderer tracks its own queue optimistically and reconciles via
// `onChanged`, so echoing the stored list back is enough.
let liveQueue: QueuedFolder[] = []
let savedQueue: QueuedFolder[] | null = null
const queueListeners = new Set<
  (folders: QueuedFolder[]) => void
>()
const savedListeners = new Set<(isSaved: boolean) => void>()

const emitQueue = (): void => {
  for (const listener of queueListeners) {
    listener([...liveQueue])
  }
}

const emitSaved = (): void => {
  for (const listener of savedListeners) {
    listener(savedQueue !== null)
  }
}

// A local mutation, published everywhere: persist for fresh tabs, tell this
// tab's subscribers, then tell the other tabs (which replay via the channel
// handler onto THEIR subscribers). `BroadcastChannel` never echoes to the
// sender, so there is no loop.
const commitQueue = (): void => {
  writeStored(QUEUE_STORAGE_KEY, liveQueue)
  emitQueue()
  queueChannel?.postMessage({
    folders: liveQueue,
    kind: "queue",
  } satisfies QueueBroadcastMessage)
}

const commitSaved = (): void => {
  writeStored(SAVED_QUEUE_STORAGE_KEY, savedQueue)
  emitSaved()
  queueChannel?.postMessage({
    folders: savedQueue,
    kind: "savedQueue",
  } satisfies QueueBroadcastMessage)
}

const queue = {
  add: (folder: QueuedFolder): Promise<QueuedFolder> => {
    if (
      !liveQueue.some((entry) => entry.id === folder.id)
    ) {
      liveQueue = [...liveQueue, folder]
      commitQueue()
    }

    return Promise.resolve(folder)
  },
  addMany: (
    folders: QueuedFolder[],
  ): Promise<QueuedFolder[]> => {
    const additions = folders.filter(
      (folder) =>
        !liveQueue.some((entry) => entry.id === folder.id),
    )

    if (additions.length > 0) {
      liveQueue = [...liveQueue, ...additions]
      commitQueue()
    }

    return Promise.resolve([...liveQueue])
  },
  clear: (): void => {
    liveQueue = []
    commitQueue()
  },
  clearSaved: (): Promise<void> => {
    savedQueue = null
    commitSaved()

    return Promise.resolve()
  },
  get: (): Promise<QueuedFolder[]> =>
    Promise.resolve([...liveQueue]),
  hasSaved: (): Promise<boolean> =>
    Promise.resolve(savedQueue !== null),
  load: (): Promise<QueuedFolder[]> => {
    liveQueue = savedQueue ? [...savedQueue] : []
    commitQueue()

    return Promise.resolve([...liveQueue])
  },
  onChanged: (
    callback: (folders: QueuedFolder[]) => void,
  ): (() => void) => {
    queueListeners.add(callback)

    return () => queueListeners.delete(callback)
  },
  onSavedChanged: (
    callback: (isSaved: boolean) => void,
  ): (() => void) => {
    savedListeners.add(callback)

    return () => savedListeners.delete(callback)
  },
  remove: (folderId: string): void => {
    liveQueue = liveQueue.filter(
      (entry) => entry.id !== folderId,
    )
    commitQueue()
  },
  save: (): Promise<boolean> => {
    savedQueue = [...liveQueue]
    commitSaved()

    return Promise.resolve(true)
  },
}

// Replay another tab's update onto this tab: replace the mirrored state and fire
// this tab's subscribers, the way an Electron `*:changed` broadcast would. The
// channel never delivers a tab its own message, so `postMessage` above and this
// handler can't loop.
const handleQueueMessage = (
  message: QueueBroadcastMessage,
): void => {
  switch (message.kind) {
    case "queue": {
      liveQueue = message.folders
      emitQueue()

      break
    }
    case "savedQueue": {
      savedQueue = message.folders
      emitSaved()

      break
    }
    case "openFolders": {
      // Track everyone else's paths; a tab's own report is "here", not
      // "elsewhere" (and the channel wouldn't echo it anyway).
      if (message.tabId === tabId) {
        break
      }

      othersOpenPaths.set(message.tabId, message.paths)
      emitOpenFolders()

      break
    }
  }
}

// Assemble and install `window.api`. MUST run before the renderer bundle is
// evaluated (provider modules read `window.api` at import time) — see
// `browserEntry.tsx`.
export const installBrowserApi = (): void => {
  const fakeFileSystem = createFakeFileSystem({
    path: posixPath,
  })

  // Hydrate the shared queue + open-folders state from `localStorage` BEFORE the
  // renderer's providers read `window.api` — a tab spawned via `window.open`
  // boots with whatever the source tab last persisted rather than empty.
  liveQueue = readStored<QueuedFolder[]>(
    QUEUE_STORAGE_KEY,
    [],
  )
  savedQueue = readStored<QueuedFolder[] | null>(
    SAVED_QUEUE_STORAGE_KEY,
    null,
  )

  const storedOpenFolders = readStored<
    Record<string, string[]>
  >(OPEN_FOLDERS_STORAGE_KEY, {})

  for (const [storedTabId, paths] of Object.entries(
    storedOpenFolders,
  )) {
    // Everyone else's entry is "open elsewhere"; a stale entry left by this same
    // tabId (there is none on a fresh load) would wrongly count as elsewhere.
    if (storedTabId !== tabId) {
      othersOpenPaths.set(storedTabId, paths)
    }
  }

  // Live cross-tab updates: another tab's mutation replays onto this one.
  if (queueChannel) {
    queueChannel.onmessage = (
      event: MessageEvent<QueueBroadcastMessage>,
    ) => {
      handleQueueMessage(event.data)
    }
  }

  // Drop this tab's open-folders entry when it closes, so a folder it had open
  // does not linger as "open elsewhere" for the tabs that outlive it.
  window.addEventListener("beforeunload", () => {
    const stored = readStored<Record<string, string[]>>(
      OPEN_FOLDERS_STORAGE_KEY,
      {},
    )

    delete stored[tabId]
    writeStored(OPEN_FOLDERS_STORAGE_KEY, stored)
  })

  // Keep the fullscreen flag in step with the real Fullscreen API, so leaving
  // fullscreen with Esc/F11 (not the in-app button) also exits the app's
  // fullscreen layout.
  document.addEventListener("fullscreenchange", () => {
    setFullScreenState(Boolean(document.fullscreenElement))
  })

  const api: Window["api"] = {
    ...fakeFileSystem,
    colorScheme,
    createNewWindow,
    fullScreen,
    // The fake FS resolves `undefined` for an unseen folder; the bridge's
    // contract is `number | null`, so normalise the one gap.
    getFolderLastIndex: (folderPath) =>
      fakeFileSystem
        .getFolderLastIndex(folderPath)
        .then((index) => index ?? null),
    getDisplays,
    identifyDisplay: () => {},
    isSpawnedViewer,
    openFolders,
    path: posixPath,
    queue,
    stopIdentifyDisplay: () => {},
  }

  window.api = api
}

export default installBrowserApi
