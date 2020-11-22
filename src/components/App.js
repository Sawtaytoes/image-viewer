import { Fragment } from 'react'
import { hot } from 'react-hot-loader/root'

import FileBrowser from './fileBrowser/FileBrowser'
import FileSystemProvider from './fileBrowser/FileSystemProvider'
import ImageLoaderProvider from './imageLoader/ImageLoaderProvider'
import ImageViewer from './imageViewer/ImageViewer'
import ImageViewerProvider from './imageViewer/ImageViewerProvider'
import useF5RefreshEffect from './convenience/useF5RefreshEffect'

const {
 css,
 Global,
} = global.require('@emotion/core')

const App = () => {
	useF5RefreshEffect()

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

export default hot(App)
