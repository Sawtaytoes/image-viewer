# 2026-05-08 — Use yarn, never npm

- **Status:** Locked
- **Date:** 2026-05-08
- **Deciders:** Kevin (owner) + agent
- **Source:** media-tools `memory/feedback_package_manager.md`. General working preference confirmed across the owner's projects; applies to image-viewer too.

_Cross-project preference, not specific to image-viewer._

## Decision (the rule)

Use `yarn` and `yarn dlx` exclusively for all package and script operations. NEVER run `npm` or `npx`.

## What was rejected ("no, that's wrong")

Reaching for `npm install`, `npm run`, or `npx <tool>` out of habit. These desync `yarn.lock` and bypass the Corepack-pinned Yarn 4 toolchain. The owner corrected this multiple times and was explicitly frustrated.

## Why

image-viewer runs Yarn 4 via Corepack. Mixing npm/npx regenerates or skews the lockfile and resolution, producing irreproducible installs. In the owner's words: "I'm getting tired of you using npm."

## How to honor it

Translate every instinct: `npm install` → `yarn`, `npm install X` → `yarn add X`, `npm run X` → `yarn X`, `npx X` → `yarn dlx X`. Never create or touch `package-lock.json`. If a doc or snippet shows npm, rewrite it to yarn before running.

## Evidence

> "I'm getting tired of you using npm." — media-tools `memory/feedback_package_manager.md`

## Related

[[2026-06-02-yarn4-nodelinker-node-modules]]
