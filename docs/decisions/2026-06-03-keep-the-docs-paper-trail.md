# 2026-06-03 — Keep the docs paper trail

- **Status:** Locked
- **Date:** 2026-06-03
- **Deciders:** Kevin (owner) + agent
- **Source:** chat (870e2aa9, 77f75e91, 61528c25)

## Decision (the rule)

Maintain the docs paper trail: general steps in `docs/`, agent/worker prompts in `docs/workers/`, decision rationale in `docs/decisions/` (formerly `docs/research/`), plus a slim `AGENTS.md`. Commit and push in chunks representing the work done, and commit only your OWN changes.

## What was rejected ("no, that's wrong")

One big end-of-session commit; sweeping unrelated working-tree files into commits.

## Why

A scoped paper trail keeps rationale discoverable and keeps commits reviewable. Mixing in unrelated changes muddies history.

## How to honor it

Keep this `docs/decisions/` directory as part of the trail; use `TEMPLATE.md` for new decisions; commit and push only your own changes in chunks.

## Evidence

"commit and push only your changes." — chat (870e2aa9, 77f75e91, 61528c25)

## Related

[[2026-05-07-commit-and-push-as-you-go]]
