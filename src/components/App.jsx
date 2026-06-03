import { css, Global } from "@emotion/react"
import { Fragment } from "react"
import TitleBar from "./convenience/TitleBar"
import useDisableScrollKeyFunctions from "./convenience/useDisableScrollKeyFunctions"
import useWindowRefreshKeys from "./convenience/useWindowRefreshKeys"
import FileBrowser from "./fileBrowser/FileBrowser"
import FileSystemProvider from "./fileBrowser/FileSystemProvider"
import ImageLoaderProvider from "./imageLoader/ImageLoaderProvider"
import ImageViewer from "./imageViewer/ImageViewer"
import ImageViewerProvider from "./imageViewer/ImageViewerProvider"
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
				`}
      />

      <WorkspaceProvider>
        <ImageViewerProvider>
          <FileSystemProvider>
            <ImageLoaderProvider>
              <TitleBar />
              <FileBrowser />
              <ImageViewer />
            </ImageLoaderProvider>
          </FileSystemProvider>
        </ImageViewerProvider>
      </WorkspaceProvider>
    </Fragment>
  )
}

export default App
