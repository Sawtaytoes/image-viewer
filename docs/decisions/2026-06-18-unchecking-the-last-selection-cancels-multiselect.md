# 2026-06-18 — Unchecking the last selection cancels multi-select

- **Status:** Locked
- **Date:** 2026-06-18
- **Deciders:** Kevin (owner) + agent
- **Source:** chat (ae35eb02)

## Decision (the rule)

In click-'n-hold multi-select mode, unchecking the LAST selected item auto-cancels the mode.

## What was rejected ("no, that's wrong")

Staying in multi-select with nothing selected and no Cancel button (Cancel only showed with a selection), leaving the user stuck.

## Why

The Cancel button only appears when something is selected, so an empty selection has no exit. Auto-cancelling on the last uncheck restores a way out.

## How to honor it

When a selection toggle drops the selected count to zero, exit multi-select mode automatically rather than waiting for a Cancel button that won't be shown.

## Evidence

"if I have nothing selected, then there's no cancel button... when I unchecked the last one, it would auto-cancel." — chat (ae35eb02)
