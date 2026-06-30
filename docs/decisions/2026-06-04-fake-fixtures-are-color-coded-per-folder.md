# 2026-06-04 — Fake fixtures are color-coded per folder

- **Status:** Locked
- **Date:** 2026-06-04
- **Deciders:** Kevin (owner) + agent
- **Source:** chat (22200a96, 15c0cfc1)

## Decision (the rule)

Dev image fixtures are color-coded per folder (e.g. Cats = shades of red, Dogs = shades of blue, including the root) so you can tell which folder you're in at a glance; `yarn start:fake` must use GENERATED fakes, not real files on disk.

## What was rejected ("no, that's wrong")

Indistinguishable fakes; `start:fake` reading actual files on disk.

## Why

Per-folder color coding makes the active folder obvious while developing. `start:fake` reading real files defeats the purpose of having generated fixtures.

## How to honor it

Generate fakes with a per-folder color scheme (Cats red, Dogs blue, root included). Ensure `start:fake` sources generated fakes, never the real filesystem.

## Evidence

"Can the Cats folder have them all different shades of red, the Dogs different shades of Blue... so I can tell which folder I'm in"; "Your start:fake was looking at actual files too." — chat (22200a96, 15c0cfc1)
