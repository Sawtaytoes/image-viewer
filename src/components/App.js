import { Fragment } from 'react'
import { hot } from 'react-hot-loader/root'

import FileBrowser from './fileBrowser/FileBrowser'
import FileSystemProvider from './fileBrowser/FileSystemProvider'
import ImageViewer from './imageViewer/ImageViewer'
import ImageViewerProvider from './imageViewer/ImageViewerProvider'

const {
 css,
 Global,
} = global.require('@emotion/core')

const App = () => (
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
				<FileBrowser />
				<ImageViewer />
			</FileSystemProvider>
		</ImageViewerProvider>
	</Fragment>
)

export default hot(App)
