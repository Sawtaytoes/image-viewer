# 2026-06-03 — Refcount and free image blobs

- **Status:** Locked
- **Date:** 2026-06-03
- **Deciders:** Kevin (owner) + agent
- **Source:** commits a1abb5c (refcount cached blobs), 731541e (free blobs on unmount, 2020), f83613b (memory-leak note); `docs/workers/refactor-image-cache-refcount.md`

## Decision (the rule)

Reference-count cached image blobs and free them on last release; remove blobs on unmount. Don't keep blobs alive indefinitely.

## What was rejected ("no, that's wrong")

Simplifying the blob lifecycle (re-introduces the leak); a flat cache where one pane evicts another pane's shared blob.

## Why

Folders of images leak memory if blobs are never freed, and two panes can share the same folder — so a naive evict would pull a blob still in use elsewhere.

## How to honor it

Refcount the flat image cache; release on last reference and on unmount.

## Evidence

commits a1abb5c (refcount cached blobs), 731541e (free blobs on unmount), f83613b (memory-leak note); `docs/workers/refactor-image-cache-refcount.md`.
