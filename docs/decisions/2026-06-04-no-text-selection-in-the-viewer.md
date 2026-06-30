# 2026-06-04 — No text selection in the viewer

- **Status:** Locked
- **Date:** 2026-06-04
- **Deciders:** Kevin (owner) + agent
- **Source:** commit 8e14f7a

## Decision (the rule)

The viewer container is `user-select: none` — a fast double-tap must not text-select/highlight the fullscreen image.

## What was rejected ("no, that's wrong")

Leaving text selection enabled, which let a fast double-tap select/highlight the image.

## Why

A quick double-click was selecting the fullscreen image like text, which looks broken. Disabling selection on the container stops the highlight.

## How to honor it

Keep `user-select: none` on the viewer container. Don't drop it when refactoring styles.

## Evidence

"I'm able to highlight the images in the fullscreen view if I double-click too fast." — commit 8e14f7a
