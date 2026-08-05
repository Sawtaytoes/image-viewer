// Browser entry point (loaded by `index.browser.html`) — the counterpart to
// `renderer.tsx`, which `index.html` loads under Electron. It installs a browser
// `window.api` (fake filesystem + simulated window controls) and only THEN pulls
// in the renderer, because the provider tree reads `window.api` at import time.
// The import is dynamic for exactly that reason: a static `import "./renderer"`
// would be hoisted and evaluated before `installBrowserApi()` ran.
import { installBrowserApi } from "./browserApi"

installBrowserApi()

void import("./renderer")
