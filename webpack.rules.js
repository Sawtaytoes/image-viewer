module
.exports = [
	// Add support for native node modules
	{
		test: /\.node$/,
		use: 'node-loader',
	},
	{
		parser: { amd: false },
		test: /\.(m?js|node)$/,
		use: {
			loader: '@marshallofsound/webpack-asset-relocator-loader',
			options: {
				outputAssetBase: 'native_modules',
			},
		},
	},
	// Put your webpack loader rules in this array.
	{
		exclude: /node_modules/,
		test: /\.(js|jsx)$/,
		use: {
			loader: 'babel-loader',
			options: {
				cacheDirectory: true,
			},
		},
	},
]
