import { FuseV1Options, FuseVersion } from "@electron/fuses"
import { MakerDeb } from "@electron-forge/maker-deb"
import { MakerRpm } from "@electron-forge/maker-rpm"
import { MakerSquirrel } from "@electron-forge/maker-squirrel"
import { MakerZIP } from "@electron-forge/maker-zip"
import { FusesPlugin } from "@electron-forge/plugin-fuses"
import { VitePlugin } from "@electron-forge/plugin-vite"
import type { ForgeConfig } from "@electron-forge/shared-types"

import { buildAppIcons } from "./scripts/appIcon"

// The rasterized icons land in the gitignored `build/`. `generateAssets` below
// writes them before `start`, `package` and `make` read them.
const appIconBase = "build/icon"

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    // Build artifacts use the one-word name (folder `ImageViewer-win32-x64`,
    // `ImageViewer.exe`) regardless of the spaced `productName` display label.
    name: "ImageViewer",
    executableName: "ImageViewer",
    // macOS reads these from the bundle's Info.plist: the id names the app to
    // the OS, and the category files it under Photography in Finder.
    appBundleId: "io.github.sawtaytoes.imageviewer",
    appCategoryType: "public.app-category.photography",
    // Packager adds `.ico` on Windows and `.icns` on macOS.
    icon: appIconBase,
    // The Linux window draws its own icon, so the PNG ships beside the app
    // (`process.resourcesPath`) where `main.js` can read it. The Vite plugin
    // packages only `.vite/`, so a file anywhere else is not in the app.
    extraResource: [`${appIconBase}.png`],
  },
  hooks: {
    generateAssets: async () => {
      await buildAppIcons({
        markPath: "public/favicon.svg",
        outputDirectory: "build",
      })
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: "image_viewer",
      setupIcon: `${appIconBase}.ico`,
    }),
    // The zip is the only macOS download (no signing identity, so no DMG; see
    // docs/decisions/2026-10-14-linux-and-macos-builds-ship-and-the-mac-build-is-unsigned.md)
    // and a no-install option on Windows and Linux.
    new MakerZIP({}, ["darwin", "linux", "win32"]),
    // The Linux packages install the executable as `ImageViewer` and a menu
    // entry under Graphics. `bin` must name the packaged executable, or the
    // menu entry points at a file that does not exist.
    new MakerRpm({
      options: {
        bin: "ImageViewer",
        categories: ["Graphics"],
        genericName: "Image viewer",
        icon: `${appIconBase}.png`,
        homepage:
          "https://github.com/Sawtaytoes/image-viewer",
        name: "image-viewer",
        productName: "Image Viewer",
      },
    }),
    new MakerDeb({
      options: {
        bin: "ImageViewer",
        categories: ["Graphics"],
        genericName: "Image viewer",
        icon: `${appIconBase}.png`,
        homepage:
          "https://github.com/Sawtaytoes/image-viewer",
        maintainer: "Image Viewer contributors",
        name: "image-viewer",
        productName: "Image Viewer",
      },
    }),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main.js",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/preload.js",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
    // Electron Fuses harden the packaged app (disable RunAsNode, validate
    // the ASAR, only load the app from ASAR, etc.).
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
      // Flipping a fuse edits the Electron binary, which breaks the ad-hoc
      // signature Apple silicon requires before it runs anything. Re-sign the
      // macOS build ad hoc after the flip, or it will not open at all.
      resetAdHocDarwinSignature:
        process.platform === "darwin",
    }),
  ],
}

export default config
