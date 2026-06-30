# 2026-06-04 — Thumbnails keep full size in multi-panel

- **Status:** Locked
- **Date:** 2026-06-04
- **Deciders:** Kevin (owner) + agent
- **Source:** chat (4830e170)

## Decision (the rule)

Thumbnails keep their normal size regardless of how many panels are open — they must NOT scale down with panel width.

## What was rejected ("no, that's wrong")

Shrinking thumbnails proportionally to panel width in multi-panel layouts.

## Why

More panels meant smaller thumbnails, which caused huge performance issues. Fixed-size thumbnails avoid that scaling cost.

## How to honor it

Size thumbnails by a fixed dimension, not a fraction of panel width. Adding panels must not change thumbnail size.

## Evidence

"the more panels you have open, the smaller the thumbnails... That causes huge performance issues." — chat (4830e170)
