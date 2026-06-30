# 2026-05-10 — No snapshot or screenshot tests

- **Status:** Locked
- **Date:** 2026-05-10
- **Deciders:** Kevin (owner) + agent
- **Source:** media-tools `memory/feedback_no_snapshot_tests.md`. General working preference confirmed across the owner's projects; applies to image-viewer too.

_Cross-project preference, not specific to image-viewer._

## Decision (the rule)

Write no snapshot tests and no screenshot/visual-regression tests. Assert explicit, inline expected values instead.

## What was rejected ("no, that's wrong")

`toMatchSnapshot` / `toMatchInlineSnapshot`, Playwright `toHaveScreenshot`, and Percy / Chromatic / Storybook screenshot addons. These were repeatedly added as a shortcut and pushed back on each time.

## Why

Snapshot and image-diff assertions are opaque: they pass by re-recording rather than by stating intent, rot into noise, and get blindly `--update`d. Explicit expected values document what the code should actually do. The owner repeated it in all-caps: "NO SNAPSHOT TESTS."

## How to honor it

In Vitest, assert concrete values (`expect(x).toBe(...)`, `toEqual({...})`) with literals written out. Never call `toMatchSnapshot`/`toMatchInlineSnapshot`. Add no visual-regression tooling or screenshot baselines to the repo or CI.

## Evidence

> "NO SNAPSHOT TESTS." — media-tools `memory/feedback_no_snapshot_tests.md`

## Related

[[2026-05-12-tests-match-the-change-scope]]
