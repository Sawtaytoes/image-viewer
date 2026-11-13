// HEIC/HEIF decoding for the main process, run in a separate process.
//
// Chromium cannot render HEIC, so the preload sends `.heic`/`.heif` reads to
// main, and main hands back JPEG bytes. The decode is `heic-convert` (libheif
// compiled to WASM), and it is synchronous: a 12-megapixel iPhone photo holds
// the thread for about four seconds. In the main process that froze IPC for
// every window. This queue keeps main free: the decode runs in a worker process
// (an Electron `utilityProcess`, see `heicDecodeWorker.ts`), one image at a
// time, and main only stats files, keeps the cache, and passes messages.
//
// - Requests for the same file and modification time share one decode.
// - Decoded JPEGs are cached by path and modification time, with an LRU bound,
//   so browsing back to a folder does not decode it again.
// - A request is canceled when its image is no longer shown. A queued decode
//   that nobody waits for any more is dropped. A running one is stopped by
//   ending the worker process, because a WASM decode cannot be interrupted;
//   the next decode starts a new worker.
// - A worker that crashes fails only the image it was decoding.
//
// This module is pure: it gets the worker and the file's modification time
// through its arguments, so the tests run it without Electron.

import type { ImageBytes } from "../types"

export interface HeicDecodeRequest {
  filePath: string
  jobId: number
}

export type HeicDecodeReply =
  | {
      data: ArrayBuffer
      jobId: number
    }
  | {
      errorMessage: string
      jobId: number
    }

export interface HeicDecodeWorker {
  kill: () => void
  postMessage: (request: HeicDecodeRequest) => void
}

export interface HeicDecodeWorkerEvents {
  // The worker process ended, on its own or after `kill`.
  onExit: () => void
  onReply: (reply: HeicDecodeReply) => void
}

export type SpawnHeicDecodeWorker = (
  events: HeicDecodeWorkerEvents,
) => HeicDecodeWorker

export interface HeicDecodeQueue {
  cancel: (requestId: string) => void
  decode: (request: {
    filePath: string
    requestId: string
  }) => Promise<ImageBytes>
}

export const defaultHeicCacheMaxEntries = 64

export const heicCanceledErrorName = "AbortError"

const createCanceledError = () => {
  const error = new Error("The HEIC decode was canceled.")

  error.name = heicCanceledErrorName

  return error
}

// What the worker sends back is untyped once it crosses the process boundary.
export const isHeicDecodeReply = (
  value: unknown,
): value is HeicDecodeReply =>
  typeof value === "object" &&
  value !== null &&
  "jobId" in value &&
  typeof value.jobId === "number" &&
  (("data" in value && value.data instanceof ArrayBuffer) ||
    ("errorMessage" in value &&
      typeof value.errorMessage === "string"))

interface Waiter {
  reject: (error: Error) => void
  resolve: (imageBytes: ImageBytes) => void
}

interface DecodeJob {
  cacheKey: string
  filePath: string
  jobId: number
  waitersByRequestId: Map<string, Waiter>
}

export const createHeicDecodeQueue = ({
  cacheMaxEntries = defaultHeicCacheMaxEntries,
  getModifiedTime,
  spawnWorker,
}: {
  cacheMaxEntries?: number
  getModifiedTime: (filePath: string) => Promise<number>
  spawnWorker: SpawnHeicDecodeWorker
}): HeicDecodeQueue => {
  const cachedJpegsByKey = new Map<string, ArrayBuffer>()
  const jobsByCacheKey = new Map<string, DecodeJob>()
  const jobsByRequestId = new Map<string, DecodeJob>()
  // Requests still waiting on their `stat`, which have no job yet.
  const cancelBeforeQueuedByRequestId = new Map<
    string,
    () => void
  >()
  const pendingJobs: DecodeJob[] = []

  let nextJobId = 1
  let runningJob: DecodeJob | null = null
  let worker: HeicDecodeWorker | null = null

  const cacheJpeg = (
    cacheKey: string,
    data: ArrayBuffer,
  ) => {
    cachedJpegsByKey.set(cacheKey, data)

    if (cachedJpegsByKey.size > cacheMaxEntries) {
      // Map keeps insertion order, so the first key is the least recently
      // used one.
      const [oldestKey] = cachedJpegsByKey.keys()

      if (oldestKey !== undefined) {
        cachedJpegsByKey.delete(oldestKey)
      }
    }
  }

  const readCachedJpeg = (cacheKey: string) => {
    const data = cachedJpegsByKey.get(cacheKey)

    if (data) {
      // Delete and set again to make it the most recently used.
      cachedJpegsByKey.delete(cacheKey)
      cachedJpegsByKey.set(cacheKey, data)
    }

    return data
  }

  const forgetJob = (job: DecodeJob) => {
    jobsByCacheKey.delete(job.cacheKey)

    for (const requestId of job.waitersByRequestId.keys()) {
      jobsByRequestId.delete(requestId)
    }
  }

  const finishRunningJob = (
    settleWaiter: (waiter: Waiter) => void,
  ) => {
    const job = runningJob

    runningJob = null

    if (job) {
      forgetJob(job)

      for (const waiter of job.waitersByRequestId.values()) {
        settleWaiter(waiter)
      }
    }

    startNextJob()
  }

  const startWorker = (): HeicDecodeWorker => {
    const spawnedWorker = spawnWorker({
      onExit: () => {
        // A worker this queue already let go of (killed on cancel) is not
        // news.
        if (worker !== spawnedWorker) {
          return
        }

        worker = null

        finishRunningJob((waiter) => {
          waiter.reject(
            new Error(
              "The HEIC decoder stopped while it decoded this image.",
            ),
          )
        })
      },
      onReply: (reply) => {
        if (
          worker !== spawnedWorker ||
          runningJob?.jobId !== reply.jobId
        ) {
          return
        }

        if ("errorMessage" in reply) {
          finishRunningJob((waiter) => {
            waiter.reject(new Error(reply.errorMessage))
          })

          return
        }

        if (runningJob) {
          cacheJpeg(runningJob.cacheKey, reply.data)
        }

        finishRunningJob((waiter) => {
          waiter.resolve({
            data: reply.data,
            mimeType: "image/jpeg",
          })
        })
      },
    })

    return spawnedWorker
  }

  const startNextJob = () => {
    if (runningJob) {
      return
    }

    const job = pendingJobs.shift()

    if (!job) {
      return
    }

    runningJob = job

    try {
      worker ??= startWorker()
      worker.postMessage({
        filePath: job.filePath,
        jobId: job.jobId,
      })
    } catch (error) {
      worker = null

      finishRunningJob((waiter) => {
        waiter.reject(
          error instanceof Error
            ? error
            : new Error(String(error)),
        )
      })
    }
  }

  const decode: HeicDecodeQueue["decode"] = async ({
    filePath,
    requestId,
  }) => {
    let isCanceled = false

    cancelBeforeQueuedByRequestId.set(requestId, () => {
      isCanceled = true
    })

    let modifiedTime: number

    try {
      modifiedTime = await getModifiedTime(filePath)
    } finally {
      cancelBeforeQueuedByRequestId.delete(requestId)
    }

    if (isCanceled) {
      throw createCanceledError()
    }

    const cacheKey = `${filePath}:${modifiedTime}`
    const cachedJpeg = readCachedJpeg(cacheKey)

    if (cachedJpeg) {
      return {
        data: cachedJpeg,
        mimeType: "image/jpeg",
      }
    }

    return new Promise<ImageBytes>((resolve, reject) => {
      const existingJob = jobsByCacheKey.get(cacheKey)
      const job: DecodeJob = existingJob ?? {
        cacheKey,
        filePath,
        jobId: nextJobId++,
        waitersByRequestId: new Map(),
      }

      job.waitersByRequestId.set(requestId, {
        reject,
        resolve,
      })
      jobsByRequestId.set(requestId, job)

      if (!existingJob) {
        jobsByCacheKey.set(cacheKey, job)
        pendingJobs.push(job)
        startNextJob()
      }
    })
  }

  const cancel: HeicDecodeQueue["cancel"] = (requestId) => {
    cancelBeforeQueuedByRequestId.get(requestId)?.()

    const job = jobsByRequestId.get(requestId)

    if (!job) {
      return
    }

    const waiter = job.waitersByRequestId.get(requestId)

    jobsByRequestId.delete(requestId)
    job.waitersByRequestId.delete(requestId)
    waiter?.reject(createCanceledError())

    if (job.waitersByRequestId.size > 0) {
      return
    }

    jobsByCacheKey.delete(job.cacheKey)

    if (job !== runningJob) {
      const pendingIndex = pendingJobs.indexOf(job)

      if (pendingIndex >= 0) {
        pendingJobs.splice(pendingIndex, 1)
      }

      return
    }

    // Nobody waits for the image being decoded. The decode cannot be
    // interrupted, so end the worker; the next job starts a new one.
    const stoppedWorker = worker

    worker = null
    runningJob = null
    stoppedWorker?.kill()

    startNextJob()
  }

  return { cancel, decode }
}
