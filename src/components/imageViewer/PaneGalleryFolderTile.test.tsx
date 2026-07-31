import { render, screen } from "@testing-library/react"
import { act } from "react"
import { Observable } from "rxjs"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import type { MultiSelectContextValue } from "../fileBrowser/MultiSelectContext"
import MultiSelectContext from "../fileBrowser/MultiSelectContext"
import type { ImageLoaderContextValue } from "../imageLoader/ImageLoaderContext"
import ImageLoaderContext from "../imageLoader/ImageLoaderContext"
import type {
  ImageLoaderSelection,
  ImageLoaderState,
} from "../imageLoader/reducers"
import PaneGalleryFolderTile from "./PaneGalleryFolderTile"

// Hand any path a fake blob URL so a chosen thumbnail renders a findable <img>.
// The Proxy is typed through its own generic rather than cast, so it really is
// the slice shape the store publishes.
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

const multiSelectValue: MultiSelectContextValue = {
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
    //
    // A real `implements IntersectionObserver` rather than a cast: the entry
    // the callback receives is a whole `IntersectionObserverEntry`, built from
    // the observed element, which is what lets this be assigned to
    // `globalThis.IntersectionObserver` with no `as`.
    globalThis.IntersectionObserver = class FakeIntersectionObserver
      implements IntersectionObserver
    {
      readonly callback: IntersectionObserverCallback
      readonly root: Element | null = null
      readonly rootMargin: string = ""
      readonly scrollMargin: string = ""
      readonly thresholds: readonly number[] = []

      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback
      }

      observe(target: Element) {
        const rect = target.getBoundingClientRect()

        this.callback(
          [
            {
              boundingClientRect: rect,
              intersectionRatio: 1,
              intersectionRect: rect,
              isIntersecting: true,
              // The v2 member `Image.tsx` declares (see its `declare
              // global`); this observer reports plain intersection, so the
              // two agree.
              isVisible: true,
              rootBounds: null,
              target,
              time: 0,
            },
          ],
          this,
        )
      }

      takeRecords(): IntersectionObserverEntry[] {
        return []
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
