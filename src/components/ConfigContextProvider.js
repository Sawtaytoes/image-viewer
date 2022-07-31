import PropTypes from 'prop-types'

import ConfigContext from './ConfigContext'

const propTypes = {
	children: PropTypes
	.node
	.isRequired,
}

const ConfigContextProvider = ({
	children,
}) => (
	<ConfigContext.Provider value={window.config}>
		{children}
	</ConfigContext.Provider>
)

ConfigContextProvider.propTypes = propTypes

export default ConfigContextProvider
