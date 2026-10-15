# Linux and macOS builds ship, and the Mac build is unsigned

- **Status:** Accepted
- **Date:** 2026-10-14
- **Type:** Release
- **Supersedes:** —
- **Superseded by:** —

## Decision

Every release publishes Linux and macOS builds beside the Windows installer:

- **Linux:** `.deb`, `.rpm` and a ZIP, each for x64 and arm64.
- **macOS:** a ZIP for Apple silicon (arm64) and one for Intel (x64).

The macOS build is **ad-hoc signed, not Developer ID signed or notarized**. There is no
Apple Developer account behind this project, so the release ships no DMG and Gatekeeper
blocks the first launch; the setup guide tells the user how to clear the quarantine flag.

`release.yml` builds each platform on its own runner (Windows, `ubuntu-latest`,
`macos-latest`) after one job decides the version, then a final job uploads every artifact
through semantic-release. The Linux arm64 and macOS x64 builds are cross-architecture builds
on those runners; nothing in the app is native, so no compiler is involved.

## Context

The app was Windows-only in practice. `titleBarOverlay` already drew window buttons on
Linux (Electron 42 does), but two things were Windows-only:

1. The home screen listed **drive letters**, and macOS and Linux have none, so the home
   screen was empty. `src/driveRoots.ts` now lists the root, the home folder and the mounted
   volumes (`/Volumes/*` on macOS; `/media/<user>/*`, `/run/media/<user>/*` and `/mnt/*` on
   Linux). The bridge method was renamed `getWindowsDrives` → `getDriveRoots` to match.
2. The title bar reserved a 140px gutter on the **right** for the window buttons. macOS draws
   its traffic lights on the **left**, so on macOS the gutter moves to the left (78px) and
   `main.js` sets `trafficLightPosition` to center them in the 40px bar. The renderer learns
   the OS from `window.api.platform`.

## Why

The owner asked for the same Linux and Mac builds that CastKit desktop 0.3.0 added the same
day. A signing identity costs a yearly Apple fee and an account the project does not have;
an unsigned ZIP is still usable with one documented step, which is better than no Mac build.

`resetAdHocDarwinSignature` is required, not optional: flipping Electron fuses rewrites the
binary, Apple silicon refuses to run an unsigned binary, and without the re-sign the Mac
build does not open at all.

## Evidence

- Owner, after CastKit desktop 0.3.0 shipped Linux and Mac builds: "Lets build those for
  Image Viewer too." — T3 Code chat `bfbdc019-bd43-45f4-9e7e-df2c7214a3e5`, 2026-10-14.
- Packaged Linux x64 build run under Xvfb before the change: native window buttons present,
  folder list empty. After: `/`, the home folder and each mounted volume as tiles.
- Companion decision in CastKit:
  `docs/decisions/2026-10-14-the-desktop-app-ships-for-linux-and-macos-and-the-mac-build-is-unsigned.md`.
