# 2026-06-04 — Gallery and folder picker stay in the pane

- **Status:** Locked
- **Date:** 2026-06-04
- **Deciders:** Kevin (owner) + agent
- **Source:** chat (22200a96, 15c0cfc1)

## Decision (the rule)

From a panel, "gallery view" opens the regular in-pane gallery (browse images/folders, open one, add to queue) — never a folder-selection overlay, and never leave the pane. The folder picker renders INSIDE the panel, not as a modal/overlay.

## What was rejected ("no, that's wrong")

"Gallery view" launching a folder-selection screen as a modal that left the side-by-side view; a header overlaid so you couldn't go up a directory.

## Why

The user wants to stay in the side-by-side context and browse normally. A modal overlay breaks the pane layout and an overlaid header blocks navigating up a directory.

## How to honor it

Render the folder picker inside the panel container, not in a portal/modal. "Gallery view" routes to the in-pane gallery, not the selection screen.

## Evidence

"I want to go to the regular gallery view, not the selection view. Just the regular gallery view IN THAT PANE. Don't leave the pane."; "Can I have that display not as a modal overlay, but inside the panel itself?" — chat (22200a96, 15c0cfc1)
