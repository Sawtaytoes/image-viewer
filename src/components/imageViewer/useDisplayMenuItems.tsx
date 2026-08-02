import type { MenuItem } from "@charcuterie/ui"
import { useEffect, useMemo, useState } from "react"

import type { Display } from "../../types"
import NewWindowIcon from "../icons/NewWindowIcon"

// The rows of the "spawn a window on another display" menu, as
// `@charcuterie/ui` `MenuItem`s.
//
// A hook rather than the `DisplayPickerPopover` component it replaces, because
// `Menu` renders its own panel from an items array and clones the trigger — so
// the only part left for this app to own is *what the rows are*. Same shape as
// mux-magic's `useVariableTypeMenuItems`.
//
// The old popover was a fixed, full-viewport scrim with a centred sheet, and
// losing that is the visible change here. It is not the one the in-pane rule
// protects: `docs/decisions/2026-06-04-gallery-and-folder-picker-stay-in-the-pane.md`
// is about the *folder* picker staying inside its column, and this menu was
// always deliberately the opposite — summoned from the chrome bar and floating
// above the whole viewer, because the window it spawns is not a pane's business.
// Anchoring it under the button that opens it is if anything closer to that
// intent than centring it over the image was.

// Hovering a row lights up the physical monitor it names, which is the entire
// reason this menu exists — you cannot tell "Display 2" from "Display 3" by
// reading. `MenuItem` has no pointer hooks (`icon`, `isDisabled`, `key`,
// `label`, `onSelect` is the whole type), so the handlers ride on the `label`
// node, which is the one slot that takes arbitrary JSX.
//
// Two things make that honest rather than half-working, and both were found by
// the test rather than by reading:
//
//  - The negative margins cancel `MenuAction`'s own `px-2 py-1.5`, so the label
//    fills the button's padding box instead of hugging its text. Without them
//    the padding is a dead zone and the identify overlay drops out whenever the
//    pointer crosses it.
//  - The glyph is rendered *inside* the label rather than passed as `MenuItem`'s
//    `icon`. `icon` is a sibling of the label inside the button, so an icon
//    passed that way is a hole in the middle of the hover region: moving from
//    the words onto the picture fires `pointerleave` and puts the monitor out.
//    The `aria-hidden` wrapper is copied from `MenuAction`'s own treatment so
//    the row still announces as "Built-in, 1920x1080" and not "new window
//    Built-in".
//
// Both are workarounds. The component gap — a `MenuItem` that wants to react to
// being *pointed at* — is reported rather than patched around any further.
const LABEL_CLASSES =
  "-mx-2 -my-1.5 flex flex-auto items-center gap-2 px-2 py-1.5"

interface UseDisplayMenuItemsOptions {
  // Closing is `Menu`'s job on select, but spawning a window also has to put
  // the chrome bar away, so the caller's dismiss runs here too.
  onSpawn: () => void
}

const useDisplayMenuItems = ({
  onSpawn,
}: UseDisplayMenuItemsOptions): MenuItem[] => {
  const [displays, setDisplays] = useState<Display[]>([])

  // Fetched on mount rather than once at module load, so a monitor plugged in
  // mid-session shows up. The cleanup is not optional: the identify overlay
  // lives in the main process and nothing else turns it off, so unmounting
  // mid-hover would strand a coloured panel on a physical display.
  useEffect(() => {
    let isMounted = true

    Promise.resolve(window.api.getDisplays()).then(
      (list) => {
        if (isMounted) {
          setDisplays(list)
        }
      },
    )

    return () => {
      isMounted = false

      window.api.stopIdentifyDisplay()
    }
  }, [])

  return useMemo(() => {
    if (displays.length === 0) {
      // A disabled row rather than an empty panel: `Menu` renders exactly what
      // it is given, and an empty `role="menu"` is announced as "menu, 0 items"
      // — which reads as a bug rather than as an answer.
      return [
        {
          isDisabled: true,
          key: "no-displays",
          label: "No displays detected.",
          onSelect: () => {},
        },
      ]
    }

    return displays.map(
      ({ id, isPrimary, label, resolutionLabel }) => ({
        key: String(id),
        label: (
          <span
            className={LABEL_CLASSES}
            onPointerEnter={() => {
              window.api.identifyDisplay(id)
            }}
            onPointerLeave={() => {
              window.api.stopIdentifyDisplay()
            }}
          >
            <span
              aria-hidden="true"
              className="shrink-0 text-content-secondary"
            >
              <NewWindowIcon />
            </span>

            <span className="flex min-w-0 flex-auto flex-col gap-0.5">
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                {label}
              </span>

              <span className="text-content-muted text-sm">
                {resolutionLabel}
                {isPrimary ? " · primary" : ""}
              </span>
            </span>
          </span>
        ),
        onSelect: () => {
          // Explicitly, before the window opens: the pointer never leaves the
          // row (the menu unmounts under it), so `onPointerLeave` is not
          // guaranteed to fire and the identify overlay would stay lit.
          window.api.stopIdentifyDisplay()

          window.api.createNewWindow({
            displayId: id,
            spawnedViewer: true,
          })

          onSpawn()
        },
      }),
    )
  }, [displays, onSpawn])
}

export default useDisplayMenuItems
