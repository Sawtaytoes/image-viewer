# 2026-09-19 — Touch selection preserves the scroll position

- **Status:** Locked
- **Date:** 2026-09-19
- **Type:** UI / touch interaction / correction
- **Supersedes:** —
- **Superseded by:** —
- **Deciders:** Kevin (owner) + agent
- **Source:** current chat (chat ID not exposed to the agent)

## Decision

Selecting a folder by touch must preserve the file browser's current scroll position.

## Context

Touch selection rebuilt the virtualized grid's child nodes. The grid replaced its measurement state
even when every measurement stayed identical. That state replacement reran the keyboard focus scroll
for index 0 and moved the viewport to the top.

## What was rejected ("no, that's wrong")

Reapplying the keyboard selection index after a touch hold and scrolling the file browser back to
the top.

## Why

The selected folder can be far down a large directory. Moving to the top hides the folder and loses
the user's place immediately after the selection.

## How to honor it

Keep pointer-driven selection state independent from keyboard focus scrolling. In
`VirtualizedList`, do not replace `viewData` when a parent rerender produces new React child nodes
but the measured item size, item count and visible item count are unchanged.

## Evidence

"Touch highlighting items scrolled down also scrolls to the top. It should stay there" — current
chat, 2026-09-19 (chat ID not exposed)

## Related

[[2026-06-03-touch-first-is-the-whole-point]]
