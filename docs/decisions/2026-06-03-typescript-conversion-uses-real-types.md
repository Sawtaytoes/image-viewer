# 2026-06-03 — TypeScript conversion uses real types

- **Status:** Locked
- **Date:** 2026-06-03
- **Deciders:** Kevin (owner) + agent
- **Source:** chat (61528c25); `docs/workers/convert-source-to-typescript.md`; branch `feat/typescript-conversion`

## Decision (the rule)

The JS→TS conversion uses REAL types: generics and correct DOM types (`HTMLElement`/`HTMLImageElement`), typed handlers like `PointerEventHandler` — not `as`/`any`/`unknown`.

## What was rejected ("no, that's wrong")

An `any`-heavy lazy conversion; hand-annotating `event: PointerEvent` instead of using `PointerEventHandler`.

## Why

Escape hatches (`as`/`any`/`unknown`) discard the type safety the conversion is for. Generics and DOM types carry real information.

## How to honor it

Prefer generics/DOM types; convert in waves; don't standardize file extensions the wrong direction mid-migration.

## Evidence

"convert this to TypeScript without depending on a bunch of `as` and `any`, and `unknown`... use generics... PointerEventHandler instead of `event: PointerEvent`." — chat (61528c25)

## Related

[[2026-06-02-typescript-tooling-now-convert-later]]
