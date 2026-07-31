import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react"
import { Observable } from "rxjs"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { DirectoryEntry } from "../../types"
import type { ImageLoaderContextValue } from "../imageLoader/ImageLoaderContext"
import ImageLoaderContext from "../imageLoader/ImageLoaderContext"
import type {
  ImageLoaderSelection,
  ImageLoaderState,
} from "../imageLoader/reducers"
import WorkspaceContext, {
  defaultWorkspaceContextValue,
} from "../workspace/WorkspaceContext"
import PaneGallery from "./PaneGallery"

// useStateSelector subscribes here; emit a blob URL for any path so every
// thumbnail renders an <img> (and is findable by its alt text). The Proxy hands
// back the same fake URL for whatever filePath the selector reads — typed
// through its own generic rather than cast, so it really is the slice shape the
// store publishes.
const fakeLoaderState: ImageLoaderState = {
  // Indexed off `ImageLoaderState` rather than restating the slice's type, so
  // the fake follows the store if the reducer's shape ever changes.
  downloadedFiles: new Proxy<
    ImageLoaderState["downloadedFiles"]
  >({}, { get: () => "blob:fake" }),
  downloadPercentages: {},
  filePathsQueue: {},
  imageDomElements: {},
  priorityQueue: {},
  processingQueue: {},
  referenceCounts: {},
  standbyQueue: {},
}

// A real `Observable` rather than a duck-typed `{ subscribe }`: the context is
// typed now, and `CreateStateObservable` says what it returns.
const imageLoaderValue: ImageLoaderContextValue = {
  createStateObservable: <
    Selected extends ImageLoaderSelection,
  >(
    stateSelector: (state: ImageLoaderState) => Selected,
  ) =>
    new Observable<Selected>((subscriber) => {
      subscriber.next(stateSelector(fakeLoaderState))
    }),
  releaseImage: () => {},
  retainImage: () => {},
  updateImageVisibility: () => {},
}

const FOLDER_PATH = "/cats"

// `modifiedTime` is part of the bridge's `DirectoryEntry`, so the fixtures
// carry it now — 0 is what the preload reports for an entry it couldn't stat,
// and the default (name) sort these tests run under never reads it.
const catsListing: DirectoryEntry[] = [
  {
    fileName: "Kittens",
    filePath: "/cats/Kittens",
    isDirectory: true,
    isFile: false,
    modifiedTime: 0,
  },
  {
    fileName: "cat-01.bmp",
    filePath: "/cats/cat-01.bmp",
    isDirectory: false,
    isFile: true,
    modifiedTime: 0,
  },
  {
    fileName: "cat-02.bmp",
    filePath: "/cats/cat-02.bmp",
    isDirectory: false,
    isFile: true,
    modifiedTime: 0,
  },
]

const kittensListing: DirectoryEntry[] = [
  {
    fileName: "kitten-01.bmp",
    filePath: "/cats/Kittens/kitten-01.bmp",
    isDirectory: false,
    isFile: true,
    modifiedTime: 0,
  },
]

const renderGallery = () => {
  const onClose = vi.fn()
  const onOpenImage = vi.fn()
  const addFoldersToQueue = vi.fn()

  window.api.readDirectory = (directoryPath: string) =>
    Promise.resolve(
      directoryPath === "/cats/Kittens"
        ? kittensListing
        : catsListing,
    )

  render(
    <ImageLoaderContext.Provider value={imageLoaderValue}>
      <WorkspaceContext.Provider
        value={{
          ...defaultWorkspaceContextValue,
          addFoldersToQueue,
        }}
      >
        <PaneGallery
          folderPath={FOLDER_PATH}
          onClose={onClose}
          onOpenImage={onOpenImage}
        />
      </WorkspaceContext.Provider>
    </ImageLoaderContext.Provider>,
  )

  return { addFoldersToQueue, onClose, onOpenImage }
}

describe("PaneGallery (in-pane gallery)", () => {
  afterEach(() => {
    window.api.readDirectory = () => Promise.resolve([])
  })

  it("opens the tapped image in this column at its index", async () => {
    const { onOpenImage } = renderGallery()

    // The second image tile (index 1 within the folder's image listing).
    const secondImage =
      await screen.findByAltText("cat-02.bmp")

    fireEvent.click(secondImage)

    expect(onOpenImage).toHaveBeenCalledWith(FOLDER_PATH, 1)
  })

  it("drills into a subfolder when its tile is tapped", async () => {
    renderGallery()

    // Wait for the cats listing, then drill into the subfolder; the subfolder's
    // image appearing (and the cats' images being gone) confirms the listing was
    // replaced rather than left stale during the read.
    await screen.findByAltText("cat-01.bmp")

    fireEvent.click(screen.getByText("Kittens"))

    await screen.findByAltText("kitten-01.bmp")

    expect(
      screen.queryByAltText("cat-01.bmp"),
    ).not.toBeInTheDocument()
  })

  it("leaves the gallery via the close control", async () => {
    const { onClose } = renderGallery()

    fireEvent.click(
      await screen.findByTitle("Close gallery"),
    )

    expect(onClose).toHaveBeenCalled()
  })
})
