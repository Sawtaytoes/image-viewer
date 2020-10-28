const { app, BrowserWindow } = require('electron')

global.processArgs = process.argv

const createWindow = () => {
	const browserWindow = (
		new BrowserWindow({
			// frame: false,
			titleBarStyle: 'hiddenInset',
			webPreferences: {
				enableRemoteModule: true,
				nodeIntegration: true
			}
		})
	)

	browserWindow.loadFile('index.html')
	browserWindow.webContents.openDevTools()
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

app.on('activate', () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow()
	}
})
