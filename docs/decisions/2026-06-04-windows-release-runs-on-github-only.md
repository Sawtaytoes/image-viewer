# 2026-06-04 — Windows release runs on GitHub only

- **Status:** Locked
- **Date:** 2026-06-04
- **Deciders:** Kevin (owner) + agent
- **Source:** commit 5f5f4e2; chat (22200a96)

## Decision (the rule)

CI release/packaging (Windows) runs on GitHub ONLY, gated by `github.server_url`, so the Gitea mirror (Ubuntu-only runner) won't try the windows-latest job. Ship both a portable MakerZIP (win32) and the Squirrel installer.

## What was rejected ("no, that's wrong")

Running the Windows release on Gitea, whose mirror only has an Ubuntu runner.

## Why

Gitea only has an Ubuntu runner, so a windows-latest job fails there. Gating on `github.server_url` keeps the Windows release on GitHub where it can actually run.

## How to honor it

Keep the `github.server_url` gate on the windows-latest release job. Continue shipping both the portable MakerZIP (win32) and the Squirrel installer.

## Evidence

"image-viewer is trying to run windows release on Gitea. That's not good. We only need that for GitHub. On Gitea, I only have the Ubuntu runner." — chat (22200a96)

## Related

[[2026-06-03-ssh-is-only-for-gitea-push-github-over-https]]
