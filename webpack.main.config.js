const config = require('config')

const rules = require('./webpack.rules')

const isLocalDevelopment = (
	config
	.get('isLocalDevelopment')
)

module.exports = {
	devtool: (
		isLocalDevelopment
		&& 'eval-source-map'
	),
	entry: './src/main.js',
	module: {
		rules,
	},
	stats: {
		colors: true,
		// preset: 'errors-warnings',
	},
}
