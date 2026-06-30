# 2026-06-30 — Self-host the fonts locally

- **Status:** Locked
- **Date:** 2026-06-30
- **Deciders:** Kevin (owner) + agent
- **Source:** owner clarification 2026-06-30; the long-standing roadmap goal "load fonts locally (faster multi-instance startup)". Supersedes [[2020-11-27-use-google-fonts-not-bundled]].

## Decision (the rule)

**Self-host the fonts.** Download the needed Google Fonts (Source Sans Pro) into a local asset
directory (`static/` or wherever the app serves bundled assets) and load them via `@font-face` from
there. Do NOT depend on the Google Fonts CDN at runtime.

## What was rejected ("no, that's wrong")

Loading fonts from the Google Fonts CDN over the network (the current stopgap). Also note what "local
fonts" does and doesn't mean: it means **self-hosted copies of the Google Fonts files**, not falling
back to a generic system font.

## Why

Startup speed is the top priority — especially with multiple windows open, a network round-trip to
Google's CDN on each launch is a measurable cost — plus it removes an offline/network dependency and
the privacy footprint. In the owner's words: *"we should use local fonts… download the necessary
Google Fonts and load them from the `static` or whatever directory locally."*

## How to honor it

Bundle the woff2 files under the app's static/asset dir and reference them with `@font-face` URLs that
resolve under the Electron security model (contextIsolation on — see
[[2026-06-02-electron-security-contextisolation-preload]]). Keep **Source Sans Pro** as the family.
The 2020 blocker ("filesystem font loading couldn't be figured out") is the thing to solve, not a
reason to stay on the CDN. The app may still reference the CDN today; replacing it is the agreed work.

## Related

[[2020-11-27-use-google-fonts-not-bundled]] · [[2026-06-20-app-font-is-source-sans-pro-everywhere]] · [[2026-06-03-startup-speed-is-top-priority]]
