import { Fragment } from 'react'

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

		<ImageGallery />
	</Fragment>
)

export default hot(App)
