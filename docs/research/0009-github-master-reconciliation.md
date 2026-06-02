# 0009 — Reconciling GitHub's divergent master

- **Status:** Accepted
- **Date:** 2026-06-02
- **Deciders:** Kevin (owner) + agent.

## Context

Phase 1 was done on a local clone whose `master` was at the old baseline `7065387`. When we went to
push to GitHub (`origin`), its `master` was **4 commits ahead** with a *separate, earlier* modernization
the local clone never had:

```
989e398 Down-sized zoom factor because the latest Surface Pro is scaled up
33a0972 Fixed prod build not working because of `React.createRoot`
e412ce7 Removed unnecessary console.logs
e8e074a Upgraded all packages and added yarn v3
```

That line bumped to **Electron 12 / React 18**, kept **Webpack** (Forge 6-beta), moved to **Yarn 3**
(with `.yarn/cache` committed → ~1413 tracked files). Phase 1 (Electron 42 / Vite / Forge 7 / Yarn 4 /
secure model) is the fuller "latest everything" the owner asked for, so the two lines diverged at
`7065387` and both rewrote the same files.

## Decision

**Supersede GitHub's master with Phase 1**, non-destructively:

1. **Port the one genuinely useful bit** — `989e398`'s Surface-Pro fix `webFrame.setZoomFactor(0.75)`.
   It moved from `renderer.js` (which can no longer import `electron`) into `src/preload.js`.
   - `33a0972` ("createRoot prod fix") was **Webpack-specific and N/A** — Phase 1 uses Vite/React 19 and
     the owner's run of the packaged app rendered fine (folders showed), proving prod React mounts.
   - `e8e074a` (package bumps) and `e412ce7` (console.logs) are superseded.
2. **`git merge -s ours origin/master`** so GitHub `master` fast-forwards to the Phase 1 tree while
   **keeping their 4 commits in history** (reachable via the merge's second parent). No force-push.

## Side fix: line endings

The push surfaced a **CRLF/LF thrash**: Git (`core.autocrlf=true`, `* text=auto`) checked files out as
CRLF on Windows while Biome enforces `lineEnding: lf`, so every `yarn lint` rewrote ~85 files. Fixed by
setting `.gitattributes` to **`* text=auto eol=lf`** (LF in the working tree everywhere) + a one-time
renormalize. Biome now reports "No fixes applied".

## Result

`master` on both GitHub and Gitea is the Phase 1 tree; GitHub's older modernization survives in history.
The `phase-1-modernization` branch (the original PR) is left as-is on both remotes.
