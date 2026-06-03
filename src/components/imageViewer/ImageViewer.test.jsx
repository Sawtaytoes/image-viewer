import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import WorkspaceProvider from "../workspace/WorkspaceProvider"
import ImageViewer from "./ImageViewer"
import ImageViewerProvider from "./ImageViewerProvider"

// Smoke test for the whole columns viewer module graph (Pane, RevealableChrome,
// TapFeedback, ImageView, hooks). With no panes and no legacy image open the
// viewer stays out of the way so the gallery shows.
describe("ImageViewer", () => {
  it("renders nothing when no panes and no image are open", () => {
    const { container } = render(
      <WorkspaceProvider>
        <ImageViewerProvider>
          <ImageViewer />
        </ImageViewerProvider>
      </WorkspaceProvider>,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
