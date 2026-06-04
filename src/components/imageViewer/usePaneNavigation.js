import { useCallback } from "react"

// Index math lifted out of `useImageNavigation`, parameterized so each pane
// (and the legacy single-image overlay, via an adapter) can drive its own
// current image with clamped prev/next.
const usePaneNavigation = ({
  currentIndex,
  imageFiles,
  setCurrentIndex,
}) => {
  const goToNextImage = useCallback(() => {
    setCurrentIndex(
      Math.min(currentIndex + 1, imageFiles.length - 1),
    )
  }, [currentIndex, imageFiles.length, setCurrentIndex])

  const goToPreviousImage = useCallback(() => {
    setCurrentIndex(Math.max(currentIndex - 1, 0))
  }, [currentIndex, setCurrentIndex])

  return {
    goToNextImage,
    goToPreviousImage,
    isAtBeginning: currentIndex <= 0,
    isAtEnd: currentIndex >= imageFiles.length - 1,
  }
}

export default usePaneNavigation
