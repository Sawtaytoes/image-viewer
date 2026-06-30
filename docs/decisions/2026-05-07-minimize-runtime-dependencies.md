# 2026-05-07 — Minimize runtime dependencies

- **Status:** Locked
- **Date:** 2026-05-07
- **Deciders:** Kevin (owner) + agent
- **Source:** media-tools `memory/user_dependency_preference.md`. General working preference confirmed across the owner's projects; applies to image-viewer too.

_Cross-project preference, not specific to image-viewer._

## Decision (the rule)

Minimize runtime npm dependencies. Prefer built-ins (e.g. `fetch`) and vanilla solutions, and treat "no new deps" as a first-class design lever when choosing an approach.

## What was rejected ("no, that's wrong")

Reaching for a library when vanilla works. Concretely, the owner flipped a Home-Assistant design away from the `mqtt` package to a plain webhook rather than take the dependency.

## Why

Every runtime dependency adds surface area, supply-chain risk, and lock-in. Built-ins and small vanilla code are auditable and durable. In the owner's words: "No npm dependencies!"

## How to honor it

Before adding a runtime dependency, prove vanilla can't do it: use platform `fetch` over HTTP clients, native APIs over wrappers. Let "this avoids a new dep" outweigh minor convenience. Dev-only tooling is a softer case, but still justify it.

## Evidence

> "No npm dependencies!" — media-tools `memory/user_dependency_preference.md`

## Related

[[2026-05-08-use-yarn-never-npm]]
