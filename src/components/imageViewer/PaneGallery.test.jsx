import {
  fireEvent,
  render,
  screen,
  waitForElementToBeRemoved,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import ImageLoaderContext from "../imageLoader/ImageLoaderContext"
import WorkspaceContext from "../workspace/WorkspaceContext"
import PaneGallery from "./PaneGallery"

// useStateSelector subscribes here; emit a blob URL for any path so every
// thumbnail renders an <img> (and is findable by its alt text). The Proxy hands
// back the same fake URL for whatever filePath the selector reads.
const fakeLoaderState = {
  downloadedFiles: new Proxy(
    {},
    { get: () => "blob:fake" },
  ),
}

const imageLoaderValue = {
  createStateObservable: (selector) => ({
    subscribe: (onNext) => {
      onNext(selector(fakeLoaderState))

      return { unsubscribe: () => {} }
    },
  }),
  updateImageVisibility: () => {},
}

const FOLDER_PATH = "/cats"

const catsListing = [
  {
    fileName: "Kittens",
    filePath: "/cats/Kittens",
    isDirectory: true,
    isFile: false,
  },
  {
    fileName: "cat-01.bmp",
    filePath: "/cats/cat-01.bmp",
    isDirectory: false,
    isFile: true,
  },
  {
    fileName: "cat-02.bmp",
    filePath: "/cats/cat-02.bmp",
    isDirectory: false,
    isFile: true,
  },
]

const kittensListing = [
  {
    fileName: "kitten-01.bmp",
    filePath: "/cats/Kittens/kitten-01.bmp",
    isDirectory: false,
    isFile: true,
  },
]

const renderGallery = () => {
  const onClose = vi.fn()
  const onOpenImage = vi.fn()
  const addFoldersToQueue = vi.fn()

  window.api.readDirectory = (directoryPath) =>
    Promise.resolve(
      directoryPath === "/cats/Kittens"
        ? kittensListing
        : catsListing,
    )

  render(
    <ImageLoaderContext.Provider value={imageLoaderValue}>
      <WorkspaceContext.Provider
        value={{ addFoldersToQueue }}
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

    // Wait for the cats listing, then drill into the subfolder; the cats'
    // images leaving confirms the listing was replaced.
    await screen.findByAltText("cat-01.bmp")

    fireEvent.click(screen.getByText("Kittens"))

    await waitForElementToBeRemoved(() =>
      screen.queryByAltText("cat-01.bmp"),
    )
  })

  it("leaves the gallery via the close control", async () => {
    const { onClose } = renderGallery()

    fireEvent.click(
      await screen.findByTitle("Close gallery"),
    )

    expect(onClose).toHaveBeenCalled()
  })
})
