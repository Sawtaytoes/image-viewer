import {
  type DependencyList,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react"

import ImageLoaderContext from "./ImageLoaderContext"
import type {
  ImageLoaderSelection,
  ImageLoaderState,
} from "./reducers"

// Subscribes a component to a projection of the loader store. The result is
// `Partial` because the first render happens before the subscription in
// `useLayoutEffect` delivers anything — callers already default what they read
// (`percentDownloaded = 0`), and this is what makes that necessary rather than
// merely defensive.
const useStateSelector = <
  Selected extends ImageLoaderSelection,
>(
  stateSelector: (state: ImageLoaderState) => Selected,
  dependencies: DependencyList,
): Partial<Selected> => {
  const stateSelectorRef = useRef(stateSelector)

  stateSelectorRef.current = stateSelector

  const { createStateObservable } = useContext(
    ImageLoaderContext,
  )

  const [state, setState] = useState<Partial<Selected>>({})

  useLayoutEffect(() => {
    const subscriber = createStateObservable(
      stateSelectorRef.current,
    ).subscribe(setState)

    return () => {
      subscriber.unsubscribe()
    }
  }, [
    createStateObservable,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ...dependencies,
  ])

  return state
}

export default useStateSelector
