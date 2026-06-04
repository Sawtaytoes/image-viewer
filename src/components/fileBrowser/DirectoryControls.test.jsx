import path from "node:path"

import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react"
import { beforeAll, describe, expect, it, vi } from "vitest"

import FileSystemContext from "./FileSystemContext"

// DirectoryControls captures `window.api.path` at module-load, so swap in real
// Windows path semantics (drive roots like `C:\` are exactly the fiddly case
// the breadcrumb has to get right) before importing it.
let DirectoryControls

beforeAll(async () => {
  window.api = { ...window.api, path: path.win32 }

  ;({ default: DirectoryControls } = await import(
    "./DirectoryControls"
  ))
})

const renderControls = ({ filePath }) => {
  const setFilePath = vi.fn()

  const contextValue = {
    directories: [],
    filePath,
    imageFiles: [],
    isRootFilePath: !filePath,
    navigateUpFolderTree: vi.fn(),
    setFilePath,
  }

  render(
    <FileSystemContext.Provider value={contextValue}>
      <DirectoryControls />
    </FileSystemContext.Provider>,
  )

  return { setFilePath }
}

describe("DirectoryControls breadcrumb", () => {
  it("renders an ancestor trail with the drive root stripped of its separator", () => {
    renderControls({ filePath: "C:\\Pictures\\Vacation" })

    // Drive root shown as `C:` (trailing `\` stripped), then each ancestor.
    expect(screen.getByText("C:")).toBeInTheDocument()
    expect(screen.getByText("Pictures")).toBeInTheDocument()
    expect(screen.getByText("Vacation")).toBeInTheDocument()
  })

  it("makes ancestors clickable and navigates to the clicked segment", () => {
    const { setFilePath } = renderControls({
      filePath: "C:\\Pictures\\Vacation",
    })

    fireEvent.click(screen.getByText("Pictures"))

    expect(setFilePath).toHaveBeenCalledWith("C:\\Pictures")
  })

  it("leaves the current folder as non-interactive 'you are here'", () => {
    const { setFilePath } = renderControls({
      filePath: "C:\\Pictures\\Vacation",
    })

    // The trailing segment is a plain span, not a button.
    const current = screen.getByText("Vacation")

    expect(current.tagName).not.toBe("BUTTON")

    fireEvent.click(current)

    expect(setFilePath).not.toHaveBeenCalled()
  })

  it("renders no breadcrumb at the drive list (empty path)", () => {
    renderControls({ filePath: "" })

    expect(screen.queryByText("C:")).not.toBeInTheDocument()
  })
})
