// Height (px) of the custom title bar. Shared so the bar and the two main views
// that reserve space beneath it (FileBrowser, ImageViewer) never drift apart —
// and must match `titleBarOverlay.height` in main.js so native window controls
// line up with our strip.
//
// It is now also `--title-bar-height` in `src/styles/tailwind.css`, because a
// Tailwind class cannot interpolate a JavaScript constant the way an Emotion
// template literal could. Three copies of one number, and
// `titleBarHeight.test.ts` is what stops them drifting.
const TITLE_BAR_HEIGHT = 40

export default TITLE_BAR_HEIGHT
