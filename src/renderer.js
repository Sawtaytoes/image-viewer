import { webFrame } from 'electron'
import { render } from 'react-dom'

import ReactRoot from './components/ReactRoot'

webFrame
.setZoomFactor(
	0.75
)

render(
	<ReactRoot />,
	document
	.getElementById(
		'react-root'
	)
)
