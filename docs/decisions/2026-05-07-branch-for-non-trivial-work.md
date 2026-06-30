# 2026-05-07 — Branch for non-trivial work

- **Status:** Locked
- **Date:** 2026-05-07
- **Deciders:** Kevin (owner) + agent
- **Source:** media-tools-worker-buzzy `memory/feedback_branch_convention.md`. General working preference confirmed across the owner's projects; applies to image-viewer too.

_Cross-project preference, not specific to image-viewer._

## Decision (the rule)

Branch (`feature/<name>`) for any non-trivial work. Never commit directly to `master`, and never merge to `master` without an explicit instruction.

## What was rejected ("no, that's wrong")

Working directly on `master` — committing changes onto it instead of opening a feature branch first.

## Why

`master` must stay stable and merges must be deliberate. Branching isolates in-progress work and keeps the integration point under the owner's control. In the owner's words: "we shouldn't do any work directly in `master` from now on."

## How to honor it

Start non-trivial work by creating `feature/<name>` and committing there. Don't fast-forward or merge into `master` yourself; wait for the owner to say so. image-viewer's current working branch is `feat/typescript-conversion` — commit onto it, not `master`.

## Evidence

> "we shouldn't do any work directly in `master` from now on." — media-tools-worker-buzzy `memory/feedback_branch_convention.md`

## Related

[[2026-05-07-commit-and-push-as-you-go]]
