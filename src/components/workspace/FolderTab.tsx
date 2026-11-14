import type { MouseEvent } from "react"
import { memo, useCallback, useRef } from "react"

import useOwnClick from "../convenience/useOwnClick"
import CloseIcon from "../icons/CloseIcon"

// Split out of `FolderTabStrip.jsx`, which declared both components in one
// file. `react/no-multi-comp` only runs on `.ts`/`.tsx`, so the conversion is
// the first thing to enforce it.

// Sized up from the original compact chip: the queue auto-hides, so when it is
// up the tabs need to be a comfortable touch target rather than a tiny pill.
//
// No colour here on purpose. The two states below carry a complete
// background/foreground pair each, because two `text-*` utilities on one
// element are resolved by their order in the generated stylesheet, not by their
// order in the `class` attribute — so "base colour plus an active override"
// would be a coin flip.
const tabClassName =
  "relative inline-flex flex-none cursor-pointer items-center gap-1.5 rounded-[6px] py-2 pr-2 pl-[14px] text-lg font-light select-none"

// `#3d9be0` — the old selection blue — is the accent intent now, and the hue
// changes with it
// (`docs/decisions/2026-07-31-selection-blue-becomes-the-accent-intent.md`).
const activeTabClassName =
  "bg-intent-accent-solid text-intent-accent-on-solid"

// `#555` on the strip's `#333`: a neutral solid chip, which is the role rather
// than the border the conventions table lists that hex under.
const inactiveTabClassName =
  "bg-intent-neutral-solid text-content-primary"

const tabNameClassName =
  "block max-w-[200px] overflow-hidden text-ellipsis"

// The tab's select control is a real `<button>`, so Enter or Space on it
// selects the tab. It wraps only the name, because the close `<button>` beside
// it cannot sit inside another button. Its `::before` stretches over the whole
// tab, so a tap on the tab's padding still selects, as it did when the tab was
// one clickable `<div>`; the close button is `relative` and comes later, so it
// paints above that layer and keeps its own taps.
const selectButtonClassName =
  "cursor-pointer text-left before:absolute before:inset-0 before:rounded-[6px]"

const closeButtonClassName =
  "relative inline-flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 text-inherit hover:bg-intent-neutral-surface-hover"

interface FolderTabProps {
  folderId: string
  isActive: boolean
  name: string
  onClose: (folderId: string) => void
  onSelect: (folderId: string) => void
}

const FolderTab = ({
  folderId,
  isActive,
  name,
  onClose,
  onSelect,
}: FolderTabProps) => {
  const handleSelect = useCallback(() => {
    onSelect(folderId)
  }, [folderId, onSelect])

  const handleClose = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()

      onClose(folderId)
    },
    [folderId, onClose],
  )

  // A press on the name and a release on the close button (or the reverse)
  // clicks the tab itself, which selected it when the tab was one `<div>`.
  const tabRef = useRef<HTMLDivElement>(null)

  useOwnClick(tabRef, handleSelect)

  return (
    <div
      className={`${tabClassName} ${
        isActive ? activeTabClassName : inactiveTabClassName
      }`}
      ref={tabRef}
    >
      <button
        aria-current={isActive ? "true" : undefined}
        className={selectButtonClassName}
        data-tap-surface
        onClick={handleSelect}
        type="button"
      >
        <span className={tabNameClassName}>{name}</span>
      </button>

      <button
        aria-label={`Close ${name}`}
        className={closeButtonClassName}
        onClick={handleClose}
        type="button"
      >
        <CloseIcon />
      </button>
    </div>
  )
}

const MemoizedFolderTab = memo(FolderTab)

export default MemoizedFolderTab
