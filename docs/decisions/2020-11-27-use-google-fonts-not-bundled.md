# 2020-11-27 — Reverted to the Google Fonts CDN (temporary stopgap)

- **Status:** Superseded by [[2026-06-30-self-host-fonts-locally]]
- **Date:** 2020-11-27
- **Deciders:** Kevin (owner) + agent
- **Source:** commit 32b3d3f "Switched back to Google Fonts until file-system font loading can be figured out" (reverts 0b8fc15 / 0f78f75 local woff2)

## Decision (the rule)

At the time, reverted Source Sans Pro to the Google Fonts CDN **as a temporary stopgap**, because the
local-font (`@font-face` woff2) attempt wasn't loading under the app's setup yet. This was an unblock,
**not** a decision to depend on the CDN forever.

## What was rejected ("no, that's wrong")

The specific local-woff2 attempt of the moment (commits 0b8fc15 / 0f78f75) — it didn't render, so it
was rolled back. Self-hosting itself was never the thing being rejected; only that broken implementation.

## Why

Filesystem font loading wasn't working yet and the owner needed text to render, so the CDN was the
quick path. The end goal was always self-hosted fonts for startup speed — see the superseding decision.

## How to honor it

Historical only. The current, locked direction is to **self-host** the fonts:
[[2026-06-30-self-host-fonts-locally]]. Do not cite this file as a reason to keep the CDN.

## Evidence

32b3d3f "Switched back to Google Fonts **until** file-system font loading can be figured out" — the
"until" is the point: a stopgap with an explicit intent to move to local fonts.

## Related

[[2026-06-30-self-host-fonts-locally]] · [[2026-06-20-app-font-is-source-sans-pro-everywhere]]
