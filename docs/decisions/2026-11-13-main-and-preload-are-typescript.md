# 2026-11-13 — Main and preload are TypeScript, so every file under `src/` is

- **Status:** Locked
- **Date:** 2026-11-13
- **Type:** Tooling
- **Supersedes:** the `main.js` and `preload.js` exception in [[2026-07-31-the-renderer-is-typescript]]
- **Superseded by:** —
- **Deciders:** Kevin (owner) + agent
- **Source:** 2026-11-12 fleet code audit finding; owner direction to fix the audit findings, 2026-11-13

## Decision (the rule)

`src/main.ts` and `src/preload.ts` are TypeScript and are type-checked like the rest of `src/`.
`allowJs` stays off, and there is no `.js` file under `src/` at all. The preload types its bridge
object as `Window["api"]`, the declaration in `src/windowApi.d.ts`, so the bridge and its
declaration cannot drift apart. The IPC handlers that touch the file system have unit tests
(`src/main.test.ts`, `src/preload.test.ts`).

## Context

The 2026-07-31 decision converted the renderer and left the two privileged programs as
JavaScript, excluded from type checking, until a packaging check could cover them. The audit
found both with no types and no tests, although they are the code with disk and Node access.
The Release workflow now builds every platform on a pull request that touches them, which is the
packaging check the 2026-07-31 handoff asked for.

## What was rejected ("no, that's wrong")

- **Turning on `checkJs`.** It needs `allowJs`, and the 2026-07-31 decision turned `allowJs` off
  so that a stray `.js` file is a hard error rather than an unchecked one.
- **Keeping the declaration as `preload.d.ts`.** Beside `preload.ts`, TypeScript reads that name
  as the compiled declaration of `preload.ts` and ignores it, and every `window.api` call site
  loses its types.

## Why

The two files hold every privileged path in the app: deleting files, writing the saved queue,
reading images. The conversion found a real defect on its first run: `backgroundThrottling` was
a top-level `BrowserWindow` option, where Electron ignores it, instead of a `webPreferences`
option.

## How to honor it

- Add a privileged capability to `src/windowApi.d.ts` first; `preload.ts` will not compile until
  the bridge has it.
- Test a new IPC handler that touches the disk in `src/main.test.ts`, against a temporary folder,
  with Electron mocked. Never let a test reach the real trash.
- These suites declare `// @vitest-environment node`. `vitest.setup.ts` loads the renderer setup
  only when a `window` exists.

## Evidence

> "Fix all those issues, look into and mark off those done cards, dedupe tasks, and fix those docs, etc."
> — owner, 2026-11-13, on the audit that found the unchecked files

## Related

[[2026-07-31-the-renderer-is-typescript]] · [[2026-06-03-typescript-conversion-uses-real-types]] ·
[[2026-11-13-heic-decodes-in-a-utility-process]]
