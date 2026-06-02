import { createRoot } from "react-dom/client"

import ReactRoot from "./components/ReactRoot"

const rootElement = document.getElementById("reactRoot")

createRoot(rootElement).render(<ReactRoot />)
