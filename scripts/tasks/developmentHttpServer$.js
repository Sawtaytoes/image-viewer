const config = require('config')
const webpack = require('webpack')
const WebpackDevServer = require('webpack-dev-server')
const {
	catchError, map, tap,
} = require('rxjs/operators')
const { of } = require('rxjs')

const createEntrypointRenderer = require('./utils/createEntrypointRenderer')
const webpackClientConfig = require('./utils/webpackClientConfig')

const developmentHttpServer$ = (
	of({
		devServerConfig: (
			webpackClientConfig
			.devServer
		),
		webpackCompiler: (
			webpack(
				webpackClientConfig,
			)
		),
	})
	.pipe(
		tap(() => {
			createEntrypointRenderer
			.listenForEntrypoints()
		}),
		map(({
			devServerConfig,
			webpackCompiler,
		}) => (
			new WebpackDevServer(
				webpackCompiler,
				devServerConfig,
			)
		)),
		tap(httpServer => {
			httpServer
			.listen(
				(
					config
					.get('serverPort')
				),
				error => {
					error
						? console.error(error)
						: console.info('Listening for web requests...')
				}
			)
		}),
		catchError(error => {
			console.error(
				'Express server failed:',
				error,
			)

			process.exit()
		}),
	)
)

module.exports = developmentHttpServer$
