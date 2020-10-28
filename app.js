const { app, BrowserWindow } = require('electron')

const createWindow = () => {
	const browserWindow = (
		new BrowserWindow({
			webPreferences: {
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
