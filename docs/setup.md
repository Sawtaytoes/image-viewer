# Set up Image Viewer

[← Back to the README](../README.md)

Image Viewer is a desktop Electron application. It does not use Docker or run a server in
normal use.

## Install on Windows

Open [the latest GitHub release](https://github.com/Sawtaytoes/image-viewer/releases/latest)
and download the `Setup.exe` asset. Run it, then start Image Viewer from the Start menu.

The release also includes a Windows ZIP. Extract it to a stable directory and run
`ImageViewer.exe` when you want a portable copy without the Squirrel installer.

The packaged executable uses the one-word filename `ImageViewer.exe`. The displayed product
name is Image Viewer.

## Install on Linux

Download the package for your distribution and processor from the release: `amd64`/`x86_64`
for most PCs, `arm64`/`aarch64` for a Raspberry Pi or another ARM machine.

```sh
sudo apt install ./image-viewer_<version>_amd64.deb       # Debian, Ubuntu
sudo dnf install ./image-viewer-<version>-1.x86_64.rpm    # Fedora
```

Start Image Viewer from the application menu (under Graphics) or run `image-viewer`. The Linux
ZIP is the portable option: extract it and run `ImageViewer`.

## Install on macOS

Download the macOS ZIP for your Mac — `darwin-arm64` for Apple silicon, `darwin-x64` for
Intel — and drag `ImageViewer.app` into Applications.

The app is ad-hoc signed but not notarized, because the project has no Apple Developer
account. macOS therefore blocks the first launch and may say the app is damaged. Clear the
download quarantine once, then open it normally:

```sh
xattr -dr com.apple.quarantine /Applications/ImageViewer.app
```

## Choose the start directory

When no image or folder is supplied, Image Viewer opens the drive list: every drive letter on
Windows; on macOS and Linux, `/`, your home folder, and each mounted volume (`/Volumes/*` on
macOS; `/media/<user>/*`, `/run/media/<user>/*`, and `/mnt/*` on Linux). To open a particular
directory instead, set the `IMAGE_VIEWER_DEFAULT_DIRECTORY` user environment variable to an
absolute path before you launch the application.

Image Viewer can also receive a file or folder path from the operating system. It passes that
path to the isolated renderer through the preload bridge.

## Run from source

Requirements:

- Node.js 24 or later (`.nvmrc` pins the version the project develops on)
- pnpm 12.9.1 (`npm install --global --force --allow-scripts=pnpm pnpm@12.9.1`)
- the platform build tools required by Electron Forge when you create distributables:
  `dpkg` and `fakeroot` for the `.deb`, `rpm` for the `.rpm`, and `zip` for the Linux ZIP

Install and start the development application:

```sh
pnpm install
pnpm start
```

Copy [`.env.example`](../.env.example) to `.env` only when you need a development default
directory. Do not commit your local path or release credentials.

Use the invented filesystem for repeatable interface work:

```sh
IMAGE_VIEWER_FAKE_FS=1 pnpm start
```

## Build packages

```sh
pnpm package
pnpm make
```

`package` creates an unpacked application. `make` creates the distributables supported by
Electron Forge for the current platform. Official releases build every platform through
GitHub Actions: the Squirrel installer and ZIP on Windows; the `.deb`, `.rpm`, and ZIP for
Linux x64 and arm64; and the ZIP for macOS arm64 and x64.

## Browser development harness

The browser harness runs the renderer without privileged Electron filesystem access:

```sh
pnpm dev:browser
```

Use it for renderer and routing work. Use Electron for final verification of file access,
window management, operating-system theme integration, and delete-to-trash behavior. The
details are in [the browser harness guide](2026-08-05-run-in-a-browser.md).

## Validate a change

```sh
pnpm test:run
pnpm typecheck
pnpm lint:biome
pnpm lint:eslint
pnpm build:renderer
```

Use `pnpm package` when a change affects the Electron main process, preload bridge,
or packaging configuration.
