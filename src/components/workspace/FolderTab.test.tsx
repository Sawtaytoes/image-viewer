import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"

import FolderTab from "./FolderTab"

const renderTab = () => {
  const onClose = vi.fn()
  const onSelect = vi.fn()

  render(
    <FolderTab
      folderId="folder-1"
      isActive={false}
      name="Holiday"
      onClose={onClose}
      onSelect={onSelect}
    />,
  )

  return { onClose, onSelect }
}

describe("FolderTab", () => {
  test("selects the folder from its name button", () => {
    const { onClose, onSelect } = renderTab()

    fireEvent.click(
      screen.getByRole("button", { name: "Holiday" }),
    )

    expect(onSelect).toHaveBeenCalledWith("folder-1")
    expect(onClose).not.toHaveBeenCalled()
  })

  test("closes the folder without selecting it", () => {
    const { onClose, onSelect } = renderTab()

    fireEvent.click(
      screen.getByRole("button", { name: "Close Holiday" }),
    )

    expect(onClose).toHaveBeenCalledWith("folder-1")
    expect(onSelect).not.toHaveBeenCalled()
  })
})
