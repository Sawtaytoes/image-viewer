import { useEffect, useState } from "react"

// Reports whether `elementRef`'s node has scrolled into view. Latches `true` on
// the first intersection and stops observing — a folder tile's thumbnail/gallery
// probe should run once, not re-fire every time the tile scrolls off and back.
const useInView = (elementRef) => {
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    if (isInView) {
      return undefined
    }

    const element = elementRef.current

    if (!element) {
      return undefined
    }

    const intersectionObserver = new IntersectionObserver(
      ([intersectionObserverEntry]) => {
        if (intersectionObserverEntry.isIntersecting) {
          setIsInView(true)
        }
      },
    )

    intersectionObserver.observe(element)

    return () => {
      intersectionObserver.disconnect()
    }
  }, [elementRef, isInView])

  return isInView
}

export default useInView
