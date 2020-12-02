import {
 css,
 Global,
} from '@emotion/core'
import { Fragment } from 'react'

import FileBrowser from './fileBrowser/FileBrowser'
import FileSystemProvider from './fileBrowser/FileSystemProvider'
import ImageLoaderProvider from './imageLoader/ImageLoaderProvider'
import ImageViewer from './imageViewer/ImageViewer'
import ImageViewerProvider from './imageViewer/ImageViewerProvider'
import TitleBar from './convenience/TitleBar'
import useDisableScrollKeyFunctions from './convenience/useDisableScrollKeyFunctions'
import useWindowRefreshKeys from './convenience/useWindowRefreshKeys'

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

			<ImageViewerProvider>
				<FileSystemProvider>
					<ImageLoaderProvider>
						<TitleBar />
						<FileBrowser />
						<ImageViewer />
					</ImageLoaderProvider>
				</FileSystemProvider>
			</ImageViewerProvider>
		</Fragment>
	)
}

export default App
