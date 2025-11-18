const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindows() {
	const mainWindows = new BrowserWindow({
		width: 1020,
		height: 680,
		minWidth: 400,
		minHeight: 400,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'), // opcional
			// nodeIntegration: true, // si quieres usar Node.js en tu ventana
			// contextIsolation: false,
		},
	})
	mainWindows.loadFile('index.html')
}

app.whenReady().then(() => {
	createWindows()
})
