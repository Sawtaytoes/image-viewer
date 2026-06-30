# <YYYY-MM-DD> — <Short imperative title>

<!--
Copy this file to `docs/decisions/<YYYY-MM-DD>-<kebab-slug>.md`.
The date is when the decision was MADE (from the chat/commit/PR), not when the file was written.
One decision per file. These are LOCKED decisions: do not reverse them without the owner
explicitly saying so in a new dated decision that supersedes this one.
-->

- **Status:** Locked <!-- Locked | Superseded by <file> | Relaxed on <date> -->
- **Date:** <YYYY-MM-DD>
- **Deciders:** Kevin (owner) + agent
- **Source:** <chat transcript / commit hash(es) / PR / earlier doc>

## Decision (the rule)

<One or two imperative sentences. "Always… / Never… / Use X, not Y.">

## What was rejected ("no, that's wrong")

<What the AI did, or the obvious-looking alternative, that the owner pushed back on. Be specific —
this is the thing a future agent is most likely to re-introduce.>

## Why

<The rationale, in the owner's terms. Why the rejected approach is worse here.>

## How to honor it

<Concrete guardrails: the files/symbols involved and exactly what an agent would naively do that
would break this. e.g. "Don't re-key the cache on the array; key on the sorted-path digest in
`useImageFiles`." Optional but high-value.>

## Evidence

<Short quote(s) (<=150 chars) + where it came from. Verbatim owner words are gold here.>

## Related

<Links to related decisions: [[YYYY-MM-DD-other-decision]] or docs/research/… >
