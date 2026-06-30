# 2026-06-20 — Package as one-word ImageViewer

- **Status:** Locked
- **Date:** 2026-06-20
- **Deciders:** Kevin (owner) + agent
- **Source:** commit a37af79 "fix(build): emit one-word ImageViewer folder and executable names"; lineage 7c206c1 ("Image Viewer.exe") → 6b1649e ("Renamed to ImageViewer"); chat (e2bc889b). Reported 3+ times.

## Decision (the rule)

Packaged artifacts are ONE word: `ImageViewer-win32-x64/ImageViewer.exe`. Set `packagerConfig` `name`/`executableName` = "ImageViewer", independent of the spaced `productName` display label "Image Viewer".

## What was rejected ("no, that's wrong")

Emitting "Image Viewer" WITH a space in the output folder/exe.

## Why

The output folder and EXE name must be spaceless for clean paths, even though the display label keeps the space. Tying the artifact name to `productName` reintroduces the space.

## How to honor it

Don't "match" `executableName` to the spaced `productName` — that reintroduces the space. Keep `name`/`executableName` = "ImageViewer" while `productName` stays "Image Viewer".

## Evidence

"the output, last time I tried, was still adding a space 'Image Viewer' instead of no space on both the [folder] and EXE." — chat (e2bc889b)
