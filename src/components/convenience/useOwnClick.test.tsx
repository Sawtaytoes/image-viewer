import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react"
import { useRef } from "react"
import { describe, expect, test, vi } from "vitest"

import useOwnClick from "./useOwnClick"

const Wrapper = ({
  onOwnClick,
}: {
  onOwnClick: (event: MouseEvent) => void
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null)

  useOwnClick(wrapperRef, onOwnClick)

  return (
    <div data-testid="wrapper" ref={wrapperRef}>
      <button type="button">Child</button>
    </div>
  )
}

describe(useOwnClick.name, () => {
  test("runs for a click on the wrapper itself, and not for a click on a child", () => {
    const onOwnClick = vi.fn()

    render(<Wrapper onOwnClick={onOwnClick} />)

    fireEvent.click(
      screen.getByRole("button", { name: "Child" }),
    )

    expect(onOwnClick).not.toHaveBeenCalled()

    fireEvent.click(screen.getByTestId("wrapper"))

    expect(onOwnClick).toHaveBeenCalledTimes(1)
  })
})
