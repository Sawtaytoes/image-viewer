import { Fragment } from 'react'

import FileSystemProvider from './FileSystemProvider'
import ImageGallery from './ImageGallery'

const {
 css,
 Global,
} = window.require('@emotion/core')
const { hot } = window.require('react-hot-loader/root')

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
			<ImageGallery />
		</FileSystemProvider>
	</Fragment>
)

export default hot(App)
