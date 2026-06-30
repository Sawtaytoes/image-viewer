# 2026-06-30 — Queue is summonable by touch

- **Status:** Locked
- **Date:** 2026-06-30
- **Deciders:** Kevin (owner) + agent
- **Source:** chat (2f36f0be)

## Decision (the rule)

Provide a touch-friendly way to summon the queue (e.g. drag down from anywhere). Since the top-nav queue auto-hides, make its hit target larger/easier to hit.

## What was rejected ("no, that's wrong")

A queue that's hard to summon via touch and an auto-hidden top-nav target too small to click reliably.

## Why

On touch there's no easy gesture to open the queue, and the auto-hidden top-nav target is too small to hit. A drag-down gesture plus a larger target fixes both.

## How to honor it

Add a touch gesture (drag down from anywhere) to open the queue, and enlarge the auto-hidden top-nav queue hit target.

## Evidence

"need an easier way to pull up queue via touch. Like drag down from anywhere."; "Since top-nav queue is auto-hidden, have it be larger, so it's easier to click." — chat (2f36f0be)

## Related

[[2026-06-04-multi-folder-queue-and-side-by-side-are-core]]
