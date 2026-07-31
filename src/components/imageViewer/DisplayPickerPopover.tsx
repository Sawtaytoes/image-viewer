import type { MouseEventHandler } from "react"
import {
  memo,
  useCallback,
  useEffect,
  useState,
} from "react"

import type { Display } from "../../types"
import NewWindowIcon from "../icons/NewWindowIcon"

// The shared `SvgIcon` renders at a fixed 24px, so the rows bump their own icon
// up to match the larger touch-sized text. A descendant selector is the only way
// to reach a child component's `<svg>` from here, and `[&_svg]:` is Tailwind's
// spelling of exactly that.
const ROW_CLASSES =
  "flex cursor-pointer items-center gap-3.5 rounded-[8px] border-0 bg-transparent px-[18px] py-4 text-left font-light text-content-primary hover:bg-surface-raised [&_svg]:h-[28px] [&_svg]:w-[28px] [&_svg]:flex-none"

interface DisplayPickerPopoverProps {
  onClose: () => void
}

// The "spawn window on another display" menu. Opened from the viewer chrome bar,
// it lists every connected display; hovering a row lights up that physical
// monitor (the identify overlay in main) so the user knows which screen they're
// about to target, and clicking a row spawns a new window filling it — sharing
// the live queue and starting with one auto-filled column. Mirrors the
// backdrop + pop-in visual pattern of `FolderPickerPopover`.
const DisplayPickerPopover = ({
  onClose,
}: DisplayPickerPopoverProps) => {
  const [displays, setDisplays] = useState<Display[]>([])

  // Fetch the display list when the menu opens (so a monitor plugged in
  // mid-session shows up), and make sure no identify overlay lingers once the
  // menu closes.
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [onClose])

  const onBackdropClick = useCallback<
    MouseEventHandler<HTMLDivElement>
  >(
    (event) => {
      event.stopPropagation()

      if (event.target === event.currentTarget) {
        onClose()
      }
    },
    [onClose],
  )

  const identify = useCallback((displayId: number) => {
    window.api.identifyDisplay(displayId)
  }, [])

  const stopIdentify = useCallback(() => {
    window.api.stopIdentifyDisplay()
  }, [])

  const spawnOnDisplay = useCallback(
    (displayId: number) => {
      window.api.stopIdentifyDisplay()

      window.api.createNewWindow({
        displayId,
        spawnedViewer: true,
      })

      onClose()
    },
    [onClose],
  )

  return (
    // Fixed + full-viewport (not absolute-in-pane like the per-column picker):
    // this menu is summoned from the chrome bar, so it floats above the whole
    // viewer.
    <div
      className="fixed inset-0 z-[10] flex animate-backdrop-in items-center justify-center bg-scrim"
      data-viewer-overlay
      onClick={onBackdropClick}
    >
      <div className="flex max-h-[85%] min-w-[420px] max-w-[92%] animate-pop-in flex-col gap-1 overflow-y-auto rounded-[12px] bg-surface-sunken p-3 text-content-primary shadow-[0_8px_24px_var(--color-scrim)] select-none">
        <div className="px-3.5 pt-2 pb-1 text-[18px] font-normal text-content-secondary">
          Open a new window on…
        </div>

        {displays.length === 0 ? (
          <div className="p-5 text-[18px] font-light text-content-muted">
            No displays detected.
          </div>
        ) : (
          displays.map((display) => (
            <button
              className={ROW_CLASSES}
              key={display.id}
              onClick={() => {
                spawnOnDisplay(display.id)
              }}
              onPointerEnter={() => {
                identify(display.id)
              }}
              onPointerLeave={stopIdentify}
              type="button"
            >
              <NewWindowIcon />

              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="overflow-hidden text-[22px] text-ellipsis whitespace-nowrap">
                  {display.label}
                </span>
                <span className="text-[16px] text-content-muted">
                  {display.resolutionLabel}
                  {display.isPrimary ? " · primary" : ""}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

const MemoizedDisplayPickerPopover = memo(
  DisplayPickerPopover,
)

export default MemoizedDisplayPickerPopover
