# 2020-12-02 — Enforce single-instance launch

- **Status:** Locked
- **Date:** 2020-12-02
- **Deciders:** Kevin (owner) + agent
- **Source:** commit b0fa59e "Stopped from loading multiple instances of the same executable"; earlier 9af13dc had broken single-instance code commented out before it was re-solved

## Decision (the rule)

Enforce single-instance launch — don't spawn duplicate executables.

## What was rejected ("no, that's wrong")

Allowing multiple instances; and the earlier broken single-instance code that was left commented out.

## Why

Running multiple copies of the same executable is wrong; the launch should be a single instance.

## How to honor it

Keep the single-instance guard in `src/main.js`; don't remove it as "dead code."

## Evidence

b0fa59e "Stopped from loading multiple instances of the same executable"; 9af13dc had broken single-instance code commented out before it was re-solved.
