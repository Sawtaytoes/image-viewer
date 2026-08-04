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
// No hover/active override anymore. Earlier the ghost switcher inherited the
// `IconButton` *accent* intent, whose `hover:bg-intent-accent-surface` was
// invisible against this app's `bg-surface-sunken` title bar, so an
// `!`-important neutral override was needed. `@charcuterie/ui@2.2.0` gives
// `ColorSchemeSwitcher` an `intent` prop that defaults to **neutral** — the hover
// is now `bg-intent-neutral-surface` and the icon `text-intent-neutral-content`,
// matching the sibling title-bar controls out of the box — so the hack is gone
// and we rely on the default. The `focus-visible` ring the ghost `IconButton`
// ships is untouched.
const ColorSchemeControl = () => (
  <Tooltip label="Colour scheme: light, dark, or follow the system">
    <ColorSchemeSwitcher
      appearance="ghost"
      className="[-webkit-app-region:no-drag] ml-auto"
      icons={colorSchemeIcons}
      resolver={nativeThemeResolver}
      size="sm"
    />
  </Tooltip>
)

export default ColorSchemeControl
