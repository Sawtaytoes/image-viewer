# 2026-06-04 — Chrome reveal is gated, not plain hover

- **Status:** Locked
- **Date:** 2026-06-04
- **Deciders:** Kevin (owner) + agent
- **Source:** commits 2e9c9f0, d40e0f0

## Decision (the rule)

The top chrome bar's reveal is gated by app state (`suppressChromeReveal`, ~400ms after a pane overlay closes) and only genuine mouse movement (`movementX/Y != 0`, mouse pointer) summons it; touch uses an edge swipe. Do NOT simplify to plain `:hover` / pointerenter. Clicking the X to close a gallery must not flash the top bar.

## What was rejected ("no, that's wrong")

A plain `:hover` reveal; the synthetic hover-on-unmount that flashed the bar over the close button (a click-only bug).

## Why

A synthetic hover fired when the gallery unmounted, flashing the top bar right over the X — only on click, not touch. The movement-only guard plus suppression window prevents that flash.

## How to honor it

Keep the movement-only guard (`movementX/Y != 0`, pointer type mouse) + `suppressChromeReveal`; don't "clean up" the synthetic-hover suppression. Touch keeps the edge swipe.

## Evidence

"If I click the X at the top, it still shows the top-bar right after... It doesn't do it with touch, it does it with click." — commits 2e9c9f0, d40e0f0
