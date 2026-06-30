# 2026-06-20 — Queue shows what is open in other views

- **Status:** Locked
- **Date:** 2026-06-20
- **Deciders:** Kevin (owner) + agent
- **Source:** chat (6c52a792)

## Decision (the rule)

The queue modal visually indicates which items are already open in OTHER views (not just a color indicator for the current view), so you don't re-open something already open.

## What was rejected ("no, that's wrong")

Only the current view having an indicator, with no way to tell what's open elsewhere.

## Why

With multiple views, the user needs to see everything that's already open to avoid re-opening a duplicate. A single current-view indicator hides the other views' state.

## How to honor it

In the queue modal, render a distinct indicator for items open in other views alongside the existing current-view color indicator.

## Evidence

"it would be nice to see which are already open in other views with some sort of indicator. You have a color indicator for the current view, but what about others?" — chat (6c52a792)
