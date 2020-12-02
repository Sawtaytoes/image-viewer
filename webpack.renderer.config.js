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
	module: {
		rules,
	},
	resolve: {
		alias: {
			'react-dom': (
				isLocalDevelopment
				? '@hot-loader/react-dom'
				: 'react-dom'
			),
			'rxjs': (
				'rxjs/_esm2015'
			),
		},
		extensions: ['.js'],
	},
	stats: {
		colors: true,
		// preset: 'errors-warnings',
	},
}
