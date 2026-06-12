import { describe, expect, it } from "vitest"

import getImageMimeType from "./imageMimeTypes"

describe("getImageMimeType", () => {
  it("maps common image extensions to their MIME type", () => {
    expect(getImageMimeType(".png")).toBe("image/png")
    expect(getImageMimeType(".jpg")).toBe("image/jpeg")
    expect(getImageMimeType(".jpeg")).toBe("image/jpeg")
    expect(getImageMimeType(".webp")).toBe("image/webp")
    expect(getImageMimeType(".svg")).toBe("image/svg+xml")
  })

  it("collapses the jpeg-family extensions to image/jpeg", () => {
    expect(getImageMimeType(".jfif")).toBe("image/jpeg")
    expect(getImageMimeType(".pjp")).toBe("image/jpeg")
    expect(getImageMimeType(".pjpeg")).toBe("image/jpeg")
  })

  it("maps icon extensions to image/x-icon", () => {
    expect(getImageMimeType(".ico")).toBe("image/x-icon")
    expect(getImageMimeType(".cur")).toBe("image/x-icon")
  })

  it("is case-insensitive", () => {
    expect(getImageMimeType(".PNG")).toBe("image/png")
    expect(getImageMimeType(".JPeG")).toBe("image/jpeg")
  })

  it("falls back to application/octet-stream for unknown extensions", () => {
    expect(getImageMimeType(".heic")).toBe(
      "application/octet-stream",
    )
    expect(getImageMimeType("")).toBe(
      "application/octet-stream",
    )
  })
})
