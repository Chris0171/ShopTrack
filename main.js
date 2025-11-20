const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')

const productoController = require('./backend/controllers/producto-controller')
const db = require('./backend/db/initDatabase') // inicializa DB

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

// Menu.setApplicationMenu(null)

app.whenReady().then(() => {
	createWindows()

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindows()
	})
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit()
})

// *************************** ipcMain *************************** //
ipcMain.handle('load-view', (event, viewName) => {
	const viewPath = path.join(__dirname, 'views', viewName)
	return fs.readFileSync(viewPath, 'utf8')
})

ipcMain.handle('producto:getAll', async () => {
	return new Promise((resolve, reject) => {
		productoController.getAll((err, rows) => {
			if (err) reject(err.message)
			else resolve(rows)
		})
	})
})

ipcMain.handle('producto:create', async (event, data) => {
	return new Promise((resolve, reject) => {
		productoController.create(data, (err, result) => {
			if (err) reject(err.message)
			else resolve(result)
		})
	})
})
ipcMain.handle('buscar-producto', async (event, nroParte) => {
	return new Promise((resolve, reject) => {
		db.get(
			'SELECT * FROM Producto WHERE NroParte = ?',
			[nroParte],
			(err, row) => {
				if (err) reject(err)
				else resolve(row)
			}
		)
	})
})
