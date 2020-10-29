import React, { Fragment } from 'react'
import {
	css,
	Global,
} from '@emotion/core'
import { hot } from 'react-hot-loader/root'

// import config from 'config'

// console.log({ config })

const App = () => (
	<Fragment>
		<Global
			styles={css`
				body {
					margin: 0;
				}
			`}
		/>
	</Fragment>
)

export default hot(App)
