import { useEffect } from "react"

// `KeyboardEvent.code` values, so the guard is layout-independent — this is the
// physical-key list, not a character list. Ctrl+R is deliberately absent: a
// blanket preventDefault once killed refresh
// (`docs/decisions/2020-11-26-keep-ctrl-r-refresh.md`).
const scrollKeys: readonly string[] = [
  "ArrowUp",
  "ArrowDown",
  "ArrowRight",
  "ArrowLeft",
  "PageUp",
  "PageDown",
  "Home",
  "End",
]

const useDisableScrollKeyFunctions = () => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (scrollKeys.includes(event.code)) {
        event.preventDefault()
      }
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [])
}

export default useDisableScrollKeyFunctions
