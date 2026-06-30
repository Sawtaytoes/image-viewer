# 2026-05-12 — Tests match the change scope

- **Status:** Locked
- **Date:** 2026-05-12
- **Deciders:** Kevin (owner) + agent
- **Source:** media-tools `memory/feedback_test_coverage_required.md`. General working preference confirmed across the owner's projects; applies to image-viewer too.

_Cross-project preference, not specific to image-viewer._

## Decision (the rule)

Tests are required and must match the change's scope: new feature → new tests; changed feature → updated tests; add e2e where a flow spans routes, modals, undo/redo, or drag-and-drop.

## What was rejected ("no, that's wrong")

Shipping functionality changes with no proportional test coverage — touching behavior and leaving tests stale or absent, or hand-waving "it works" without a test that proves it.

## Why

The owner uses the app and does not want to hit regressions himself: "I don't wanna be using the site and run into bugs." Coverage that tracks each change keeps multi-step flows from silently breaking.

## How to honor it

Before finishing a change, ask what behavior moved and add/adjust the matching Vitest tests. For cross-cutting flows (route → modal → undo/redo → DnD), add an e2e covering the whole path, not just a unit. Don't mark work done with bare or stale tests.

## Evidence

> "I don't wanna be using the site and run into bugs." — media-tools `memory/feedback_test_coverage_required.md`

## Related

[[2026-05-10-no-snapshot-or-screenshot-tests]]
