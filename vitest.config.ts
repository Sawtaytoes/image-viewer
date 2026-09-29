import { createVitestConfig } from "@charcuterie/vitest-config"
import react from "@vitejs/plugin-react"

// Node 25 turned its own Web Storage on by default, so Node 26 has a global
// `localStorage` of its own. Without `--localstorage-file` that global is
// `undefined`, and it shadows the jsdom `localStorage` the tests expect:
// `window.localStorage.clear()` then throws "Cannot read properties of
// undefined". Node 24, which CI runs, has the feature off, so the suite passed
// there and failed in a Node 26 sandbox.
//
// The flag is passed to the test workers only, and only when this Node knows
// it: Node 20 predates `--experimental-webstorage` and would refuse to start a
// worker with an unknown flag. On Node 22 and 24 the flag restates the default.
const storageExecArgv =
  process.allowedNodeEnvironmentFlags.has(
    "--no-experimental-webstorage",
  )
    ? ["--no-experimental-webstorage"]
    : []

// Vitest uses the same React transform as the renderer build so JSX behaves
// identically in tests.
//
// No `@tailwindcss/vite` here, deliberately. jsdom does not compute styles from
// a stylesheet the way a browser does, so generating the utilities would cost a
// Tailwind pass per run and prove nothing: a `className` assertion reads the
// attribute, which is present with or without the CSS. The gate that CAN see a
// missing utility is `yarn build:renderer`, and that runs the real plugin.
export default createVitestConfig({
  plugins: [react()],
  test: {
    // jsdom, not a real browser: the comment above says why. The shared
    // config turns browser mode on by default, so this suite opts out.
    browser: { enabled: false },
    environment: "jsdom",
    execArgv: storageExecArgv,
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
})
