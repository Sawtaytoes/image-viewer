# 2026-08-03 — Follow the OS colour scheme via Electron `nativeTheme`, not `matchMedia`

- **Status:** Locked
- **Date:** 2026-08-03
- **Deciders:** Kevin (owner) + agent
- **Source:** Charcuterie 1.1.0 colour-scheme switcher rollout; this repo's `feat/color-scheme-switcher` PR

## Decision (the rule)

The app follows the OS light/dark scheme through Charcuterie's `ColorSchemeSwitcher`
(cycling light → dark → **system**, default `system`). The switcher's OS resolver is an
**Electron `nativeTheme`** resolver bridged over the preload — **never** the browser
`matchMedia` default. `nativeTheme.themeSource` stays `"system"` (we only *read*
`shouldUseDarkColors`); the renderer applies `data-scheme` on `<html>` and persists the
picked mode in `localStorage` under the shared key `charcuterie-scheme`.

## What was rejected ("no, that's wrong")

- **Keeping `data-scheme="dark"` pinned in `index.html`.** That was the M6c starting point
  and it can never follow the OS. It is replaced by `@charcuterie/tokens`'
  `buildFirstPaintScript(daylight)` inline `<head>` snippet, which sets `data-scheme` before
  first paint from the saved/OS choice with a scheme-branched fallback hex (no flash of the
  wrong theme).
- **Using the browser `matchMedia` resolver** that `ColorSchemeSwitcher` defaults to. This is
  Electron: the renderer runs with `contextIsolation` on and no Node access, so it has no
  reliable read of the OS `prefers-color-scheme`. The authoritative OS answer lives in the
  **main process** (`nativeTheme.shouldUseDarkColors`). This app is the fleet's proof that
  Charcuterie's resolver seam works for a non-browser host.

## Why

Charcuterie isolates the browser dependency to one overridable seam precisely so a non-browser
host can swap it. Image-viewer is that host: only the OS answer comes from outside the DOM, so
only the `resolver` is replaced — `persistence` (`localStorage`) and `apply` (`data-scheme` on
`<html>`) keep their browser defaults, because the Electron *renderer* does have those.

## How to honor it

- The resolver is `window.api.colorScheme` (preload → main `ipcMain` `get-native-theme` sync
  read + a `native-theme-updated` broadcast off `nativeTheme.on("updated")`), consumed in
  `src/components/convenience/ColorSchemeControl.tsx` as the `ColorSchemeSwitcher`'s `resolver`
  prop. Do **not** delete the `resolver` prop — without it the switcher falls back to
  `matchMedia`, which is the thing this decision rejects.
- Never set `nativeTheme.themeSource` away from `"system"`. Reading `shouldUseDarkColors` is the
  OS truth *because* the source is `system`; overriding it would make the app stop following
  the OS.
- The first-paint snippet in `index.html` is a verbatim copy of
  `buildFirstPaintScript(daylight)`; `src/styles/firstPaintColour.test.ts` regenerates it from
  the package and fails on drift. Keep its storage key equal to the runtime
  `localStoragePersistence` key (`charcuterie-scheme` = `DEFAULT_COLOR_SCHEME_STORAGE_KEY`).
- Icons are local inline SVGs (`LightModeIcon` / `DarkModeIcon` / `ComputerIcon`), not a lucide
  dependency — honoring [2026-06-02 — inline SVG icons, drop MUI](2026-06-02-inline-svg-icons-drop-mui.md).

## Consequence the owner should note

The **default is now `system`**, so a fresh install with no saved choice follows the OS —
which on a light-mode machine means the app opens light, not the always-dark it used to be.
That is the intended behaviour; the user can still pick dark explicitly and it persists.

## Evidence

Proven live under xvfb: with the switcher in `system` mode, flipping
`nativeTheme.themeSource` in the main process flipped the renderer's `data-scheme` dark↔light
over IPC while the switcher glyph stayed the monitor (system) icon — `matchMedia` never
involved.

## Related

- [[2026-07-31-styling-is-tailwind-on-charcuterie-tokens]]
- [[2026-06-02-inline-svg-icons-drop-mui]]
- [[2026-06-02-electron-security-contextisolation-preload]]
