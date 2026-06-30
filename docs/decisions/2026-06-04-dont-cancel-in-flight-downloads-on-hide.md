# 2026-06-04 — Don't cancel in-flight downloads on hide

- **Status:** Locked
- **Date:** 2026-06-04
- **Deciders:** Kevin (owner) + agent
- **Source:** commit db704ab

## Decision (the rule)

When an image tile hides, demote its download priority to standby — do NOT cancel an in-flight download. One download serves all panes.

## What was rejected ("no, that's wrong")

Cancelling the download on hide. It looks like correct cleanup but causes thrash given the small number of download slots.

## Why

A single download serves all panes, and slots are scarce. Cancelling on hide and re-requesting on show thrashes the limited slots instead of letting the in-flight fetch finish.

## How to honor it

On tile hide, lower the request priority to standby; never abort an in-flight download. Keep one shared download per image across panes.

## Evidence

Commit db704ab — demote-to-standby on hide rather than cancel.
