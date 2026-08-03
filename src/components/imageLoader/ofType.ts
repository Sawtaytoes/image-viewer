import { type OperatorFunction, pipe } from "rxjs"
import { filter } from "rxjs/operators"

import type { ImageLoaderAction } from "./imageLoaderActions"

// Narrows the store's single action stream down to the actions an epic cares
// about. `SelectedAction` is the shape those types are known to carry — the
// action creators' `.type` is a plain `string`, so there is no literal
// discriminant for TypeScript to narrow on and the epic names the payload it
// expects instead. This is the same contract `redux-observable`'s own `ofType`
// offers, and it is the reason each epic passes exactly the action types whose
// payload it declares.
const ofType = <SelectedAction extends ImageLoaderAction>(
  ...requiredTypes: string[]
): OperatorFunction<ImageLoaderAction, SelectedAction> =>
  pipe(
    filter(Boolean),
    filter((action: ImageLoaderAction) =>
      Boolean(action.type),
    ),
    filter(
      (
        action: ImageLoaderAction,
      ): action is SelectedAction =>
        requiredTypes.includes(action.type),
    ),
  )

export default ofType
