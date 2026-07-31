import { createRoot } from "react-dom/client"

import ReactRoot from "./components/ReactRoot"
// The renderer's one stylesheet — Tailwind, the Charcuterie tokens, and the
// self-hosted Source Sans Pro. Imported HERE and nowhere else: this module is
// the only entry `index.html` loads, so this is the single point that decides
// what CSS the window has. It is also why `App` no longer renders an Emotion
// `<Global>`.
import "./styles/tailwind.css"

const rootElement = document.getElementById("reactRoot")

// `getElementById` is `HTMLElement | null`, and `createRoot` takes neither
// `null` nor a maybe. Throwing names the actual failure — `index.html` lost its
// mount node — instead of letting a non-null assertion turn it into "Cannot
// read properties of null" one frame later, inside React.
if (!rootElement) {
  throw new Error(
    'index.html is missing its <div id="reactRoot"> mount node.',
  )
}

createRoot(rootElement).render(<ReactRoot />)
