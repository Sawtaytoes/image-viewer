// 'react-hot-loader' has to import prior to React.
import 'react-hot-loader'

import { render } from 'react-dom'

import ReactRoot from './components/ReactRoot'

const rootElement = (
	document
	.getElementById(
		'reactRoot'
	)
)

render(
	<ReactRoot />,
	rootElement,
)
