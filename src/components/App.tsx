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

// The Emotion `<Global>` block that used to open this component is gone, and so
// is the `<Fragment>` that existed only to sit beside it. Its three jobs moved:
// `box-sizing` is Tailwind Preflight's, the body rules and the `-webkit-`
// scrollbar chrome are in `src/styles/tailwind.css`, and `background-color:
// white` — which was painting under a dark app and only ever showed during a
// resize — is `bg-surface-base` on `<body>` in `index.html`.
const App = () => {
  useDisableScrollKeyFunctions()
  useWindowRefreshKeys()

  return (
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
  )
}

export default App
