import { createRoot } from 'react-dom/client'

import ReactRoot from './components/ReactRoot'

console.log('renderer 1')

const root = (
	createRoot(
		document
		.getElementById(
			'react-root'
		)
	)
)

root
.render(
	<ReactRoot />
)

console.log('renderer 2')
