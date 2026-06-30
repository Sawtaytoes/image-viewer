# 2026-06-04 — Context menu is press-and-hold

- **Status:** Locked
- **Date:** 2026-06-04
- **Deciders:** Kevin (owner) + agent
- **Source:** chat (67645b4d)

## Decision (the rule)

The folder/context menu opens on press-and-hold (after a debounce), NOT a plain click. Keep "tap the middle of an image returns to gallery view."

## What was rejected ("no, that's wrong")

Click-to-open context menu — it conflicts with tap-to-go-back on the middle of an image.

## Why

A plain click already means "go back to gallery." Overloading click to also open the context menu collides with that gesture; press-and-hold disambiguates.

## How to honor it

Gate the context menu on a press-and-hold timer; only show it after the debounce elapses. Preserve the center-tap-returns-to-gallery handler.

## Evidence

"the functionality that opens the context menu... should be a press and hold action. After the debounce is up, it should display that menu... Let's keep that [tap middle = gallery]." — chat (67645b4d)

## Related

[[2026-06-30-center-click-in-multiview-opens-the-modal]]
