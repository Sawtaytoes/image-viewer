import { Menu } from "@charcuterie/ui"
import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react"
import {
  afterEach,
  describe,
  expect,
  test,
  vi,
} from "vitest"

import type { Display } from "../../types"
import useDisplayMenuItems from "./useDisplayMenuItems"

const rect = { height: 1080, width: 1920, x: 0, y: 0 }

const buildDisplay = (
  id: number,
  label: string,
  isPrimary = false,
): Display => ({
  bounds: rect,
  id,
  isPrimary,
  label,
  resolutionLabel: "1920x1080",
  workArea: rect,
})

// The hook is exercised through `Menu` rather than with `renderHook`, because
// half of what it returns is only real once `Menu` has rendered it: the pointer
// handlers live on a `label` node, and `onSelect` is called by `MenuAction`.
// Asserting on the returned array would test the object literal, not the menu.
const DisplayMenuHarness = ({
  onSpawn,
}: {
  onSpawn: () => void
}) => {
  const items = useDisplayMenuItems({ onSpawn })

  return (
    <Menu
      isVisible
      items={items}
      onDismiss={() => {}}
      trigger={
        <button aria-label="Spawn window" type="button" />
      }
    />
  )
}

const renderMenu = async (displays: Display[]) => {
  const onSpawn = vi.fn()

  window.api.getDisplays = () => Promise.resolve(displays)
  window.api.createNewWindow = vi.fn()
  window.api.identifyDisplay = vi.fn()
  window.api.stopIdentifyDisplay = vi.fn()

  render(<DisplayMenuHarness onSpawn={onSpawn} />)

  // The display list arrives from a promise, so the first paint is always the
  // empty state — wait for the menu to settle before asserting on rows.
  await screen.findByRole("menu")

  return { onSpawn }
}

describe("useDisplayMenuItems", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test("offers one menu item per connected display", async () => {
    await renderMenu([
      buildDisplay(1, "Built-in", true),
      buildDisplay(2, "Dell U2720Q"),
    ])

    const items = await screen.findAllByRole("menuitem")

    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent("Built-in")
    // The primary marker rides in the row's second line, with the resolution.
    expect(items[0]).toHaveTextContent("primary")
    expect(items[1]).toHaveTextContent("Dell U2720Q")
  })

  test("names the menu from its trigger rather than a label prop", async () => {
    await renderMenu([buildDisplay(1, "Built-in")])

    // `Menu` has no `label` prop: `useRole` points `aria-labelledby` at the
    // trigger, and that is where the name has to come from.
    expect(
      screen.getByRole("menu", { name: "Spawn window" }),
    ).toBeInTheDocument()
  })

  test("lights the physical display while a row is pointed at, and puts it out again", async () => {
    await renderMenu([
      buildDisplay(1, "Built-in"),
      buildDisplay(2, "Dell U2720Q"),
    ])

    // The whole reason this menu exists — "Display 2" is unreadable, so the
    // monitor itself has to say which one it is. `MenuItem` has no pointer
    // hooks, so the handlers ride on the `label` node; this asserts that
    // workaround actually reaches the row.
    //
    // `pointerOver`, not `pointerEnter`: React has no `pointerenter` listener
    // at all — it derives `onPointerEnter`/`onPointerLeave` from the
    // `pointerover`/`pointerout` pair, which do bubble. `fireEvent.pointerEnter`
    // dispatches a real `pointerenter`, React ignores it, and the assertion
    // fails for a reason that has nothing to do with the component.
    fireEvent.pointerOver(screen.getByText("Dell U2720Q"))

    expect(window.api.identifyDisplay).toHaveBeenCalledWith(
      2,
    )

    fireEvent.pointerOut(screen.getByText("Dell U2720Q"))

    expect(
      window.api.stopIdentifyDisplay,
    ).toHaveBeenCalled()
  })

  test("keeps the whole row hot, including the glyph", async () => {
    await renderMenu([buildDisplay(2, "Dell U2720Q")])

    const [item] = await screen.findAllByRole("menuitem")

    // The glyph is rendered inside the `label` rather than passed as
    // `MenuItem`'s `icon` precisely so it is not a hole in the hover region.
    // Passed as `icon` it is a *sibling* of the label, so moving the pointer
    // from the words onto the picture fires `pointerleave` and puts the
    // monitor out — a flicker that no other assertion here would notice.
    const glyph = item.querySelector("svg")

    expect(glyph).not.toBeNull()

    fireEvent.pointerOver(glyph as SVGElement)

    expect(window.api.identifyDisplay).toHaveBeenCalledWith(
      2,
    )
  })

  test("spawns a window on the chosen display and stops identifying first", async () => {
    const { onSpawn } = await renderMenu([
      buildDisplay(1, "Built-in"),
      buildDisplay(2, "Dell U2720Q"),
    ])

    const items = await screen.findAllByRole("menuitem")

    fireEvent.click(items[1])

    expect(window.api.createNewWindow).toHaveBeenCalledWith(
      {
        displayId: 2,
        spawnedViewer: true,
      },
    )
    // The pointer never leaves the row — the menu unmounts under it — so the
    // overlay has to be put out explicitly or it stays lit on a real monitor.
    expect(
      window.api.stopIdentifyDisplay,
    ).toHaveBeenCalled()
    expect(onSpawn).toHaveBeenCalled()
  })

  test("says so with a disabled row when no display is detected", async () => {
    await renderMenu([])

    const item = await screen.findByRole("menuitem")

    // Not an empty panel: `role="menu"` with nothing in it is announced as
    // "menu, 0 items", which reads as a broken menu rather than as an answer.
    expect(item).toHaveTextContent("No displays detected.")
    expect(item).toBeDisabled()
  })
})
