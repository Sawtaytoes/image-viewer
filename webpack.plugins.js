const config = require('config')
const ESLintPlugin = require('eslint-webpack-plugin')
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin')

const isLocalDevelopment = (
	config
	.get('isLocalDevelopment')
)

const webpackPlugins = (
	[
		new ESLintPlugin({
			fix: true,
		}),
		(
			isLocalDevelopment
			&& new ReactRefreshWebpackPlugin()
		),
	]
	.filter(Boolean)
)

module.exports = webpackPlugins
