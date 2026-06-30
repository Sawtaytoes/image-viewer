# 2026-06-20 — App font is Source Sans Pro everywhere

- **Status:** Locked
- **Date:** 2026-06-20
- **Deciders:** Kevin (owner) + agent
- **Source:** commit 24ad223 "fix(fileBrowser): apply Source Sans Pro to sort toggle"; chat (ae35eb02, 6c52a792)

## Decision (the rule)

All app text uses Source Sans Pro — including the sort toggle/control. Never fall back to Times New Roman / serif.

## What was rejected ("no, that's wrong")

The sort control rendering in a serif/Times font.

## Why

The serif fallback looks inconsistent with the rest of the app. Every control must inherit the same Source Sans Pro family.

## How to honor it

Ensure the sort toggle/control inherits or explicitly sets the Source Sans Pro family rather than relying on a default that resolves to serif/Times New Roman.

## Evidence

"The fonts for the sort are times roman still. Please fix to match the rest." (asked twice) — chat (ae35eb02, 6c52a792)

## Related

[[2020-11-27-use-google-fonts-not-bundled]]
