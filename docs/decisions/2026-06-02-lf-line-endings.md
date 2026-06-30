# 2026-06-02 — Enforce LF line endings everywhere

- **Status:** Locked
- **Date:** 2026-06-02
- **Deciders:** Kevin (owner) + agent
- **Source:** commit ba238a4 "Normalize line endings to LF"; side-fix in ADR 0009

## Decision (the rule)

The working tree is LF everywhere, enforced by `.gitattributes` (`* text=auto eol=lf`) to match Biome `lineEnding: lf`.

## What was rejected ("no, that's wrong")

CRLF line endings (Windows `autocrlf`). They caused Biome to rewrite ~85 files on every lint.

## Why

With CRLF in the working tree, Biome's `lineEnding: lf` rewrote ~85 files on each run, producing constant churn. Normalizing to LF stops it.

## How to honor it

Keep `.gitattributes` set to `* text=auto eol=lf`. Don't let `autocrlf` reintroduce CRLF into the working tree.

## Evidence

commit ba238a4 "Normalize line endings to LF"; the `.gitattributes` side-fix noted in ADR 0009.
