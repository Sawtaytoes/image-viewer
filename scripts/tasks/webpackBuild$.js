const webpack = require('webpack')
const { bindNodeCallback } = require('rxjs')
const {
	catchError,
	filter,
	tap,
} = require('rxjs/operators')

const webpackClientConfig = require('./utils/webpackClientConfig')

const webpackBuild$ = (
	bindNodeCallback(
		webpack
	)(
		webpackClientConfig
	)
	.pipe(
		filter(Boolean),
		tap(stats => {
			console.info(
				stats
				.toString({ colors: true })
			)
		}),
		catchError(error => {
			console.error(
				'Webpack build failed:',
				error,
			)

			process.exit()
		}),
	)
)

module.exports = webpackBuild$
