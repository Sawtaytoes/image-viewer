# 2026-06-04 — Multi-folder queue and side-by-side are core

- **Status:** Locked
- **Date:** 2026-06-04
- **Deciders:** Kevin (owner) + agent
- **Source:** chat (9c71b228, 4830e170); shipped as v2.0.0

## Decision (the rule)

The multi-folder queue + side-by-side(-by-side) panels are CORE features. Queue folders from the file browser via press-and-hold multi-select (with a fill animation); the queue header has a "clear queue" button; folders can be swapped between panels; removing/closing a folder drops it from the queue.

## What was rejected ("no, that's wrong")

Simplifying these features away; shipping without a clear-queue button.

## Why

Queueing folders and viewing them side-by-side is the point of v2.0.0. Press-and-hold multi-select and a clear-queue button are required ergonomics, not extras.

## How to honor it

Keep press-and-hold multi-select (with fill animation) for queueing, a clear-queue button in the queue header, panel swapping, and queue removal on folder close. Do not strip these.

## Evidence

"queue up a set of folders... press and hold (with animation)... triggers the 'select multiple' state"; "We also need a 'clear queue' button somewhere in the queue header." — chat (9c71b228, 4830e170)

## Related

[[2026-06-30-queue-is-summonable-by-touch]]
