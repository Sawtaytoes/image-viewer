import { createContext } from "react"

import type {
  DeleteJobResult,
  DeleteTarget,
} from "../../deleting/deleteItems"

// What `DeleteItemsProvider` supplies. Every delete button in the app asks
// here, so every delete gets the same question, progress, Stop button, and
// report, and the dialog survives the button that opened it closing.
export interface DeleteItemsContextValue {
  // True from the question until the report is closed. Keyboard handlers read
  // it so a key meant for the dialog never also drives the screen behind it.
  isDeleteDialogVisible: boolean
  // Resolves to null when the answer is "No", or to the result once the
  // delete ends, while its report is still on screen. A request made while
  // another delete is in its dialog resolves to null at once.
  requestDelete: (
    targets: readonly DeleteTarget[],
  ) => Promise<DeleteJobResult | null>
}

const DeleteItemsContext =
  createContext<DeleteItemsContextValue>({
    isDeleteDialogVisible: false,
    requestDelete: () => Promise.resolve(null),
  })

export default DeleteItemsContext
