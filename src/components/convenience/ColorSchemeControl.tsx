import type { ColorSchemeResolver } from "@charcuterie/logic"
import {
  ColorSchemeSwitcher,
  Tooltip,
} from "@charcuterie/ui"

import ComputerIcon from "../icons/ComputerIcon"
import DarkModeIcon from "../icons/DarkModeIcon"
import LightModeIcon from "../icons/LightModeIcon"

// The non-browser "out". `ColorSchemeSwitcher` defaults its OS resolver to
// `matchMedia`, but this app is Electron: the renderer runs with
// `contextIsolation` on and no Node access, so it has no reliable read of the OS
// `prefers-color-scheme`. The real answer lives in the main process's
// `nativeTheme`, bridged over the preload as `window.api.colorScheme` — a
// synchronous read for `get()` (which the resolver requires) and the `updated`
// event for `subscribe()`. Persistence (`localStorage`) and the DOM applier
// (`data-scheme` on <html>) keep the browser defaults, because the Electron
// *renderer* does have those; only the OS answer comes from outside the DOM.
const nativeThemeResolver: ColorSchemeResolver = {
  get: () => window.api.colorScheme.get(),
  subscribe: (listener) =>
    window.api.colorScheme.onChanged(listener),
}

// lucide is not a dependency here — the app ships its own inline-SVG icons
// (docs/decisions/2026-06-02-inline-svg-icons-drop-mui.md) — so the
// sun / moon / monitor glyphs are local Material-style icons rather than a new
// icon dep. Keyed by mode: light → sun, dark → moon, system → monitor.
const colorSchemeIcons = {
  dark: <DarkModeIcon />,
  light: <LightModeIcon />,
  system: <ComputerIcon />,
}

// Sits in the title bar's drag strip beside the fullscreen button, so it needs
// the same `[-webkit-app-region:no-drag]` every other control in that strip
// carries, plus `ml-auto` to start the right-aligned cluster. `size="sm"` matches
// the bar's other icon controls (44px touch target at the kiosk density).
//
// The hover/active overrides matter and are not decoration. Charcuterie's ghost
// `IconButton` defaults to the *accent* intent, whose `hover:bg-intent-accent-surface`
// is — against THIS app's near-white/near-black title bar (`bg-surface-sunken`) —
// visually indistinguishable from the bar: measured light hover rgb(232,231,253)
// on bar rgb(235,238,243), dark hover rgb(30,28,82) on rgb(11,15,22). So the
// control read as non-interactive even though the state was firing. The switcher
// doesn't expose `intent`, so we override the hover/active background here to the
// *neutral* tokens the sibling title-bar controls use
// (`DirectoryControls`' `IconButton intent="neutral"`, the fullscreen button's
// `hover:bg-intent-neutral-surface-hover`). The trailing `!` (Tailwind v4
// important) makes these win over the built-in accent hover deterministically —
// two same-variant `hover:bg-*` utilities otherwise resolve by generated-CSS
// order, which is exactly the trap `TitleBar.tsx` warns about. The
// `focus-visible` ring the ghost `IconButton` already ships is untouched and
// verified to render.
const ColorSchemeControl = () => (
  <Tooltip label="Colour scheme: light, dark, or follow the system">
    <ColorSchemeSwitcher
      appearance="ghost"
      className="[-webkit-app-region:no-drag] ml-auto hover:bg-intent-neutral-surface-hover! active:bg-intent-neutral-solid-hover!"
      icons={colorSchemeIcons}
      resolver={nativeThemeResolver}
      size="sm"
    />
  </Tooltip>
)

export default ColorSchemeControl
