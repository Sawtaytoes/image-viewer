import convert from "heic-convert"

// The JPEG quality the app has always used for a decoded HEIC.
export const heicJpegQuality = 0.92

// Decodes HEIC/HEIF bytes to JPEG bytes. Synchronous WASM under the promise, so
// it runs in the HEIC worker process, never in main (see heicDecodeQueue.ts).
const decodeHeicToJpeg = async (
  heicBytes: Uint8Array,
): Promise<ArrayBuffer> => {
  const jpegBytes = await convert({
    buffer: heicBytes,
    format: "JPEG",
    quality: heicJpegQuality,
  })

  // `convert` hands back a Node Buffer, which can be a view into a larger
  // shared pool, and whose `slice` is a view too. Copy exactly this image's
  // bytes into their own ArrayBuffer, so main gets only the JPEG.
  return new Uint8Array(jpegBytes).buffer
}

export default decodeHeicToJpeg
