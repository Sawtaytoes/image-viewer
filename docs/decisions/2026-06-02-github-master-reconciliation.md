# 2026-06-02 — Supersede GitHub's divergent master non-destructively

- **Status:** Locked
- **Date:** 2026-06-02
- **Deciders:** Kevin (owner) + agent
- **Source:** Migrated from `docs/research/0009-github-master-reconciliation.md` (Phase 1 modernization)

## Decision (the rule)

**Supersede GitHub's `master` with Phase 1, non-destructively.** Port the one genuinely useful commit, then `git merge -s ours origin/master` so GitHub fast-forwards to the Phase 1 tree while keeping its 4 commits reachable in history. **No force-push.**

## What was rejected ("no, that's wrong")

- A destructive force-push that would erase GitHub's 4 divergent commits.
- Keeping GitHub's earlier modernization line (Electron 12 / React 18, Webpack on Forge 6-beta, Yarn 3 with `.yarn/cache` committed → ~1413 tracked files). Phase 1 (Electron 42 / Vite / Forge 7 / Yarn 4 / secure model) is the fuller "latest everything" the owner asked for.
- Porting `33a0972` ("createRoot prod fix") — **Webpack-specific and N/A**; Phase 1 uses Vite/React 19 and the packaged app rendered fine. `e8e074a` (package bumps) and `e412ce7` (console.logs) are superseded.

## Why

Phase 1 was built on a local clone whose `master` sat at the old baseline `7065387`, but `origin/master` was 4 commits ahead with a separate, earlier modernization the clone never had. The two lines diverged at `7065387` and both rewrote the same files. Phase 1 is the more complete target, but GitHub's history should survive.

## How to honor it

- Port `989e398`'s Surface-Pro fix `webFrame.setZoomFactor(0.75)` — moved from `renderer.js` (which can no longer import `electron`) into `src/preload.js`.
- `git merge -s ours origin/master` keeps their 4 commits via the merge's second parent.
- **Side fix — line endings:** the push surfaced CRLF/LF thrash (`core.autocrlf=true` + `* text=auto` checked out CRLF while Biome enforces `lineEnding: lf`, rewriting ~85 files per `yarn lint`). Fixed with `.gitattributes` set to **`* text=auto eol=lf`** plus a one-time renormalize; Biome then reports "No fixes applied".

## Evidence

Original ADR `docs/research/0009-github-master-reconciliation.md`. GitHub's divergent commits: `989e398` (zoom factor), `33a0972` (createRoot prod fix), `e412ce7` (console.logs), `e8e074a` (package bumps + Yarn v3). Result: `master` on GitHub and Gitea is the Phase 1 tree; GitHub's older modernization survives in history; the `phase-1-modernization` branch is left as-is.

## Related

- [[2026-06-02-build-toolchain-electron-forge-vite]]
- [[2026-06-02-electron-security-contextisolation-preload]]
- [[2026-06-02-yarn4-nodelinker-node-modules]]
