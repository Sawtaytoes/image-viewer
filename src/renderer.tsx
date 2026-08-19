import { createRoot } from "react-dom/client"
import { Navigate, Route, Routes } from "react-router"

import ReactRoot from "./components/ReactRoot"
import { AppRouter } from "./routing/AppRouter"
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

// One route today. It is a router anyway, per the fleet decision
// `2026-08-16-owned-web-apps-use-react-router-with-path-urls`, which covers
// single-view apps deliberately — the next view should be a route rather than a
// `useState` fork bolted on later.
//
// `AppRouter` is the one place this app differs from the rest of the fleet, and
// it differs in its HISTORY only: `file://` under Electron cannot do path URLs,
// so it gets a hash history there and `BrowserRouter` when served over http.
// Route table and `<Link>`s are identical either way. See `routing/AppRouter`.
createRoot(rootElement).render(
  <AppRouter>
    <Routes>
      <Route element={<ReactRoot />} path="/" />
      <Route
        element={<Navigate replace to="/" />}
        path="*"
      />
    </Routes>
  </AppRouter>,
)
