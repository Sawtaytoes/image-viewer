import { render } from 'react-dom'

import App from '../components/App'
import ClientRoot from '../components/ClientRoot'

const reactRoot = (
	<ClientRoot>
		<App />
	</ClientRoot>
)

const rootElement = (
	document
	.getElementById(
		'reactRoot'
	)
)

render(
	reactRoot,
	rootElement,
)
