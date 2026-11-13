// @vitest-environment node
import { describe, expect, test } from "vitest"

import {
  createHeicDecodeQueue,
  type HeicDecodeRequest,
  type HeicDecodeWorkerEvents,
  isHeicDecodeReply,
} from "./heicDecodeQueue"

// A stand-in for the utility process: it records what it was asked to decode,
// and the test decides when each decode answers.
const createFakeWorkers = () => {
  const workers: {
    events: HeicDecodeWorkerEvents
    isKilled: boolean
    requests: HeicDecodeRequest[]
  }[] = []

  const spawnWorker = (events: HeicDecodeWorkerEvents) => {
    const worker = {
      events,
      isKilled: false,
      requests: [] as HeicDecodeRequest[],
    }

    workers.push(worker)

    return {
      kill: () => {
        worker.isKilled = true
        // A real process reports its exit after the kill.
        queueMicrotask(events.onExit)
      },
      postMessage: (request: HeicDecodeRequest) => {
        worker.requests.push(request)
      },
    }
  }

  const latestWorker = () => {
    const worker = workers.at(-1)

    if (!worker) {
      throw new Error("No worker was started.")
    }

    return worker
  }

  const answerLatest = (data: ArrayBuffer) => {
    const worker = latestWorker()
    const request = worker.requests.at(-1)

    if (!request) {
      throw new Error("The worker has no request.")
    }

    worker.events.onReply({ data, jobId: request.jobId })
  }

  return {
    answerLatest,
    latestWorker,
    spawnWorker,
    workers,
  }
}

const bytesOf = (...values: number[]) =>
  new Uint8Array(values).buffer

const flushPromises = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 0)
  })

const createQueue = (
  fakeWorkers: ReturnType<typeof createFakeWorkers>,
  {
    cacheMaxEntries,
    modifiedTimesByPath = {},
  }: {
    cacheMaxEntries?: number
    modifiedTimesByPath?: Record<string, number>
  } = {},
) =>
  createHeicDecodeQueue({
    cacheMaxEntries,
    getModifiedTime: (filePath) =>
      Promise.resolve(modifiedTimesByPath[filePath] ?? 1),
    spawnWorker: fakeWorkers.spawnWorker,
  })

describe(createHeicDecodeQueue.name, () => {
  test("decodes in the worker and resolves JPEG bytes", async () => {
    const fakeWorkers = createFakeWorkers()
    const queue = createQueue(fakeWorkers)

    const decoding = queue.decode({
      filePath: "/photos/a.heic",
      requestId: "1",
    })

    await flushPromises()

    expect(fakeWorkers.latestWorker().requests).toEqual([
      { filePath: "/photos/a.heic", jobId: 1 },
    ])

    fakeWorkers.answerLatest(bytesOf(0xff, 0xd8))

    const imageBytes = await decoding

    expect(imageBytes.mimeType).toBe("image/jpeg")
    expect([...new Uint8Array(imageBytes.data)]).toEqual([
      0xff, 0xd8,
    ])
  })

  test("starts no worker until the first request", () => {
    const fakeWorkers = createFakeWorkers()

    createQueue(fakeWorkers)

    expect(fakeWorkers.workers).toHaveLength(0)
  })

  test("decodes one image at a time, in request order", async () => {
    const fakeWorkers = createFakeWorkers()
    const queue = createQueue(fakeWorkers)

    const first = queue.decode({
      filePath: "/photos/a.heic",
      requestId: "1",
    })
    const second = queue.decode({
      filePath: "/photos/b.heic",
      requestId: "2",
    })

    await flushPromises()

    expect(
      fakeWorkers
        .latestWorker()
        .requests.map(({ filePath }) => filePath),
    ).toEqual(["/photos/a.heic"])

    fakeWorkers.answerLatest(bytesOf(1))
    await first

    expect(
      fakeWorkers
        .latestWorker()
        .requests.map(({ filePath }) => filePath),
    ).toEqual(["/photos/a.heic", "/photos/b.heic"])

    fakeWorkers.answerLatest(bytesOf(2))

    expect([
      ...new Uint8Array((await second).data),
    ]).toEqual([2])
    expect(fakeWorkers.workers).toHaveLength(1)
  })

  test("shares one decode between requests for the same file", async () => {
    const fakeWorkers = createFakeWorkers()
    const queue = createQueue(fakeWorkers)

    const first = queue.decode({
      filePath: "/photos/a.heic",
      requestId: "1",
    })
    const second = queue.decode({
      filePath: "/photos/a.heic",
      requestId: "2",
    })

    await flushPromises()
    fakeWorkers.answerLatest(bytesOf(7))

    await expect(first).resolves.toMatchObject({
      mimeType: "image/jpeg",
    })
    await expect(second).resolves.toMatchObject({
      mimeType: "image/jpeg",
    })
    expect(
      fakeWorkers.latestWorker().requests,
    ).toHaveLength(1)
  })

  test("serves a decoded file from the cache until it changes on disk", async () => {
    const fakeWorkers = createFakeWorkers()
    const modifiedTimesByPath = { "/photos/a.heic": 100 }
    const queue = createQueue(fakeWorkers, {
      modifiedTimesByPath,
    })

    const first = queue.decode({
      filePath: "/photos/a.heic",
      requestId: "1",
    })

    await flushPromises()
    fakeWorkers.answerLatest(bytesOf(1))
    await first

    await expect(
      queue.decode({
        filePath: "/photos/a.heic",
        requestId: "2",
      }),
    ).resolves.toMatchObject({ mimeType: "image/jpeg" })
    expect(
      fakeWorkers.latestWorker().requests,
    ).toHaveLength(1)

    modifiedTimesByPath["/photos/a.heic"] = 200

    const afterChange = queue.decode({
      filePath: "/photos/a.heic",
      requestId: "3",
    })

    await flushPromises()

    expect(
      fakeWorkers.latestWorker().requests,
    ).toHaveLength(2)

    fakeWorkers.answerLatest(bytesOf(2))
    await afterChange
  })

  test("evicts the least recently used image past the cache bound", async () => {
    const fakeWorkers = createFakeWorkers()
    const queue = createQueue(fakeWorkers, {
      cacheMaxEntries: 2,
    })

    // Answers the decode only when the request reached the worker, so a
    // cache hit is visible as no new request.
    const decodeAndAnswer = async (
      filePath: string,
      requestId: string,
    ) => {
      const requestCountBefore =
        fakeWorkers.workers.at(-1)?.requests.length ?? 0
      const decoding = queue.decode({ filePath, requestId })

      await flushPromises()

      if (
        (fakeWorkers.workers.at(-1)?.requests.length ?? 0) >
        requestCountBefore
      ) {
        fakeWorkers.answerLatest(bytesOf(1))
      }

      return decoding
    }

    await decodeAndAnswer("/a.heic", "1")
    await decodeAndAnswer("/b.heic", "2")
    // Touch a, so b is now the least recently used.
    await decodeAndAnswer("/a.heic", "3")
    await decodeAndAnswer("/c.heic", "4")

    const decodedPaths = () =>
      fakeWorkers
        .latestWorker()
        .requests.map(({ filePath }) => filePath)

    expect(decodedPaths()).toEqual([
      "/a.heic",
      "/b.heic",
      "/c.heic",
    ])

    await decodeAndAnswer("/a.heic", "5")

    expect(decodedPaths()).toHaveLength(3)

    await decodeAndAnswer("/b.heic", "6")

    expect(decodedPaths()).toEqual([
      "/a.heic",
      "/b.heic",
      "/c.heic",
      "/b.heic",
    ])
  })

  test("drops a queued decode when its only request is canceled", async () => {
    const fakeWorkers = createFakeWorkers()
    const queue = createQueue(fakeWorkers)

    const first = queue.decode({
      filePath: "/photos/a.heic",
      requestId: "1",
    })
    const second = queue.decode({
      filePath: "/photos/b.heic",
      requestId: "2",
    })
    const third = queue.decode({
      filePath: "/photos/c.heic",
      requestId: "3",
    })

    await flushPromises()

    queue.cancel("2")

    await expect(second).rejects.toMatchObject({
      name: "AbortError",
    })

    fakeWorkers.answerLatest(bytesOf(1))
    await first

    expect(
      fakeWorkers
        .latestWorker()
        .requests.map(({ filePath }) => filePath),
    ).toEqual(["/photos/a.heic", "/photos/c.heic"])

    fakeWorkers.answerLatest(bytesOf(3))
    await third
  })

  test("keeps a decode that another request still waits for", async () => {
    const fakeWorkers = createFakeWorkers()
    const queue = createQueue(fakeWorkers)

    const first = queue.decode({
      filePath: "/photos/a.heic",
      requestId: "1",
    })
    const second = queue.decode({
      filePath: "/photos/a.heic",
      requestId: "2",
    })

    await flushPromises()

    queue.cancel("1")

    await expect(first).rejects.toMatchObject({
      name: "AbortError",
    })
    expect(fakeWorkers.latestWorker().isKilled).toBe(false)

    fakeWorkers.answerLatest(bytesOf(1))

    await expect(second).resolves.toMatchObject({
      mimeType: "image/jpeg",
    })
  })

  test("ends the worker when nobody waits for the running decode, and starts a new one for the next", async () => {
    const fakeWorkers = createFakeWorkers()
    const queue = createQueue(fakeWorkers)

    const first = queue.decode({
      filePath: "/photos/a.heic",
      requestId: "1",
    })
    const second = queue.decode({
      filePath: "/photos/b.heic",
      requestId: "2",
    })

    await flushPromises()

    queue.cancel("1")

    await expect(first).rejects.toMatchObject({
      name: "AbortError",
    })

    const [stoppedWorker, nextWorker] = fakeWorkers.workers

    expect(stoppedWorker?.isKilled).toBe(true)
    expect(nextWorker?.requests).toEqual([
      { filePath: "/photos/b.heic", jobId: 2 },
    ])

    // A late answer from the stopped worker changes nothing.
    stoppedWorker?.events.onReply({
      data: bytesOf(9),
      jobId: 1,
    })
    fakeWorkers.answerLatest(bytesOf(2))

    expect([
      ...new Uint8Array((await second).data),
    ]).toEqual([2])

    await flushPromises()

    // The stopped worker's exit did not fail the new worker's job or start a
    // third worker.
    expect(fakeWorkers.workers).toHaveLength(2)
  })

  test("cancels a request that is still waiting on its stat", async () => {
    const fakeWorkers = createFakeWorkers()
    const queue = createQueue(fakeWorkers)

    const decoding = queue.decode({
      filePath: "/photos/a.heic",
      requestId: "1",
    })

    queue.cancel("1")

    await expect(decoding).rejects.toMatchObject({
      name: "AbortError",
    })

    await flushPromises()

    expect(fakeWorkers.workers).toHaveLength(0)
  })

  test("ignores a cancel for a request it does not know", () => {
    const fakeWorkers = createFakeWorkers()
    const queue = createQueue(fakeWorkers)

    expect(() => {
      queue.cancel("unknown")
    }).not.toThrow()
  })

  test("fails only the running image when the worker crashes, then carries on", async () => {
    const fakeWorkers = createFakeWorkers()
    const queue = createQueue(fakeWorkers)

    const first = queue.decode({
      filePath: "/photos/broken.heic",
      requestId: "1",
    })
    const second = queue.decode({
      filePath: "/photos/b.heic",
      requestId: "2",
    })

    await flushPromises()

    fakeWorkers.latestWorker().events.onExit()

    await expect(first).rejects.toThrow(
      "The HEIC decoder stopped",
    )

    expect(fakeWorkers.workers).toHaveLength(2)

    fakeWorkers.answerLatest(bytesOf(2))

    await expect(second).resolves.toMatchObject({
      mimeType: "image/jpeg",
    })
  })

  test("passes on a decode error and keeps the worker", async () => {
    const fakeWorkers = createFakeWorkers()
    const queue = createQueue(fakeWorkers)

    const decoding = queue.decode({
      filePath: "/photos/not-heic.heic",
      requestId: "1",
    })

    await flushPromises()

    fakeWorkers.latestWorker().events.onReply({
      errorMessage: "Unsupported file",
      jobId: 1,
    })

    await expect(decoding).rejects.toThrow(
      "Unsupported file",
    )
    expect(fakeWorkers.latestWorker().isKilled).toBe(false)
  })

  test("fails the request when the file cannot be stat'd", async () => {
    const queue = createHeicDecodeQueue({
      getModifiedTime: () =>
        Promise.reject(new Error("ENOENT")),
      spawnWorker: createFakeWorkers().spawnWorker,
    })

    await expect(
      queue.decode({
        filePath: "/photos/missing.heic",
        requestId: "1",
      }),
    ).rejects.toThrow("ENOENT")
  })

  test("fails the request when the worker cannot start", async () => {
    const queue = createHeicDecodeQueue({
      getModifiedTime: () => Promise.resolve(1),
      spawnWorker: () => {
        throw new Error("fork failed")
      },
    })

    await expect(
      queue.decode({
        filePath: "/photos/a.heic",
        requestId: "1",
      }),
    ).rejects.toThrow("fork failed")
  })
})

describe(isHeicDecodeReply.name, () => {
  test("accepts the two reply shapes", () => {
    expect(
      isHeicDecodeReply({ data: bytesOf(1), jobId: 1 }),
    ).toBe(true)
    expect(
      isHeicDecodeReply({ errorMessage: "bad", jobId: 1 }),
    ).toBe(true)
  })

  test("rejects anything else", () => {
    expect(isHeicDecodeReply(null)).toBe(false)
    expect(isHeicDecodeReply({ jobId: 1 })).toBe(false)
    expect(isHeicDecodeReply({ data: "x", jobId: 1 })).toBe(
      false,
    )
    expect(
      isHeicDecodeReply({ data: bytesOf(1), jobId: "1" }),
    ).toBe(false)
  })
})
