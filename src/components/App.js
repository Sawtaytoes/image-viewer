import { Fragment } from 'react'

import FileSystemProvider from './FileSystemProvider'
import FolderControls from './FolderControls'
import ImageGallery from './ImageGallery'

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

		<FileSystemProvider>
			<FolderControls />
			<ImageGallery />
		</FileSystemProvider>
	</Fragment>
)

export default hot(App)
