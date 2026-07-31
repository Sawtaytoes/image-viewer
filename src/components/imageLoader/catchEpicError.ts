import {
  type Observable,
  type OperatorFunction,
  of,
} from "rxjs"
import { catchError } from "rxjs/operators"

// What an epic emits instead of an action once it has blown up: the failure is
// logged and swallowed here so one epic's error can't tear the root stream
// down. Nothing subscribes to it — it exists to keep the stream alive.
export interface CaughtErrorAction {
  epicName: string
  error: Error | ErrorEvent
  type: string
}

// A window `error` event arrives wrapped, with the real failure (and its
// stack) hanging off `.error`. Checked by constructor name rather than
// `instanceof` because the event can come from another realm.
const isErrorEvent = (
  error: Error | ErrorEvent,
): error is ErrorEvent =>
  error.constructor.name === "ErrorEvent"

const catchEpicError = <Emitted>(
  epicName: string,
): OperatorFunction<Emitted, Emitted | CaughtErrorAction> =>
  catchError<Emitted, Observable<CaughtErrorAction>>(
    (error: Error | ErrorEvent) => {
      console.error(
        epicName,
        "\n",
        isErrorEvent(error) ? error.error.stack : error,
      )

      return of({
        epicName,
        error,
        type: "caughtError",
      })
    },
  )

export default catchEpicError
