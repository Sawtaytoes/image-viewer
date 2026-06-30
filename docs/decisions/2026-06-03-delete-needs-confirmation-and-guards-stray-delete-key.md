# 2026-06-03 — Delete needs confirmation and guards stray Delete key

- **Status:** Locked
- **Date:** 2026-06-03
- **Deciders:** Kevin (owner) + agent
- **Source:** chat (870e2aa9, f8576b6b)

## Decision (the rule)

Deleting requires an explicit confirmation modal ([Enter]=yes / [Esc] or outside-click=no, with open/close animation). A stray `[Delete]` keypress must NOT delete without confirmation.

## What was rejected ("no, that's wrong")

The original no-guard delete-on-Delete-key behavior; a modal with no feedback or no dismiss-on-outside-click.

## Why

The owner accidentally taps Delete, and an unguarded keypress destroys files. A confirm modal with a clear escape hatch prevents that.

## How to honor it

Wire the confirm modal to the keyboard ([Enter]/[Esc]); show a clicked state on buttons; dismiss on outside-click or "no".

## Evidence

"I also accidentally tap the delete key too"; "can I make it so if I don't click 'yes', it closes the delete modal?" — chat (870e2aa9, f8576b6b)

## Related

[[2020-11-28-delete-to-recycle-bin-via-electron-shell]]
