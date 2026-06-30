# 2020-11-19 — Keep list virtualization in the file browser

- **Status:** Locked
- **Date:** 2020-11-19
- **Deciders:** Kevin (owner) + agent
- **Source:** commit a34a10d "Re-added list virtualization"; stabilization c1d0b60 / a1d55f3 / 78c5deb

## Decision (the rule)

The file browser renders with list virtualization (VirtualizedList). Keep it.

## What was rejected ("no, that's wrong")

Rendering every tile. Virtualization was removed once and had to be re-added.

## Why

Folders can be large; rendering every tile tanks performance.

## How to honor it

Don't "simplify" by removing virtualization or its scroll/measurement logic.

## Evidence

a34a10d "Re-added list virtualization" — it was removed once and brought back; c1d0b60 / a1d55f3 / 78c5deb stabilized it.
