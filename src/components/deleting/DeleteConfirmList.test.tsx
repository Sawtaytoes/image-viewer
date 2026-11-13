import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import DeleteConfirmList from "./DeleteConfirmList"

describe("DeleteConfirmList", () => {
  test("names every item, however many were selected", () => {
    const targets = Array.from(
      { length: 120 },
      (_, index) => ({
        filePath: `/photos/Album ${index + 1}`,
        isDirectory: true,
      }),
    )

    render(
      <DeleteConfirmList
        getName={(filePath) =>
          filePath.slice("/photos/".length)
        }
        summary={null}
        summaryErrorMessage={null}
        targets={targets}
        trashName="Recycle Bin"
      />,
    )

    expect(screen.getAllByRole("listitem")).toHaveLength(
      120,
    )
    expect(
      screen.getByText("Album 120"),
    ).toBeInTheDocument()
  })
})
