const config = require('config')

const isLocalDevelopment = (
	config
	.get('isLocalDevelopment')
)

module
.exports = {
	plugins: ['@emotion'],
	presets: [
		[
			'@babel/preset-env',
			{
				modules: false,
				useBuiltIns: false,
			},
		],
		[
			'@babel/preset-react',
			{
				development: isLocalDevelopment,
				importSource: '@emotion/react',
				runtime: 'automatic',
			},
		],
	],
}
