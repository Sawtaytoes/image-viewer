# 2026-06-30 — Multi-view has delete and selection affordances

- **Status:** Locked
- **Date:** 2026-06-30
- **Deciders:** Kevin (owner) + agent
- **Source:** chat (2f36f0be)

## Decision (the rule)

Multi-view shows a delete affordance (delete icon, likely to the right of the modal) plus a way to remove an item from the queue and delete it; selected thumbnails show a selected-outline indicator.

## What was rejected ("no, that's wrong")

A missing delete icon in multi-view; a missing selected-thumbnail outline.

## Why

Multi-view lacked any way to delete or to remove a queued item, and selected thumbnails had no visible state. Users need both the action and the feedback.

## How to honor it

Add a delete icon in multi-view (likely right of the modal) with queue-remove + delete actions, and render a selected-outline indicator on selected thumbnails.

## Evidence

"Delete icon missing in multi-view... Need a way to remove an item from the queue and a way to delete it."; "Missing selected thumbnail outline." — chat (2f36f0be)
