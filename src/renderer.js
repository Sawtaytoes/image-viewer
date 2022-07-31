import { createRoot } from 'react-dom/client'

import ReactRoot from './components/ReactRoot'

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
