# 0006 — Replace `wmic` drive enumeration (Windows 11)

- **Status:** Accepted (Phase 1) — the one intentional behavior change in an otherwise parity-only phase.
- **Date:** 2026-06-02
- **Deciders:** agent, flagged to owner.

## Context

`src/main.js` enumerated drive letters by shelling out to `wmic logicaldisk get caption`. **`wmic`
is deprecated and removed by default on current Windows 11** (the owner runs Windows 11 Pro). When
`wmic` is absent the `child_process.exec` callback receives an error, `global.windowsDrives` is never
populated, and the root view ("My Computer" drive list) renders empty. This is a strong candidate for
the owner's reported "takes forever to load" / unreliable startup, and it must work for the app to be
usable at all on their machine.

## Decision

Replace the `wmic` call with a Windows-11-safe enumeration. Preferred approach (no extra deps):
probe `A:\` … `Z:\` with `fs.existsSync` (synchronous, instant, no shell spawn). Fallback/alt
considered: PowerShell `Get-PSDrive -PSProvider FileSystem` (heavier, spawns a shell — exactly the
kind of slow startup we're trying to avoid).

The result is exposed to the renderer via synchronous IPC `ipcMain.on('get-windows-drives', …)` →
`window.api.getWindowsDrives()` (see [0002](0002-electron-security-model.md)), replacing the old
`remote.getGlobal('windowsDrives')`.

## Consequences

- Removes a shell spawn from startup (small startup win, on top of correctness).
- Behavior differs from the original only in that it now actually returns drives on Windows 11.
- macOS/Linux already fell through to a `path.sep` root; that path is unchanged. Drive probing is
  Windows-only (guarded by `process.platform === 'win32'`).
- Deeper startup profiling and optimization remain a later phase (`docs/roadmap.md`).
