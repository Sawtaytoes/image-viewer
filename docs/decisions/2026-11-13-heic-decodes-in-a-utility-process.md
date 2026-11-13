# 2026-11-13 — HEIC decodes in a utility process, never in main

- **Status:** Locked
- **Date:** 2026-11-13
- **Type:** Architecture
- **Supersedes:** —
- **Superseded by:** —
- **Deciders:** Kevin (owner) + agent
- **Source:** 2026-11-12 fleet code audit finding; owner direction to fix the audit findings, 2026-11-13

## Decision (the rule)

Decode HEIC and HEIF in an Electron `utilityProcess` (`src/heicDecoding/heicDecodeWorker.ts`),
never in the main process. Main keeps the queue, the cache, and cancellation
(`src/heicDecoding/heicDecodeQueue.ts`): one decode at a time, requests for the same file share
one decode, and a decode that no window waits for any more is dropped, or, when it is running,
stopped by ending the worker. The output is unchanged: the same `heic-convert` call at JPEG
quality 0.92, cached by path and modification time.

## Context

The first HEIC support decoded in main with `heic-convert`, which is synchronous libheif WASM.
A 12-megapixel photo held main's thread for about four seconds (measured 3,987 ms on the audit
host), and every window's IPC waited behind it: listings, the queue, and the delete dialog all
froze while a gallery of iPhone photos loaded.

## What was rejected ("no, that's wrong")

- **Decoding in main, even lazily or with a cache.** The cache only helps the second time; the
  first view of each photo still blocks every window.
- **Decoding in the renderer or the preload.** The preload runs in each window's renderer
  process, so a decode there freezes that window's UI instead, and every window would load its
  own copy of libheif.
- **Letting a running decode finish after its image scrolled away.** It holds the only worker
  for seconds while the image now on screen waits. Ending the worker costs a restart of under a
  second, so cancel wins.

## Why

Main is shared by every window. Nothing slow and synchronous may run there. A utility process
is Electron's supported place for that work, and it also keeps a decoder crash from taking the
app down: a crash fails only the image being decoded.

## How to honor it

- Do not import `heic-convert` from `src/main.ts`. Only `decodeHeicToJpeg.ts`, which the worker
  imports, may load it.
- The worker is its own Forge build entry in `forge.config.ts`, built to `heicDecodeWorker.js`
  beside `main.js`. Moving or renaming it means changing both.
- A renderer read passes a `requestId` to `window.api.readImageData` and calls
  `window.api.cancelReadImageData(requestId)` when the image stops being shown
  (`createFileDownloadObservable.ts`). Main answers a canceled read with `null`, and the
  preload turns that into an `AbortError`, so routine cancels do not fill main's log.
- A window that closes, reloads, or crashes cancels its own reads.

## Evidence

> "Fix all those issues, look into and mark off those done cards, dedupe tasks, and fix those docs, etc."
> — owner, 2026-11-13, on the audit that found the blocking decode

## Related

[[2026-11-13-main-and-preload-are-typescript]] · [[2026-06-03-no-custom-protocol-read-image-bytes-in-preload]] ·
`docs/workers/feature-heic-support.md`
