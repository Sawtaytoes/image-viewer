# 2026-06-20 — Mouse wheel changes the image under the cursor

- **Status:** Locked
- **Date:** 2026-06-20
- **Deciders:** Kevin (owner) + agent
- **Source:** chat (6c52a792); the current untracked `src/components/imageViewer/useWheelNavigation.js`

## Decision (the rule)

The mouse wheel (up/down) changes the current image, like the left/right arrows. In multi-view it controls whichever view the CURSOR is currently hovering over.

## What was rejected ("no, that's wrong")

The wheel doing nothing; or controlling a global/focused view instead of the hovered one.

## Why

The wheel should mirror arrow-key navigation. In multi-view the natural target is the view under the cursor, not a global or focused view the user isn't pointing at.

## How to honor it

In `useWheelNavigation.js`, route wheel up/down to the same step as left/right arrows, scoped to the view the pointer currently hovers over.

## Evidence

"Moving the middle mouse up and down should also change the current image like left and right"; "I want it to be the one where my mouse is currently over." — chat (6c52a792)
