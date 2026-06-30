# 2026-05-07 — Commit and push as you go

- **Status:** Locked
- **Date:** 2026-05-07
- **Deciders:** Kevin (owner) + agent
- **Source:** media-sync / media-tools / gallery-downloader memory files (`feedback_commit_convention.md`, `feedback_commit_grouping.md`, `feedback_agents_md_discipline.md`). General working preference confirmed across the owner's projects; applies to image-viewer too.

_Cross-project preference, not specific to image-viewer._

## Decision (the rule)

Commit and push as you go — one logical group at a time, without asking. One commit per file when the SAME change repeats independently across files; one grouped commit when multiple files change for a SINGLE logical reason.

## What was rejected ("no, that's wrong")

Two failure modes the owner was frustrated by: (1) batching everything into one giant end-of-session commit, and (2) splitting a single logical multi-file change into per-file commits. Both make history hard to review.

## Why

Frequent, well-scoped commits keep the history reviewable and keep the owner unblocked — he can pull and inspect progress instead of waiting for one opaque dump.

## How to honor it

After each logical unit, commit and push without prompting. Group by reason, not by file count: a single refactor spanning N files = one commit; the same mechanical edit applied independently to N files = N commits. Don't hold changes back to the end.

## Evidence

> Keeps history reviewable and the owner unblocked. — media-sync/media-tools/gallery-downloader `feedback_commit_grouping.md`

## Related

[[2026-06-03-keep-the-docs-paper-trail]]
