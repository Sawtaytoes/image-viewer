const os = require('os')
const {
	app,
	BrowserWindow,
} = require('electron')
const { exec } = require('child_process')

global.processArgs = process.argv

if (os.platform() === 'win32') {
	exec(
		'wmic logicaldisk get caption',
		(
			error,
			stdout,
			stderr,
		) => {
			if (
				error
				|| stderr
			) {
				console
				.error(
					'Failed to get drive info',
					error,
					stderr,
				)
			}

			const windowsDrives = (
				stdout
				.split('\n')
				.slice(1)
				.map(driveLetter => (
					driveLetter
					.trim()
				))
				.filter(Boolean)
				.map(driveLetter => (
					`${driveLetter}\\`
				))
			)

			global.windowsDrives = windowsDrives
		}
	)
}

const createWindow = () => {
	const browserWindow = (
		new BrowserWindow({
			// frame: false,
			titleBarStyle: 'hiddenInset',
			webPreferences: {
				enableRemoteModule: true,
				nodeIntegration: true,
			},
		})
	)

	browserWindow
	.loadFile('index.html')

	browserWindow
	.webContents
	.openDevTools()
}

app
.whenReady()
.then(createWindow)

app
.on(
	'window-all-closed',
	() => {
		if (process.platform !== 'darwin') {
			app
			.quit()
		}
	},
)

app
.on(
	'activate',
	() => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow()
		}
	},
)
