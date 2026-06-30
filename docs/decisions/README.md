# docs/decisions — the locked-decisions paper trail

This directory is the **paper trail of decisions the owner does not want re-litigated.** Each file
records one decision: the rule, what was *rejected* ("no, that's wrong"), why, and how to honor it.
The point is to stop agents (and future-us) from quietly reverting things that were already settled.

## Rules for working with this directory

1. **Treat every file here as LOCKED.** Do not reverse a decision in code unless the owner explicitly
   says so. "It looks like a bug / dead code / a magic number" is exactly the trap these files exist to
   prevent — read the file before "cleaning up" the thing it describes.
2. **To change a locked decision:** add a *new* dated file that supersedes the old one, set the old
   file's `Status:` to `Superseded by <new file>`, and link them. Decisions are append-only history,
   not edited-in-place. (See the 2020/2026 fonts pair for an example.)
3. **To add a decision:** copy [`TEMPLATE.md`](TEMPLATE.md) to
   `docs/decisions/<YYYY-MM-DD>-<kebab-slug>.md`, dated to when the decision was *made* (a chat, a
   commit, a PR), not when you wrote the file.
4. Keep [`AGENTS.md`](../../AGENTS.md) slim — it links here for the "why."

## A note on scope

`image-viewer` is its own repository (first commit 2020-10-28) and has always been this Electron image
browser — it was never renamed from another project. Everything here documents **Image Viewer only**.
The `2026-05-*` entries are general working preferences (how the owner likes any project run, confirmed
to apply here); everything else is sourced from Image Viewer's own chats, commits, and docs.

## Index (chronological)

### 2020 — original codebase (still in force)

- [2020-10-29 — Natural string sort](2020-10-29-natural-string-sort.md)
- [2020-11-19 — List virtualization in the file browser](2020-11-19-list-virtualization.md)
- [2020-11-25 — Render images as `<img>`, not `<canvas>`](2020-11-25-render-images-as-img-not-canvas.md)
- [2020-11-26 — Keep `[CTRL][R]` refresh](2020-11-26-keep-ctrl-r-refresh.md)
- [2020-11-27 — Reverted to Google Fonts CDN (stopgap, superseded)](2020-11-27-use-google-fonts-not-bundled.md)
- [2020-11-28 — Delete to Recycle Bin via Electron shell](2020-11-28-delete-to-recycle-bin-via-electron-shell.md)
- [2020-12-02 — Single-instance launch](2020-12-02-single-instance-launch.md)

### 2026-05 — general working preferences (apply to Image Viewer too)

- [2026-05-07 — Branch for non-trivial work](2026-05-07-branch-for-non-trivial-work.md)
- [2026-05-07 — Commit and push as you go](2026-05-07-commit-and-push-as-you-go.md)
- [2026-05-07 — Minimize runtime dependencies](2026-05-07-minimize-runtime-dependencies.md)
- [2026-05-08 — Use yarn, never npm](2026-05-08-use-yarn-never-npm.md)
- [2026-05-10 — No snapshot or screenshot tests](2026-05-10-no-snapshot-or-screenshot-tests.md)
- [2026-05-12 — Tests match the change scope](2026-05-12-tests-match-the-change-scope.md)

### 2026-06-02 — Phase 1 modernization (migrated from the old `docs/research/` ADRs)

- [2026-06-02 — Build toolchain: Electron Forge + Vite](2026-06-02-build-toolchain-electron-forge-vite.md)
- [2026-06-02 — Electron security: contextIsolation + preload](2026-06-02-electron-security-contextisolation-preload.md)
- [2026-06-02 — Linting: Biome + minimal ESLint](2026-06-02-linting-biome-plus-minimal-eslint.md)
- [2026-06-02 — TypeScript: tooling now, convert later](2026-06-02-typescript-tooling-now-convert-later.md)
- [2026-06-02 — Inline SVG icons, drop MUI](2026-06-02-inline-svg-icons-drop-mui.md)
- [2026-06-02 — Drive enumeration without `wmic`](2026-06-02-drive-enumeration-no-wmic.md)
- [2026-06-02 — JSX files use the `.jsx` extension](2026-06-02-jsx-files-use-jsx-extension.md)
- [2026-06-02 — Yarn 4 with `nodeLinker: node-modules`](2026-06-02-yarn4-nodelinker-node-modules.md)
- [2026-06-02 — GitHub master reconciliation](2026-06-02-github-master-reconciliation.md)
- [2026-06-02 — Zoom factor 0.75 in preload](2026-06-02-zoom-factor-075-in-preload.md)
- [2026-06-02 — LF line endings](2026-06-02-lf-line-endings.md)

### 2026-06-03 — touch UX + image pipeline

- [2026-06-03 — Touch-first is the whole point](2026-06-03-touch-first-is-the-whole-point.md)
- [2026-06-03 — UI needs visible feedback](2026-06-03-ui-needs-visible-feedback.md)
- [2026-06-03 — Startup speed is top priority](2026-06-03-startup-speed-is-top-priority.md)
- [2026-06-03 — Delete needs confirmation + guards the stray Delete key](2026-06-03-delete-needs-confirmation-and-guards-stray-delete-key.md)
- [2026-06-03 — Configurable default start directory](2026-06-03-configurable-default-start-directory.md)
- [2026-06-03 — No custom protocol; read image bytes in preload](2026-06-03-no-custom-protocol-read-image-bytes-in-preload.md)
- [2026-06-03 — Fit images from intrinsic size](2026-06-03-fit-images-from-intrinsic-size.md)
- [2026-06-03 — Refcount and free image blobs](2026-06-03-refcount-and-free-image-blobs.md)
- [2026-06-03 — TypeScript conversion uses real types](2026-06-03-typescript-conversion-uses-real-types.md)
- [2026-06-03 — SSH is only for Gitea; push GitHub over HTTPS](2026-06-03-ssh-is-only-for-gitea-push-github-over-https.md)
- [2026-06-03 — Keep the docs paper trail](2026-06-03-keep-the-docs-paper-trail.md)

### 2026-06-04 — folder queue + side-by-side (v2.0.0)

- [2026-06-04 — Up-arrow navigates up, not the dropdown](2026-06-04-up-arrow-navigates-up-not-dropdown.md)
- [2026-06-04 — Context menu is press-and-hold](2026-06-04-context-menu-is-press-and-hold.md)
- [2026-06-04 — Gallery and folder picker stay in the pane](2026-06-04-gallery-and-folder-picker-stay-in-the-pane.md)
- [2026-06-04 — Sort persists per folder; images and folders separate](2026-06-04-sort-persists-per-folder-images-and-folders-separate.md)
- [2026-06-04 — Thumbnails keep full size in multi-panel](2026-06-04-thumbnails-keep-full-size-in-multi-panel.md)
- [2026-06-04 — Multi-folder queue + side-by-side are core](2026-06-04-multi-folder-queue-and-side-by-side-are-core.md)
- [2026-06-04 — Chrome reveal is gated, not plain hover](2026-06-04-chrome-reveal-is-gated-not-plain-hover.md)
- [2026-06-04 — Don't cancel in-flight downloads on hide](2026-06-04-dont-cancel-in-flight-downloads-on-hide.md)
- [2026-06-04 — No text selection in the viewer](2026-06-04-no-text-selection-in-the-viewer.md)
- [2026-06-04 — Fake fixtures are color-coded per folder](2026-06-04-fake-fixtures-are-color-coded-per-folder.md)
- [2026-06-04 — Windows release runs on GitHub only](2026-06-04-windows-release-runs-on-github-only.md)

### 2026-06-18 → 06-30 — recent refinements

- [2026-06-18 — Quick clicks register; debounce the hold spinner](2026-06-18-quick-clicks-register-debounce-the-hold-spinner.md)
- [2026-06-18 — Unchecking the last selection cancels multi-select](2026-06-18-unchecking-the-last-selection-cancels-multiselect.md)
- [2026-06-20 — Package as one word: `ImageViewer`](2026-06-20-package-as-one-word-imageviewer.md)
- [2026-06-20 — App font is Source Sans Pro everywhere](2026-06-20-app-font-is-source-sans-pro-everywhere.md)
- [2026-06-20 — Mouse wheel changes the image under the cursor](2026-06-20-mouse-wheel-changes-the-image-under-the-cursor.md)
- [2026-06-20 — Queue shows what's open in other views](2026-06-20-queue-shows-what-is-open-in-other-views.md)
- [2026-06-30 — Center-click in multi-view opens the modal](2026-06-30-center-click-in-multiview-opens-the-modal.md)
- [2026-06-30 — Queue is summonable by touch](2026-06-30-queue-is-summonable-by-touch.md)
- [2026-06-30 — Multi-view has delete + selection affordances](2026-06-30-multiview-has-delete-and-selection-affordances.md)
- [2026-06-30 — Self-host the fonts locally](2026-06-30-self-host-fonts-locally.md)
