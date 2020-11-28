const electronForgeConfig = {
	makers: [
		{
			config: {
				name: 'image_viewer',
			},
			name: '@electron-forge/maker-squirrel',
		},
		{
			name: '@electron-forge/maker-zip',
			platforms: ['darwin'],
		},
		{
			config: {},
			name: '@electron-forge/maker-deb',
		},
		{
			config: {},
			name: '@electron-forge/maker-rpm',
		},
	],
	packagerConfig: {},
	plugins: [
		[
			'@electron-forge/plugin-webpack',
			{
				mainConfig: './webpack.main.config.js',
				port: 8069,
				renderer: {
					config: './webpack.renderer.config.js',
					entryPoints: [
						{
							html: './src/index.html',
							js: './src/renderer.js',
							name: 'main_window',
						},
					],
				},
			},
		],
	],
}

module.exports = electronForgeConfig
