# 0005 — Icons & dependency pruning

- **Status:** Accepted (Phase 1)
- **Date:** 2026-06-02
- **Deciders:** agent (sensible default), aligned with the owner's startup-speed goal.

## Context

`package.json` listed `@material-ui/core@4` and `@material-ui/icons@4`. Material UI v4 → v9 is a
near-total rewrite (JSS → Emotion, `makeStyles` removed, package rename). Before assuming that pain,
we audited usage: **no `@material-ui/core` component, theme, or styling API is imported anywhere.**
All styling is Emotion's `css` prop. The only MUI usage is **four icons**:

- `DeleteForeverRounded` → `fileBrowser/DirectoryControls.js`
- `ArrowUpwardRounded` → `fileBrowser/DirectoryControls.js`
- `ArrowBackRounded` → `imageViewer/ImageViewControls.js`
- `ArrowForwardRounded` → `imageViewer/ImageViewControls.js`

## Decision

**Inline four small SVG icon components** under `src/components/icons/` and drop both
`@material-ui/core` and `@material-ui/icons`. Pulling `@mui/icons-material@9` just for four glyphs
adds a large dependency that works against the startup-speed goal; inline SVGs are a few lines each,
match the Material "Rounded" glyphs (paths from the Material Symbols set), and have zero runtime cost.

## Other dependency changes

**Removed** (obsolete with the Vite + secure-model migration):
- `react-hot-loader`, `@hot-loader/react-dom` → replaced by React Fast Refresh (Vite).
- `@emotion/core`, `@emotion/babel-preset-css-prop`, `babel-plugin-emotion` → `@emotion/react@11`,
  `@emotion/styled@11`, `@emotion/babel-plugin@11` (via `@vitejs/plugin-react` babel option).
- All `@babel/*`, `babel-loader`, `babel-eslint`, `eslint-loader`, `node-loader`,
  `@marshallofsound/webpack-asset-relocator-loader` → Vite/esbuild handle transpilation.
- `config` (node-config) → use Vite mode / `import.meta.env` instead.
- `@ghadyani-eslint/*`, `eslint-plugin-*` (old set) → see [0003](0003-linting-and-formatting.md).

**Kept:** `electron-squirrel-startup` (still valid, bumped to ^1.0.1), `string-natural-compare`
(used by `compareNaturalStrings.js`), `rxjs` (6 → 7), `prop-types` (now declared **explicitly** — it
was imported but only present transitively before).

**Added:** `@types/node`, `@types/react`, `@types/react-dom`, `jsdom`, `@testing-library/react`,
`@testing-library/jest-dom`, `vitest`, plus the build/lint stack from [0001](0001-build-toolchain.md)
and [0003](0003-linting-and-formatting.md).
