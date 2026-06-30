# 2026-06-03 — SSH is only for Gitea; push GitHub over HTTPS

- **Status:** Locked
- **Date:** 2026-06-03
- **Deciders:** Kevin (owner) + agent
- **Source:** chat (495afc3e, 77f75e91)

## Decision (the rule)

The SSH-remote preference applies ONLY to Gitea. GitHub uses HTTPS. Push to BOTH remotes; never skip GitHub.

## What was rejected ("no, that's wrong")

Generalizing "SSH-only" to all remotes, and not pushing to GitHub.

## Why

The SSH preference is a Gitea-specific setup. GitHub is configured for HTTPS, and both remotes must stay in sync.

## How to honor it

When pushing, push to both Gitea and GitHub. Use SSH only for the Gitea remote; use HTTPS for GitHub.

## Evidence

"Push GitHub too. My SSH thing is only for Gitea, not GitHub." — chat (495afc3e, 77f75e91)
