# Image Viewer

**[Install Image Viewer on Windows →](docs/setup.md)**

Image Viewer is a touch-friendly Electron image browser. It supports folder browsing,
full-screen viewing, side-by-side folders, multi-display windows, natural filename sorting,
saved queues, and deletion through the operating system trash.

The renderer uses React and TypeScript behind an isolated Electron preload bridge. Images
stay on the local filesystem.

## Install a release

Download the Windows installer from [the latest GitHub release](https://github.com/Sawtaytoes/image-viewer/releases/latest).
Run the setup executable, then open Image Viewer from the Start menu or open an image or
folder with the application.

See [the setup guide](docs/setup.md) for the portable ZIP, default start directory, and
source-build instructions.

## Run from source

```sh
npm install --global --force pnpm@12.9.1
pnpm install
pnpm start
```

Use `IMAGE_VIEWER_FAKE_FS=1 pnpm start` to run with invented fixture folders.

## Documentation

- [Installation and source setup](docs/setup.md)
- [Known issues](docs/known-issues.md)
- [Roadmap](docs/roadmap.md)
- [Changelog](CHANGELOG.md)
- [Decision records](docs/decisions/README.md)

Image Viewer is available under the [MIT License](LICENSE.md).

## Dependency installation

`pnpm-workspace.yaml` keeps the physical, hoisted `node_modules` tree required by
Electron Forge. Dependency install scripts remain enabled, matching the prior
Yarn configuration; task pre/post hooks remain disabled.

The pinned npm release-tool dependency bundles its own dependencies. The scoped
`.pnpmfile.cjs` hook and deletion-only npm patch remove that duplicate bundle so
npm resolves the same locked, security-patched packages Yarn used. npm's own
license and all active dependency licenses remain present. When upgrading npm,
regenerate that patch from the exact official tarball and verify the resolved
graph and `pnpm check:dependency-patches` before changing its version.
