# 2026-06-04 — Sort persists per folder; images and folders separate

- **Status:** Locked
- **Date:** 2026-06-04
- **Deciders:** Kevin (owner) + agent
- **Source:** commit 2ff84e3 (BREAKING: remember sort order per folder); chat (4830e170, 67645b4d)

## Decision (the rule)

Sort order persists across restarts and is stored PER FOLDER (`imageViewer.sortOrdersByFolder`), not a single global key. Images and folders sort independently with their own configurable orders; defaults: images = Name ascending, folders = Modified-time descending. Switching sort must NOT drop the cached images.

## What was rejected ("no, that's wrong")

A single global sort key; one combined images+folders sort; losing the image cache when the sort changes.

## Why

Different folders want different orders, and images vs folders want different defaults. Re-keying the cache on the sort change made images vanish and never reload.

## How to honor it

Keep the blob cache across the toggle by keying retain/release on a sorted-path digest, NOT array identity (commit 8262d5d). Explorer-style date grouping applies only when that folder is newest-first.

## Evidence

"the ability to sort images and folders separately... images to sort Name Ascending and the folders to sort Modified Time Descending"; "going from Newest to Name view loses the cached images, and they never load." — chat (4830e170, 67645b4d)
