# docs/workers

Prompts handed to sub-agents during this project, kept so the research is reproducible and so future
delegated work follows the same shape. One file per worker task.

- [explore-mux-magic-tooling.md](explore-mux-magic-tooling.md) — extract the Biome/ESLint/TS setup
  from the sibling `mux-magic` repo to copy here (feeds [0003](../research/0003-linting-and-formatting.md)).
- [explore-renderer-api-surface.md](explore-renderer-api-surface.md) — exhaustively inventory the
  renderer's Node/Electron API usage to design the preload bridge (feeds
  [0002](../research/0002-electron-security-model.md)).

## Open briefs (work to be picked up later)

- [fix-image-loading.md](fix-image-loading.md) — **HIGH priority.** Images don't render after the
  upgrade (the `safe-file-protocol` fetch path); full data-flow trace, hypotheses, and candidate fixes.
- [release-pipeline.md](release-pipeline.md) — future: CI that publishes a downloadable EXE to Gitea +
  GitHub Releases on a version tag.
