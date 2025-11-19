const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')

function createWindows() {
	const mainWindows = new BrowserWindow({
		width: 1620,
		height: 1500,
		minWidth: 1040,
		minHeight: 860,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			// nodeIntegration: true, // si quieres usar Node.js en tu ventana
			contextIsolation: true,
		},
	})
	mainWindows.loadFile('index.html')
}

Menu.setApplicationMenu(null)

ipcMain.handle('load-view', (event, viewName) => {
	const viewPath = path.join(__dirname, 'views', viewName)
	return fs.readFileSync(viewPath, 'utf8')
})

app.whenReady().then(() => {
	createWindows()

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindows()
	})
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit()
})
