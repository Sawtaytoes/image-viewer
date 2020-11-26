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
import useF5RefreshEffect from './convenience/useF5RefreshEffect'
import useWindowRefreshKeys from './convenience/useWindowRefreshKeys'

const App = () => {
	useF5RefreshEffect()
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
						background-color: white;
						margin: 0;
					}
				`}
			/>

			<ImageViewerProvider>
				<FileSystemProvider>
					<ImageLoaderProvider>
						<FileBrowser />
						<ImageViewer />
					</ImageLoaderProvider>
				</FileSystemProvider>
			</ImageViewerProvider>
		</Fragment>
	)
}

export default App
