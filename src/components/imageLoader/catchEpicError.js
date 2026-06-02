import { of } from "rxjs"
import { catchError } from "rxjs/operators"

const catchEpicError = (epicName) =>
  catchError((error) => {
    console.error(
      epicName,
      "\n",
      error.constructor.name === "ErrorEvent"
        ? error.error.stack
        : error,
    )

    return of({
      epicName,
      error,
      type: "caughtError",
    })
  })

export default catchEpicError
