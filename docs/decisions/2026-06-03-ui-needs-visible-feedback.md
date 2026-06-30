# 2026-06-03 — UI needs visible feedback

- **Status:** Locked
- **Date:** 2026-06-03
- **Deciders:** Kevin (owner) + agent
- **Source:** chat (15c0cfc1, f8576b6b, 84c45e1e)

## Decision (the rule)

State changes need visible feedback. Animate opening/closing of panels, modals, and screen transitions; style anything clickable as a button.

## What was rejected ("no, that's wrong")

Instant/no animation on state changes; a clickable plain-text breadcrumb that didn't read as interactive.

## Why

Without animation the user can't tell what changed; without button affordance the user can't tell what's clickable.

## How to honor it

Add open/close animations on panels and modals. Give every clickable control a clear button affordance.

## Evidence

"Half the time, it's so fast, I can't tell what's happening"; "While the 'go back' arrow is a button, this one is not." — chat (15c0cfc1, f8576b6b, 84c45e1e)
