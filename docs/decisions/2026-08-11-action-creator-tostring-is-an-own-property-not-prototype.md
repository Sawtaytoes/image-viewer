# 2026-08-11 — An action creator's `toString` is an OWN property; `complexity/useArrowFunction` is back on

- **Status:** Accepted
- **Date:** 2026-08-11
- **Type:** code / linting
- **Supersedes (in part):** [2026-06-02 — Linting is Biome plus minimal ESLint](2026-06-02-linting-biome-plus-minimal-eslint.md), specifically its "disabled `complexity/useArrowFunction`" bullet and the claim that the `function` expression is load-bearing.

## Decision

`createActionCreator` and `createNamespaceActionCreator` attach `toString` with
`Object.assign`, alongside `type`:

```ts
return Object.assign(actionCreator, {
  toString: () => actionType,
  type: actionType,
})
```

They no longer assign `actionCreator.prototype.toString`, they are plain arrow
functions, and `complexity/useArrowFunction` is **removed from `biome.json`'s
rule-offs** — it is back on, fleet-default.

## Context

The 2026-06-02 lint adoption recorded that Biome's unsafe `useArrowFunction` fix
"rewrote the `function` exprs into arrows, breaking `.prototype.toString` and crashing
at module load", and disabled the rule. The Charcuterie shared-tooling adoption (#21)
re-confirmed the same crash and kept the rule off.

Both readings of the crash were half right. The rewrite *did* crash — but not because
the `.prototype.toString` behaviour was lost. It crashed because arrow functions have
no `.prototype` at all, so the assignment itself threw
`Cannot set properties of undefined`.

**The line it was protecting never did anything.** `.prototype` is only consulted for
objects built with `new actionCreator()`. Stringifying the *function* resolves
`toString` up the function's own prototype chain to `Function.prototype.toString`:

```js
const fn = function (p) { return { payload: p } }
fn.prototype.toString = () => "MY_ACTION"
String(fn)                      // "function (p) { return { payloa…"  ← the SOURCE
Object.keys({ [fn]: 1 })[0]     // same source text
```

So the documented purpose — "can be used as a computed object key that stringifies to
its action type" — was never delivered, for as long as the helper has existed. Nothing
noticed because every consumer keys on the explicit static instead
(`[addDownloadedFile.type]: …` in `downloadedFilesReducer`, and so on), and no test
covered stringification.

An own `toString` actually works, restores the `ActionCreator` / `NamespaceActionCreator`
interface's promise, and removes the only reason the helpers had to be `function`
expressions.

## Why

A rule-off that is documented as load-bearing is worse than no rule-off: it makes the
next reader route around the code instead of reading it. This one had guarded a no-op
for months and had already cost two rounds of red builds.

## How to honor it

- `toString` goes in the `Object.assign` block. **Do not** move it back onto
  `.prototype` — see the proof above.
- `createActionCreator.test.ts` now asserts `` `${doThing}` === "doThing" `` and the
  computed-key case. Keep it; it is what would have caught the original bug.
- `complexity/useArrowFunction` stays **on**. If it fires again, the code is wrong, not
  the rule.
- `lint:biome-format` still does not pass `--unsafe`; that part of the 2026-06-02
  decision is unchanged and unrelated.

## Evidence

Owner, 2026-08-10, on the Phase 2 report that the rule-off was load-bearing:

> "I didn't write *anything* that extended `.prototype` as far as I know. That seems
> very hacky. Are we running Biome against library code or something? We shouldn't be.
> Only my files."

Biome was only ever running against his own files — `src/components/imageLoader/` is
first-party. His instinct that the pattern looked wrong was correct: it was wrong, and
it was inert.
