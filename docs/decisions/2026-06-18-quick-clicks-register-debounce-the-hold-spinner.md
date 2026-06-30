# 2026-06-18 — Quick clicks register; debounce the hold spinner

- **Status:** Locked
- **Date:** 2026-06-18
- **Deciders:** Kevin (owner) + agent
- **Source:** chat (ae35eb02)

## Decision (the rule)

A quick click must register as a click (enter the folder). Debounce the click-'n-hold loading spinner so it does NOT appear on fast clicks or swallow the click.

## What was rejected ("no, that's wrong")

A spinner with no debounce that showed on a fast down/up and sometimes ate the click, so the folder wouldn't open.

## Why

A fast tap is a click, not a hold. If the spinner fires instantly it competes with the click and the navigation is lost — the user can't reliably enter folders.

## How to honor it

Gate the hold spinner behind a debounce timer started on pointer-down; cancel it on a quick pointer-up and fire the normal click/navigate path instead.

## Evidence

"there's no debounce before that shows, so if I do a down and up quickly, it still shows and sometimes, it doesn't even go into the folder because it didn't treat my 'click' as a click." — chat (ae35eb02)
