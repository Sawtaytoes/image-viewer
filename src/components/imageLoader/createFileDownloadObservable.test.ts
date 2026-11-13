import {
  afterEach,
  describe,
  expect,
  test,
  vi,
} from "vitest"

import createFileDownloadObservable from "./createFileDownloadObservable"

const originalApi = window.api

afterEach(() => {
  window.api = originalApi
})

const stubApi = (
  readImageData: Window["api"]["readImageData"],
) => {
  const cancelReadImageData = vi.fn()

  window.api = {
    ...originalApi,
    cancelReadImageData,
    readImageData,
  }

  return cancelReadImageData
}

describe(createFileDownloadObservable.name, () => {
  test("cancels the read when the image stops being shown before it loads", () => {
    const readImageData = vi.fn<
      Window["api"]["readImageData"]
    >(() => new Promise(() => {}))
    const cancelReadImageData = stubApi(readImageData)

    const subscription = createFileDownloadObservable(
      "/photos/one.heic",
    ).subscribe()

    const requestId = readImageData.mock.calls[0]?.[2]

    expect(requestId).toEqual(expect.any(String))

    subscription.unsubscribe()

    expect(cancelReadImageData).toHaveBeenCalledWith(
      requestId,
    )
  })

  test("gives every read its own id", () => {
    const readImageData = vi.fn<
      Window["api"]["readImageData"]
    >(() => new Promise(() => {}))

    stubApi(readImageData)

    createFileDownloadObservable("/photos/one.heic")
      .subscribe()
      .unsubscribe()
    createFileDownloadObservable("/photos/one.heic")
      .subscribe()
      .unsubscribe()

    const [first, second] = readImageData.mock.calls.map(
      ([, , requestId]) => requestId,
    )

    expect(first).not.toBe(second)
    // A token for the page load, so ids differ after a reload too.
    expect(first).toMatch(/^image-read-[a-z0-9]+-\d+$/)
  })

  test("does not cancel a read that already finished", async () => {
    const cancelReadImageData = stubApi(() =>
      Promise.resolve({
        data: new ArrayBuffer(1),
        mimeType: "image/jpeg",
      }),
    )
    const updates: unknown[] = []

    await new Promise<void>((resolve) => {
      createFileDownloadObservable(
        "/photos/one.jpg",
      ).subscribe({
        complete: resolve,
        next: (update) => {
          updates.push(update)
        },
      })
    })

    expect(updates).toHaveLength(2)
    expect(cancelReadImageData).not.toHaveBeenCalled()
  })
})
