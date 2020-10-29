import { Fragment } from 'react'

import FileBrowser from './fileBrowser/FileBrowser'
import FileSystemProvider from './fileBrowser/FileSystemProvider'
import ImageViewer from './imageViewer/ImageViewer'
import ImageViewerProvider from './imageViewer/ImageViewerProvider'
import FolderControls from './fileBrowser/FolderControls'

const {
 css,
 Global,
} = global.require('@emotion/core')
const { hot } = global.require('react-hot-loader/root')

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
				<FolderControls />
				<FileBrowser />
				<ImageViewer />
			</FileSystemProvider>
		</ImageViewerProvider>
	</Fragment>
)

export default hot(App)
