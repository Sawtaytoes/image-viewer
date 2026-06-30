# 2026-06-30 — Center click in multi-view opens the modal

- **Status:** Locked
- **Date:** 2026-06-30
- **Deciders:** Kevin (owner) + agent
- **Source:** chat (2f36f0be)

## Decision (the rule)

Clicking the CENTER of an image in multi-view opens the full-screen modal — NOT return to the gallery.

## What was rejected ("no, that's wrong")

Center-click navigating back to the gallery in multi-view.

## Why

In multi-view, a center tap should zoom into the image (full-screen modal), not exit back to the gallery. Returning to the gallery is the wrong destination for that gesture.

## How to honor it

In multi-view, map the center hit region of an image to opening the full-screen modal; reserve gallery navigation for other affordances.

## Evidence

"Multi-view click center needs to go to modal, not back to gallery." — chat (2f36f0be)

## Related

[[2026-06-04-context-menu-is-press-and-hold]]
