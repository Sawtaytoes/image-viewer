import { describe, expect, test } from "vitest"

import getImageMimeType from "./imageMimeTypes"

describe("getImageMimeType", () => {
  test("maps common image extensions to their MIME type", () => {
    expect(getImageMimeType(".png")).toBe("image/png")
    expect(getImageMimeType(".jpg")).toBe("image/jpeg")
    expect(getImageMimeType(".jpeg")).toBe("image/jpeg")
    expect(getImageMimeType(".webp")).toBe("image/webp")
    expect(getImageMimeType(".svg")).toBe("image/svg+xml")
  })

  test("collapses the jpeg-family extensions to image/jpeg", () => {
    expect(getImageMimeType(".jfif")).toBe("image/jpeg")
    expect(getImageMimeType(".pjp")).toBe("image/jpeg")
    expect(getImageMimeType(".pjpeg")).toBe("image/jpeg")
  })

  test("maps icon extensions to image/x-icon", () => {
    expect(getImageMimeType(".ico")).toBe("image/x-icon")
    expect(getImageMimeType(".cur")).toBe("image/x-icon")
  })

  test("maps HEIC/HEIF to their source MIME type (transcoded to JPEG in main)", () => {
    expect(getImageMimeType(".heic")).toBe("image/heic")
    expect(getImageMimeType(".heif")).toBe("image/heif")
  })

  test("is case-insensitive", () => {
    expect(getImageMimeType(".PNG")).toBe("image/png")
    expect(getImageMimeType(".JPeG")).toBe("image/jpeg")
  })

  test("falls back to application/octet-stream for unknown extensions", () => {
    expect(getImageMimeType(".xyz")).toBe(
      "application/octet-stream",
    )
    expect(getImageMimeType("")).toBe(
      "application/octet-stream",
    )
  })
})
