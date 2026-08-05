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
// the way main passes them as argv. Note: each tab keeps its own in-memory queue
// (there's no shared main process), so a spawned viewer boots empty rather than
// mirroring this window's queue — enough to exercise the flow, not a full
// multi-window sync.
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

// No other windows exist in the browser, so "open elsewhere" is always empty
// and nothing ever changes it.
const openFolders = {
  get: (): Promise<string[]> => Promise.resolve([]),
  onChanged:
    (_callback: (paths: string[]) => void): (() => void) =>
    () => {},
  set: (_paths: string[]): void => {},
}

// In-memory single-window stand-in for main's shared queue. The renderer tracks
// its own queue optimistically and only reconciles via `onChanged`, so echoing
// the stored list back is enough.
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

const queue = {
  add: (folder: QueuedFolder): Promise<QueuedFolder> => {
    if (
      !liveQueue.some((entry) => entry.id === folder.id)
    ) {
      liveQueue = [...liveQueue, folder]
      emitQueue()
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
      emitQueue()
    }

    return Promise.resolve([...liveQueue])
  },
  clear: (): void => {
    liveQueue = []
    emitQueue()
  },
  clearSaved: (): Promise<void> => {
    savedQueue = null
    emitSaved()

    return Promise.resolve()
  },
  get: (): Promise<QueuedFolder[]> =>
    Promise.resolve([...liveQueue]),
  hasSaved: (): Promise<boolean> =>
    Promise.resolve(savedQueue !== null),
  load: (): Promise<QueuedFolder[]> => {
    liveQueue = savedQueue ? [...savedQueue] : []
    emitQueue()

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
    emitQueue()
  },
  save: (): Promise<boolean> => {
    savedQueue = [...liveQueue]
    emitSaved()

    return Promise.resolve(true)
  },
}

// Assemble and install `window.api`. MUST run before the renderer bundle is
// evaluated (provider modules read `window.api` at import time) — see
// `browserEntry.tsx`.
export const installBrowserApi = (): void => {
  const fakeFileSystem = createFakeFileSystem({
    path: posixPath,
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
