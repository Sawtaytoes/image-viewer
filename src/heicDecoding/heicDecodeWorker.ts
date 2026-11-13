// The HEIC worker: an Electron `utilityProcess` that main starts on the first
// HEIC request (see heicDecodeQueue.ts). It decodes one file per message and
// replies with the JPEG bytes or an error message. Forge builds it as its own
// entry (forge.config.ts), to `heicDecodeWorker.js` beside `main.js`.

import { readFile } from "node:fs/promises"

import decodeHeicToJpeg from "./decodeHeicToJpeg"
import type {
  HeicDecodeReply,
  HeicDecodeRequest,
} from "./heicDecodeQueue"

const decodeRequest = async ({
  filePath,
  jobId,
}: HeicDecodeRequest): Promise<HeicDecodeReply> => {
  try {
    return {
      data: await decodeHeicToJpeg(
        await readFile(filePath),
      ),
      jobId,
    }
  } catch (error) {
    return {
      errorMessage:
        error instanceof Error
          ? error.message
          : String(error),
      jobId,
    }
  }
}

process.parentPort.on("message", ({ data }) => {
  const request: HeicDecodeRequest = data

  void decodeRequest(request).then((reply) => {
    process.parentPort.postMessage(reply)
  })
})
