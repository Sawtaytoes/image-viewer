# 2026-06-02 — Inline SVG icons and drop Material UI

- **Status:** Locked
- **Date:** 2026-06-02
- **Deciders:** Kevin (owner) + agent
- **Source:** Migrated from `docs/research/0005-icons-and-deps.md` (Phase 1 modernization)

## Decision (the rule)

**Inline four small SVG icon components** under `src/components/icons/` and drop both `@material-ui/core` and `@material-ui/icons`. Prune all obsolete build/styling dependencies left over from the Webpack/Babel era.

## What was rejected ("no, that's wrong")

Migrating Material UI v4 → v9 (a near-total rewrite: JSS→Emotion, `makeStyles` removed, package rename), or pulling `@mui/icons-material@9` just for four glyphs — a large dependency working against the startup-speed goal. An audit showed **no `@material-ui/core` component, theme, or styling API is imported anywhere**; styling is entirely Emotion's `css` prop. The only MUI usage was four icons (`DeleteForeverRounded`, `ArrowUpwardRounded` in `fileBrowser/DirectoryControls.js`; `ArrowBackRounded`, `ArrowForwardRounded` in `imageViewer/ImageViewControls.js`).

## Why

Inline SVGs are a few lines each, match the Material "Rounded" glyphs (paths from Material Symbols), and have zero runtime cost — aligned with the owner's startup-speed goal.

## How to honor it

- Removed (obsolete with Vite + secure-model migration): `react-hot-loader`, `@hot-loader/react-dom` (→ React Fast Refresh); `@emotion/core`, `@emotion/babel-preset-css-prop`, `babel-plugin-emotion` (→ `@emotion/react@11`, `@emotion/styled@11`, `@emotion/babel-plugin@11`); all `@babel/*`, `babel-loader`, `babel-eslint`, `eslint-loader`, `node-loader`, `@marshallofsound/webpack-asset-relocator-loader`; `config` (→ `import.meta.env`); `@ghadyani-eslint/*` + old `eslint-plugin-*`.
- Kept: `electron-squirrel-startup` (^1.0.1), `string-natural-compare`, `rxjs` (6→7), `prop-types` (now declared explicitly).
- Added: `@types/node`, `@types/react`, `@types/react-dom`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `vitest`, plus the build/lint stack.

## Evidence

Original ADR `docs/research/0005-icons-and-deps.md`. Usage audit found zero MUI core/styling imports; only four icons across two files.

## Related

- [[2026-06-02-build-toolchain-electron-forge-vite]]
- [[2026-06-02-linting-biome-plus-minimal-eslint]]
- [[2026-06-02-typescript-tooling-now-convert-later]]
