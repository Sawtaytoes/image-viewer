# 2020-11-28 — Delete to Recycle Bin via Electron shell, with fallback

- **Status:** Locked
- **Date:** 2020-11-28
- **Deciders:** Kevin (owner) + agent
- **Source:** commits 85aa4ad "Switched from `trash` to Electron's native shell.moveItemToTrash", 9075d84 (`trash` broke `make`), 81dd437 (force-delete fallback); later Electron 12/13 deprecation moved moveItemToTrash→trashItem

## Decision (the rule)

Delete sends to the Recycle Bin via Electron's native shell API (currently `shell.trashItem`), with a permanent-delete fallback (`fs.promises.rm` recursive/force) when trashing fails. Do NOT use the `trash` npm package.

## What was rejected ("no, that's wrong")

The `trash` npm package (breaks `yarn make`); also delete with no fallback.

## Why

The native shell trashes to the Recycle Bin; the `trash` package broke packaging; some Windows fileshares can't recycle, hence the fallback.

## How to honor it

Preserve the `deleteFilePath` IPC contract; call `shell.trashItem` then `fs.rm` fallback. Note `moveItemToTrash` was removed in Electron 13.

## Evidence

85aa4ad "Switched from `trash` to Electron's native shell.moveItemToTrash"; 9075d84 (`trash` broke `make`); 81dd437 (force-delete fallback).

## Related

[[2026-06-03-delete-needs-confirmation-and-guards-stray-delete-key]]
