import { hot } from 'react-hot-loader'

import App from './App'

const ReactRoot = () => (
	<App />
)

const HotReactRoot = hot(module)(ReactRoot)

export default HotReactRoot
