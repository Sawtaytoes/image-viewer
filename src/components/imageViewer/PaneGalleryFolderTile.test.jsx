import { render, screen } from "@testing-library/react"
import { act } from "react"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import MultiSelectContext from "../fileBrowser/MultiSelectContext"
import ImageLoaderContext from "../imageLoader/ImageLoaderContext"
import PaneGalleryFolderTile from "./PaneGalleryFolderTile"

// Hand any path a fake blob URL so a chosen thumbnail renders a findable <img>.
const imageLoaderValue = {
  createStateObservable: (selector) => ({
    subscribe: (onNext) => {
      onNext(
        selector({
          downloadedFiles: new Proxy(
            {},
            { get: () => "blob:fake" },
          ),
        }),
      )

      return { unsubscribe: () => {} }
    },
  }),
  updateImageVisibility: () => {},
}

const multiSelectValue = {
  enterMultiSelect: vi.fn(),
  isMultiSelectMode: false,
  selectedFolderPaths: new Set(),
  toggleFolder: vi.fn(),
}

const renderTile = () =>
  render(
    <ImageLoaderContext.Provider value={imageLoaderValue}>
      <MultiSelectContext.Provider value={multiSelectValue}>
        <PaneGalleryFolderTile
          directoryName="Folder"
          directoryPath="/folder"
          onOpen={() => {}}
        />
      </MultiSelectContext.Provider>
    </ImageLoaderContext.Provider>,
  )

describe("PaneGalleryFolderTile", () => {
  beforeEach(() => {
    // Report the tile as in view immediately so the thumbnail/gallery probe
    // runs (the global stub never intersects).
    globalThis.IntersectionObserver = class {
      constructor(callback) {
        this.callback = callback
      }

      observe() {
        this.callback([{ isIntersecting: true }])
      }

      unobserve() {}

      disconnect() {}
    }
  })

  afterEach(() => {
    window.api.findFirstImage = () => Promise.resolve(null)
  })

  it("shows a thumbnail for a folder that contains images", async () => {
    window.api.findFirstImage = () =>
      Promise.resolve({
        name: "photo.jpg",
        path: "/folder/photo.jpg",
      })

    renderTile()

    expect(
      await screen.findByAltText("photo.jpg"),
    ).toBeInTheDocument()
  })

  it("shows no thumbnail for a folder with no images at any depth", async () => {
    window.api.findFirstImage = () => Promise.resolve(null)

    renderTile()

    // Let the (resolved-null) probe settle, then confirm nothing rendered.
    await act(async () => {})

    expect(
      screen.queryByRole("img"),
    ).not.toBeInTheDocument()
  })
})
