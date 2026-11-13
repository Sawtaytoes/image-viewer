import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { useContext } from "react"
import {
  afterEach,
  describe,
  expect,
  test,
  vi,
} from "vitest"

import type {
  DeleteJobResult,
  DeleteProgress,
  DeleteTarget,
} from "../../deleting/deleteItems"
import DeleteItemsContext from "./DeleteItemsContext"
import DeleteItemsProvider from "./DeleteItemsProvider"

const originalDeleteItems = window.api.deleteItems

afterEach(() => {
  window.api.deleteItems = originalDeleteItems
})

const targets: readonly DeleteTarget[] = [
  { filePath: "/photos/Cats", isDirectory: true },
]

// A `window.api.deleteItems` whose job the test drives by hand: it hands
// progress in through `sendProgress` and ends the job with `finish`.
const installControlledDeleteItems = () => {
  let onProgress: (progress: DeleteProgress) => void =
    () => {}

  let resolveJob: (result: DeleteJobResult) => void =
    () => {}

  const stop = vi.fn()

  const start = vi.fn(
    (
      _request: {
        jobId: string
        targets: readonly DeleteTarget[]
      },
      nextOnProgress: (progress: DeleteProgress) => void,
    ) => {
      onProgress = nextOnProgress

      return new Promise<DeleteJobResult>((resolve) => {
        resolveJob = resolve
      })
    },
  )

  window.api.deleteItems = {
    start,
    stop,
    summarize: () =>
      Promise.resolve({
        fileCount: 1204,
        folderCount: 3,
        isComplete: true,
        items: [
          {
            errorMessage: null,
            fileCount: 1204,
            filePath: "/photos/Cats",
            folderCount: 3,
            isComplete: true,
            isDirectory: true,
            name: "Cats",
            totalBytes: 45 * 1024 * 1024,
          },
        ],
        totalBytes: 45 * 1024 * 1024,
      }),
  }

  return {
    finish: (result: DeleteJobResult) => {
      resolveJob(result)
    },
    sendProgress: (progress: DeleteProgress) => {
      onProgress(progress)
    },
    start,
    stop,
  }
}

// Stands in for a delete button anywhere in the app.
const DeleteButton = ({
  onResult,
}: {
  onResult: (result: DeleteJobResult | null) => void
}) => {
  const { requestDelete } = useContext(DeleteItemsContext)

  return (
    <button
      onClick={() => {
        requestDelete(targets).then(onResult)
      }}
      type="button"
    >
      Delete Cats
    </button>
  )
}

const renderProvider = () => {
  const onResult = vi.fn()

  render(
    <DeleteItemsProvider>
      <DeleteButton onResult={onResult} />
    </DeleteItemsProvider>,
  )

  return { onResult }
}

const removingProgress = (
  entriesDone: number,
): DeleteProgress => ({
  currentPath: `/photos/Cats/photo-${entriesDone}.jpg`,
  entriesDone,
  entriesTotal: 1208,
  isStopRequested: false,
  itemCount: 1,
  itemIndex: 0,
  itemName: "Cats",
  itemPath: "/photos/Cats",
  phase: "removing",
})

describe("DeleteItemsProvider", () => {
  test("the question names the folder and what it holds", async () => {
    installControlledDeleteItems()
    renderProvider()

    fireEvent.click(screen.getByText("Delete Cats"))

    expect(
      screen.getByRole("dialog", {
        name: "Delete the folder “Cats”?",
      }),
    ).toBeInTheDocument()

    expect(
      await screen.findByText(
        "In all: 1,204 files and 4 folders, 45 MB.",
      ),
    ).toBeInTheDocument()
  })

  test("No resolves the request to null and starts nothing", async () => {
    const { start } = installControlledDeleteItems()
    const { onResult } = renderProvider()

    fireEvent.click(screen.getByText("Delete Cats"))
    fireEvent.click(screen.getByText("No"))

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith(null)
    })
    expect(start).not.toHaveBeenCalled()
  })

  test("Yes shows progress, Stop halts the job, and the report says what happened", async () => {
    const { finish, sendProgress, start, stop } =
      installControlledDeleteItems()

    const { onResult } = renderProvider()

    fireEvent.click(screen.getByText("Delete Cats"))
    fireEvent.click(screen.getByText("Yes"))

    expect(start).toHaveBeenCalledWith(
      { jobId: expect.any(String), targets },
      expect.any(Function),
    )

    const jobId = start.mock.calls[0]?.[0].jobId

    act(() => {
      sendProgress(removingProgress(120))
    })

    expect(
      screen.getByText(
        "Deleting permanently: 120 of 1,208 files and folders removed.",
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Now: photo-120.jpg"),
    ).toBeInTheDocument()
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      String(120 / 1208),
    )
    expect(
      screen.getByText(
        "Stop halts the items that remain. It cannot bring back anything already deleted.",
      ),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByText("Stop"))

    expect(stop).toHaveBeenCalledWith(jobId)
    expect(
      screen.getByRole("button", { name: "Stopping…" }),
    ).toBeDisabled()

    const result: DeleteJobResult = {
      isStopped: true,
      items: [
        {
          entriesRemoved: 124,
          entriesTotal: 1208,
          errorMessage: null,
          filePath: "/photos/Cats",
          isDirectory: true,
          name: "Cats",
          outcome: "partlyDeleted",
          trashErrorMessage: "no trash on this share",
        },
      ],
    }

    await act(async () => {
      finish(result)
    })

    expect(onResult).toHaveBeenCalledWith(result)
    expect(
      screen.getByRole("dialog", {
        name: "Delete stopped: 0 of 1 item deleted",
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        "Stopped partway: 124 of 1,208 files and folders were deleted permanently. The rest are still there.",
      ),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByText("Done"))

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog"),
      ).not.toBeInTheDocument()
    })
  })

  test("a second request while the dialog is up resolves to null at once", async () => {
    installControlledDeleteItems()

    const { onResult } = renderProvider()

    fireEvent.click(screen.getByText("Delete Cats"))
    fireEvent.click(screen.getByText("Delete Cats"))

    await waitFor(() => {
      expect(onResult).toHaveBeenCalledWith(null)
    })
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  test("a job that throws still ends in a report", async () => {
    window.api.deleteItems = {
      start: () => Promise.reject(new Error("IPC failed")),
      stop: () => {},
      summarize: () => new Promise(() => {}),
    }

    const { onResult } = renderProvider()

    fireEvent.click(screen.getByText("Delete Cats"))
    fireEvent.click(screen.getByText("Yes"))

    expect(
      await screen.findByText(
        "Could not delete: IPC failed.",
      ),
    ).toBeInTheDocument()
    expect(onResult).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({ outcome: "failed" }),
        ],
      }),
    )
  })
})
