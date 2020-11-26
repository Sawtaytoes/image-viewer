const rules = require('./webpack.rules')

rules
.push({
	enforce: 'pre',
	exclude: /node_modules/,
	test: /\.(js|jsx)$/,
	use: {
		loader: 'eslint-loader',
		options: {
			fix: true,
		},
	},
})

module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/main.js',
  // Put your normal webpack config below here
  module: {
    rules,
  },
}
