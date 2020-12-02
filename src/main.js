const { exec } = require('child_process')
// const config = require('config')
const {
	app,
	BrowserWindow,
	ipcMain,
	protocol,
	screen,
	shell,
} = require('electron')
const os = require('os')

const singleInstanceLock = (
	app
	.requestSingleInstanceLock()
)

if (singleInstanceLock) {
	app
	.on(
		'second-instance',
		(
			event,
			commandLine,
			workingDirectory,
		) => {
			const lastCommandLineItem = (
				(
					commandLine
					.length
				)
				- 1
			)

			createWindow({
				filePath: (
					(
						commandLine
						[lastCommandLineItem]
					)
					|| workingDirectory
				),
			})
		}
	)
}
else {
	// Early-fail when creating a second instance.
	app
	.quit()
}

global.processArgs = process.argv

const isLocalDevelopment = (
	(
		process
		.env
		.NODE_ENV
	)
	=== 'development'
)

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

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
	app
	.quit()
}

const createWindow = ({
	filePath,
} = {}) => {
	const mainDisplay = (
		screen
		.getPrimaryDisplay()
	)

	const mainWindowRef = {
		current: (
			new BrowserWindow({
				autoHideMenuBar: true,
				backgroundThrottling: true,
				// frame: false,
				height: Math.floor(mainDisplay.workAreaSize.height * mainDisplay.scaleFactor),
				show: false,
				// titleBarStyle: 'hiddenInset',
				useContentSize: true,
				webPreferences: {
					additionalArguments: (
						filePath
						&& [`--filePath=${filePath}`]
					),
					enableRemoteModule: true,
					nodeIntegration: true,
					// offscreen: true,
					plugins: isLocalDevelopment,
					// eslint-disable-next-line no-undef
					preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
				},
				width: Math.floor((mainDisplay.workAreaSize.width) / 2),
				x: Math.floor(
					(mainDisplay.workAreaSize.width) / 2
				) - 8,
				y: 0,
			})
		),
	}

	mainWindowRef
	.current
	.loadURL(
		// eslint-disable-next-line no-undef
		MAIN_WINDOW_WEBPACK_ENTRY
	)

	mainWindowRef
	.current
	.once(
		'closed',
		() => {
			mainWindowRef
			.current = null
		},
	)

	console.time('started')

	mainWindowRef
	.current
	.once(
		'ready-to-show',
		() => {
			console.timeEnd('started')
			mainWindowRef
			.current
			.show()
		},
	)

	// Open the DevTools.
	if (isLocalDevelopment) {
		mainWindowRef
		.current
		.webContents
		.openDevTools()
	}
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app
.whenReady()
.then(() => {
	const protocolName = 'safe-file-protocol'

	protocol
	.registerFileProtocol(
		protocolName,
		(
			request,
			callback,
		) => {
			const url = (
				request
				.url
				.replace(
					`${protocolName}://`,
					'',
				)
			)

			try {
				return (
					callback(
						decodeURIComponent(
							url
						)
					)
				)
			}
			catch (error) {
				// Handle the error as needed
				console.error(error)
			}
		}
	)
})
.then(() => {
	ipcMain
	.on(
		'createNewWindow',
		(
			event,
			data,
		) => {
			createWindow(
				data
			)
		},
	)
})
.then(() => {
	ipcMain
	.handle(
		'deleteFilePath',
		(
			event,
			{ filePath },
		) => (
			shell
			.moveItemToTrash(
				filePath
			)
		),
	)
})
.then(createWindow)

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app
.on(
	'window-all-closed',
	() => {
		if (process.platform !== 'darwin') {
			app
			.quit()
		}
	}
)

app
.on(
	'activate',
	() => {
		// On OS X it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow()
		}
	}
)

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
