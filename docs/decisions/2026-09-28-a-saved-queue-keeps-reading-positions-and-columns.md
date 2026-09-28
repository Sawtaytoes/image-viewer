# 2026-09-28 — A saved queue keeps reading positions and columns

- **Status:** Locked
- **Date:** 2026-09-28
- **Type:** Feature / queue persistence
- **Supersedes:** —
- **Superseded by:** —
- **Deciders:** Kevin (owner) + agent
- **Source:** T3 Code chat `2340e836-8a02-4cbf-bf15-1b95f4f0f82f`

## Decision

"Save for later" saves more than the folder list. The slot also holds the last-viewed image of every
queued folder and the saving window's columns (each column's folder and image, and which column was
active). "Load queue" restores all three: the queue, the "where I left off" memory, and the columns
at their images — which opens the viewer the way it was left.

## Context

The slot (`saved-queue.json` in userData) was a bare `QueuedFolder[]`. The per-folder resume index
lived only in main's memory (`folderLastIndexByPath`), so it died with the app, and columns were never
saved at all. Reloading a saved queue came back to the first image of every gallery with no columns.

## What was rejected ("no, that's wrong")

A saved queue that restores only the list of folders.

## Why

The queue is a reading list across galleries. Losing the page in each one, and the side-by-side
columns, turns every reload into re-finding where each gallery was.

## How to honor it

- The window builds the layout (`buildSavedQueueLayout` in `WorkspaceProvider`); main and the browser
  harness store it with their own canonical folder list. A column's own index wins over the shared
  store's copy for the same folder.
- Columns are saved by folder **path**, never id; ids are per session.
- Read every slot through `src/savedQueue.ts` (`normalizeSavedQueue`), which also accepts the old bare
  array, so a slot written before this change still loads.
- `queue.load` seeds the "where I left off" store: main's map in Electron, the fake filesystem's map in
  fake mode and in the browser harness.
- Scope today: the columns of the window that pressed "Save for later". Other windows' columns are not
  saved, though their folders' positions are (they write the shared store).

## Evidence

"if I save a queue, I want it to remember which file I was on as well, so when I reload the queue, it
has all the galleries at the files I last went to and all the views I had open on the right galleries
and pages as well" — T3 Code chat `2340e836-8a02-4cbf-bf15-1b95f4f0f82f`, 2026-09-28.
