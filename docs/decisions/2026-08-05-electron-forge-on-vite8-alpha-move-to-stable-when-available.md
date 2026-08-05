# 2026-08-05 — electron-forge is on a Vite 8 alpha; move to stable when it ships

- **Status:** Locked (with a standing follow-up)
- **Date:** 2026-08-05
- **Deciders:** Kevin (owner) + agent
- **Source:** chat — "keep updating electron-forge when we work on this to avoid staying on alpha"

## Decision (the rule)

`@electron-forge/*` is pinned to **`8.0.0-alpha.10`** because the rest of the
toolchain is on **Vite 8** (`@vitejs/plugin-react@6` and `vitest@4` both require
Vite ≥6/8), and stable electron-forge (`7.11.2`) only supports Vite `^5`. The
`8.0.0-alpha.*` line is the first electron-forge that supports Vite `^8`.

**Standing follow-up:** we do NOT want to sit on a pre-release. **Every time this
repo is worked on, check whether a newer `@electron-forge/*` has shipped** — a
later `8.0.0-alpha.N`, a beta/rc, or the `8.0.0` stable — and bump to it (all
`@electron-forge/*` packages together, same version). Move off the alpha as soon
as a more-stable Vite-8-capable release exists.

## Context

Pinning to the alpha was a deliberate trade to keep the modern Vite 8 stack
coherent, not the fix for the blank-window bug (that was the `index.html`
comment — see
[no-structural-tag-literals-in-index-html-comments](2026-08-05-no-structural-tag-literals-in-index-html-comments.md)).
The alpha is dev/build **tooling**, not a runtime dependency shipped in the app,
so an alpha here is lower-risk than an alpha in `dependencies` — but it still
wants replacing with a released version.

## How to honor it

- Check for updates on each visit:
  `yarn npm info @electron-forge/plugin-vite --fields dist-tags` (look for a
  `latest`/`beta`/`rc` ≥ 8 or a higher `alpha`).
- Bump **all** `@electron-forge/*` entries to the same new version, `yarn
  install`, then re-verify `yarn start` renders (the packaged/`make` path too,
  since forge majors can change `forge.config` and the makers).
- When bumping, confirm the Vite / `@vitejs/plugin-react` / `vitest` versions
  still satisfy the new forge's supported Vite range.

## Evidence

Registry at decision time: `@electron-forge/plugin-vite` `latest = 7.11.2`
(devDep `vite ^5.0.12`), `alpha = 8.0.0-alpha.10` (devDep `vite ^8.0.0`).
Installed Vite `8.0.16`; `@vitejs/plugin-react@6` peer `vite ^8`.

## Related

- [[2026-08-05-no-structural-tag-literals-in-index-html-comments]]
- [[2026-06-02-build-toolchain-electron-forge-vite]]
