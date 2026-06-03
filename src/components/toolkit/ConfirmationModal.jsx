import { css, keyframes } from "@emotion/react"
import PropTypes from "prop-types"
import { memo, useEffect, useState } from "react"
import useKeyboardControls from "../convenience/useKeyboardControls"
import Button from "./Button"

const ANIMATION_DURATION_MS = 200

const backdropFadeIn = keyframes`
	from { opacity: 0; }
	to { opacity: 1; }
`

const backdropFadeOut = keyframes`
	from { opacity: 1; }
	to { opacity: 0; }
`

const contentScaleIn = keyframes`
	from { opacity: 0; transform: scale(0.9); }
	to { opacity: 1; transform: scale(1); }
`

const contentScaleOut = keyframes`
	from { opacity: 1; transform: scale(1); }
	to { opacity: 0; transform: scale(0.9); }
`

const contentStyles = css`
	align-items: center;
	display: flex;
	flex-direction: column;
`

const choicesStyles = css`
	align-items: center;
	display: flex;
	justify-content: center;
`

const choiceButtonStyles = css`
	&:first-of-type {
		margin-right: 20%;
	}

	&:last-of-type {
		margin-left: 20%;
	}
`

const confirmationModalStyles = css`
	align-items: center;
	background-color: rgba(51, 51, 51, 0.9);
	display: flex;
	flex-direction: column;
	height: 100%;
	justify-content: center;
	left: 0;
	position: fixed;
	top: 0;
	width: 100%;
	z-index: 99999;
`

const messageStyles = css`
	font-family: 'Source Sans Pro', sans-serif;
	font-size: 32px;
	font-weight: 400;
	margin-bottom: 100px;
	text-align: center;
`

const propTypes = {
  children: PropTypes.node.isRequired,
  closeButtonText: PropTypes.string.isRequired,
  confirmButtonText: PropTypes.string.isRequired,
  isVisible: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
}

const ConfirmationModal = ({
  children,
  closeButtonText,
  confirmButtonText,
  isVisible = false,
  onClose,
  onConfirm,
}) => {
  // Stay mounted while the close animation plays, then unmount once it finishes.
  const [isRendered, setIsRendered] = useState(isVisible)

  useEffect(() => {
    if (isVisible) {
      setIsRendered(true)
    }
  }, [isVisible])

  useKeyboardControls((event) => {
    if (!isVisible) {
      return
    }

    // Since we don't have a keydown provider, we have to use `setTimeout` to ensure this is the last listener to run. Prevents timing issues where this runs before `FileBrowser`.
    setTimeout(() => {
      if (
        event.code === "Backspace" ||
        event.code === "Escape"
      ) {
        onClose()
      } else if (event.code === "Enter") {
        onConfirm()
      }
    })
  })

  if (!isRendered) {
    return null
  }

  return (
    <div
      css={css`
        ${confirmationModalStyles}
        animation: ${isVisible ? backdropFadeIn : backdropFadeOut} ${ANIMATION_DURATION_MS}ms ease forwards;
      `}
      onAnimationEnd={(event) => {
        // Only the backdrop's own fade-out should unmount (ignore bubbling from the content animation).
        if (
          event.target === event.currentTarget &&
          !isVisible
        ) {
          setIsRendered(false)
        }
      }}
      onClick={(event) => {
        // Clicking the backdrop (but not the message or buttons) dismisses the modal without confirming.
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        css={css`
          ${contentStyles}
          animation: ${isVisible ? contentScaleIn : contentScaleOut} ${ANIMATION_DURATION_MS}ms ease forwards;
        `}
      >
        <div css={messageStyles}>{children}</div>

        <div css={choicesStyles}>
          <div css={choiceButtonStyles}>
            <Button onClick={onClose} type="negative">
              {closeButtonText}
            </Button>
          </div>

          <div css={choiceButtonStyles}>
            <Button onClick={onConfirm} type="positive">
              {confirmButtonText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

ConfirmationModal.propTypes = propTypes

const MemoizedConfirmationModal = memo(ConfirmationModal)

export default MemoizedConfirmationModal
