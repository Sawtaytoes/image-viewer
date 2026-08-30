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

## Choose the start directory

When no image or folder is supplied, Image Viewer opens the drive list. To open a particular
directory instead, set the `IMAGE_VIEWER_DEFAULT_DIRECTORY` user environment variable to an
absolute path before you launch the application.

Image Viewer can also receive a file or folder path from the operating system. It passes that
path to the isolated renderer through the preload bridge.

## Run from source

Requirements:

- Node.js 20.18 or later
- Corepack and Yarn 4
- the platform build tools required by Electron Forge when you create distributables

Install and start the development application:

```sh
corepack yarn install
corepack yarn start
```

Copy [`.env.example`](../.env.example) to `.env` only when you need a development default
directory. Do not commit your local path or release credentials.

Use the invented filesystem for repeatable interface work:

```sh
IMAGE_VIEWER_FAKE_FS=1 corepack yarn start
```

## Build packages

```sh
corepack yarn package
corepack yarn make
```

`package` creates an unpacked application. `make` creates the distributables supported by
Electron Forge for the current platform. Official Windows releases build and publish the
Squirrel installer and ZIP through GitHub Actions.

## Browser development harness

The browser harness runs the renderer without privileged Electron filesystem access:

```sh
corepack yarn dev:browser
```

Use it for renderer and routing work. Use Electron for final verification of file access,
window management, operating-system theme integration, and delete-to-trash behavior. The
details are in [the browser harness guide](2026-08-05-run-in-a-browser.md).

## Validate a change

```sh
corepack yarn test:run
corepack yarn typecheck
corepack yarn lint:biome
corepack yarn lint:eslint
corepack yarn build:renderer
```

Use `corepack yarn package` when a change affects the Electron main process, preload bridge,
or packaging configuration.
