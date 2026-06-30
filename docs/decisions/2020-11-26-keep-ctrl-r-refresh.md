# 2020-11-26 — Keep [CTRL][R] refresh working

- **Status:** Locked
- **Date:** 2020-11-26
- **Deciders:** Kevin (owner) + agent
- **Source:** commit fee8eae "Re-added [CTRL][R] refresh which was removed when event.preventDefault was added"

## Decision (the rule)

Keep `[CTRL][R]` refresh working.

## What was rejected ("no, that's wrong")

A blanket `event.preventDefault` on key handlers that silently killed refresh — it had to be re-added.

## Why

A catch-all preventDefault swallows Ctrl+R, breaking refresh that users rely on.

## How to honor it

When adding `preventDefault` to keyboard handling, whitelist Ctrl+R so it still triggers refresh.

## Evidence

fee8eae "Re-added [CTRL][R] refresh which was removed when event.preventDefault was added".
