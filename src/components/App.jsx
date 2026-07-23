import { css, Global } from "@emotion/react"
import { Fragment } from "react"
import FullScreenProvider from "./convenience/FullScreenProvider"
import TitleBar from "./convenience/TitleBar"
import useDisableScrollKeyFunctions from "./convenience/useDisableScrollKeyFunctions"
import useWindowRefreshKeys from "./convenience/useWindowRefreshKeys"
import FileBrowser from "./fileBrowser/FileBrowser"
import FileSystemProvider from "./fileBrowser/FileSystemProvider"
import ImageLoaderProvider from "./imageLoader/ImageLoaderProvider"
import ImageViewer from "./imageViewer/ImageViewer"
import ImageViewerProvider from "./imageViewer/ImageViewerProvider"
import SettingsProvider from "./settings/SettingsProvider"
import WorkspaceProvider from "./workspace/WorkspaceProvider"

const App = () => {
  useDisableScrollKeyFunctions()
  useWindowRefreshKeys()

  return (
    <Fragment>
      <Global
        styles={css`
					*,
					*::before,
					*::after {
						box-sizing: border-box;
					}

					body {
						-moz-osx-font-smoothing: grayscale;
						-webkit-font-smoothing: antialiased;
						background-color: white;
						margin: 0;
					}

					/* Dark scrollbars to match the theme (Electron is Chromium, so
					   -webkit- applies app-wide: gallery, popovers, etc.). */
					::-webkit-scrollbar {
						height: 12px;
						width: 12px;
					}

					::-webkit-scrollbar-track {
						background-color: #2b2b2b;
					}

					::-webkit-scrollbar-thumb {
						background-color: #555;
						border: 2px solid #2b2b2b;
						border-radius: 6px;
					}

					::-webkit-scrollbar-thumb:hover {
						background-color: #666;
					}

					::-webkit-scrollbar-corner {
						background-color: #2b2b2b;
					}
				`}
      />

      <SettingsProvider>
        <WorkspaceProvider>
          <ImageViewerProvider>
            <FileSystemProvider>
              <ImageLoaderProvider>
                <FullScreenProvider>
                  <TitleBar />
                  <FileBrowser />
                  <ImageViewer />
                </FullScreenProvider>
              </ImageLoaderProvider>
            </FileSystemProvider>
          </ImageViewerProvider>
        </WorkspaceProvider>
      </SettingsProvider>
    </Fragment>
  )
}

export default App
