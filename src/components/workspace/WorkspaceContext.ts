import { createContext } from "react"

import type { QueuedFolder } from "../../types"

// One side-by-side column. Panes are per-window and ephemeral — there are none
// until a folder is opened into one, and closing the last drops back to the
// gallery — which is why `folderId` is nullable: an empty pane is the "Tap to
// pick folder" state, not a missing pane.
export interface Pane {
  currentIndex: number
  folderId: string | null
  id: string
}

// A folder identity before the queue mints its id. `Omit` rather than a fresh
// interface so the two can never drift: a queued folder IS this plus an id.
export type UnqueuedFolder = Omit<QueuedFolder, "id">

// What `WorkspaceProvider` supplies. The queue itself lives in the main process
// and is shared across windows (see `src/main.js`); `queuedFolders` is this
// window's mirror of it, while `panes` and `activePaneId` are this window's
// alone.
export interface WorkspaceContextValue {
  activePaneId: string | null
  // Queue one folder / many folders, deduped by path.
  addFolderToQueue: (folder: UnqueuedFolder) => void
  addFoldersToQueue: (folders: UnqueuedFolder[]) => void
  // Open an empty column. Returns the new pane so a caller can assign to it in
  // the same tick.
  addPane: () => Pane
  // Open a column and auto-fill it with the next queued folder not already open
  // here or in another window.
  addPaneAndFill: () => void
  // Queue a folder by path (reusing the entry if already queued) and open it in
  // the named pane at `imageIndex`.
  assignFolderPathToPane: (
    paneId: string,
    folder: UnqueuedFolder,
    imageIndex?: number,
  ) => void
  assignFolderToPane: (
    paneId: string,
    folderId: string,
  ) => void
  clearPanes: () => void
  clearQueue: () => void
  // Trash the folder on disk, then dequeue it. Resolves to whether it went.
  deleteFolder: (folderId: string) => Promise<boolean>
  // Whether a saved queue slot exists, so "Load queue" can enable.
  hasSavedQueue: boolean
  // Set briefly after a pane's gallery/menu closes, so the revealable chrome
  // ignores the synthetic pointer event that unmount fires.
  isChromeRevealSuppressed: boolean
  loadQueue: () => void
  panes: Pane[]
  queuedFolders: QueuedFolder[]
  removeFolder: (folderId: string) => void
  removePane: (paneId: string) => void
  saveQueue: () => Promise<boolean>
  setActivePaneId: (paneId: string | null) => void
  setPaneIndex: (paneId: string, index: number) => void
  suppressChromeReveal: () => void
}

// `createContext()` took no argument at all before, so the value was `undefined`
// and every one of the eight consumers destructured it on faith. A real default
// is given instead of `WorkspaceContextValue | undefined` for two reasons: it
// matches the two sibling contexts in this repo (`FullScreenContext`,
// `SettingsContext`), and it means a consumer reads a working no-op workspace
// outside a provider rather than needing a null check it would only ever write
// to satisfy the compiler.
//
// Exported so a test can render a partial provider by spreading it — with the
// value fully typed, a bare `{ panes: [] }` literal no longer typechecks.
export const defaultWorkspaceContextValue: WorkspaceContextValue =
  {
    activePaneId: null,
    addFolderToQueue: () => {},
    addFoldersToQueue: () => {},
    addPane: () => ({
      currentIndex: 0,
      folderId: null,
      id: "",
    }),
    addPaneAndFill: () => {},
    assignFolderPathToPane: () => {},
    assignFolderToPane: () => {},
    clearPanes: () => {},
    clearQueue: () => {},
    deleteFolder: () => Promise.resolve(false),
    hasSavedQueue: false,
    isChromeRevealSuppressed: false,
    loadQueue: () => {},
    panes: [],
    queuedFolders: [],
    removeFolder: () => {},
    removePane: () => {},
    saveQueue: () => Promise.resolve(false),
    setActivePaneId: () => {},
    setPaneIndex: () => {},
    suppressChromeReveal: () => {},
  }

const WorkspaceContext =
  createContext<WorkspaceContextValue>(
    defaultWorkspaceContextValue,
  )

export default WorkspaceContext
