const config = require('config')

const plugins = require('./webpack.plugins')
const rules = require('./webpack.rules')

const isLocalDevelopment = (
	config
	.get('isLocalDevelopment')
)

module
.exports = {
	devServer: {
		hot: true,
	},
	devtool: (
		isLocalDevelopment
		&& 'eval-source-map'
	),
	module: {
		rules,
	},
	plugins,
	resolve: {
		extensions: ['.js'],
	},
	stats: {
		colors: true,
		// preset: 'errors-warnings',
	},
}
