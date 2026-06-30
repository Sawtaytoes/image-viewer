# 2020-10-29 — Sort filenames with natural ordering

- **Status:** Locked
- **Date:** 2020-10-29
- **Deciders:** Kevin (owner) + agent
- **Source:** commits a7485b8 "Added string-natural-compare", 09961f2 (import properly, not global.require), bc386ff (converted to TS)

## Decision (the rule)

Sort filenames with natural/numeric ordering via `compareNaturalStrings` — never a plain lexicographic `Array.prototype.sort()`.

## What was rejected ("no, that's wrong")

The default string sort, which orders "10" before "2".

## Why

Image folders are numbered; lexicographic order misorders them so pages appear out of sequence.

## How to honor it

Keep `compareNaturalStrings` as the comparator for filename lists; don't swap in the default comparator. Import it properly (not via `global.require`).

## Evidence

a7485b8 "Added string-natural-compare"; 09961f2 import properly, not global.require; bc386ff converted to TS.
