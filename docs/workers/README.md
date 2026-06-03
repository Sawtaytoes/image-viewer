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

### Folder queue + side-by-side columns (touch)

Two features the owner wants: queue up multiple folders and switch between them, and view images in
N side-by-side columns. Immersive full-image mode **is** the columns container (a single image is the
1-column case); chrome is summoned by swiping down from the top edge. Build in dependency order:

- [refactor-image-cache-refcount.md](refactor-image-cache-refcount.md) — **prerequisite, do first.**
  Reference-count the flat image cache so two panes can share a folder without one evicting the other's
  blob. Invisible, zero behavior change in the current view.
- [feature-folder-queue.md](feature-folder-queue.md) — the `WorkspaceContext` foundation (queue + panes
  state), long-press multi-select in the file browser (fill-ring animation), and the folder tab strip.
- [feature-side-by-side-columns.md](feature-side-by-side-columns.md) — the immersive N-column viewer,
  per-pane navigation, tap-an-empty-pane folder picker, swipe-down chrome, and the center-tap /
  top-reveal ripple feedback. Depends on the two above.
