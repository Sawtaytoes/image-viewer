const getAbsolutePath = require('./utils/getAbsolutePath')

module.exports = {
	isLocalDevelopment: false,
	nodeEnvironment: 'production',
	outputPath: getAbsolutePath('./build'),
	serverPort: 8000,
}
