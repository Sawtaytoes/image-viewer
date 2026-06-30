# 2026-06-02 — Enumerate Windows drives without wmic

- **Status:** Locked
- **Date:** 2026-06-02
- **Deciders:** Kevin (owner) + agent
- **Source:** Migrated from `docs/research/0006-drive-enumeration-wmic.md` (Phase 1 modernization)

## Decision (the rule)

Replace the `wmic logicaldisk get caption` drive enumeration with a Windows-11-safe method: probe `A:\` … `Z:\` with `fs.existsSync` (synchronous, instant, no shell spawn). Expose results via sync IPC `get-windows-drives` → `window.api.getWindowsDrives()`. This is the one intentional behavior change in an otherwise parity-only phase.

## What was rejected ("no, that's wrong")

- The original `wmic logicaldisk get caption` shell-out — **`wmic` is deprecated and removed by default on current Windows 11** (the owner runs Windows 11 Pro). When absent, the `child_process.exec` callback errors, `global.windowsDrives` is never populated, and the "My Computer" root view renders empty.
- PowerShell `Get-PSDrive -PSProvider FileSystem` — heavier, spawns a shell, exactly the slow startup we're avoiding.

## Why

The empty drive list is a strong candidate for the owner's reported "takes forever to load" / unreliable startup, and the app is unusable on their machine without it. `fs.existsSync` probing adds no dependency and removes a shell spawn.

## How to honor it

- Drive probing is Windows-only, guarded by `process.platform === 'win32'`.
- macOS/Linux already fall through to a `path.sep` root; that path is unchanged.
- Surfaced to the renderer via `ipcMain.on('get-windows-drives', …)` → `window.api.getWindowsDrives()`, replacing the old `remote.getGlobal('windowsDrives')`.
- Deeper startup profiling/optimization remains a later phase (`docs/roadmap.md`).

## Evidence

Original ADR `docs/research/0006-drive-enumeration-wmic.md`. Behavior differs from the original only in that it now actually returns drives on Windows 11.

## Related

- [[2026-06-02-electron-security-contextisolation-preload]]
