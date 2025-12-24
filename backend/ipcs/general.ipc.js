const path = require('path')
const fs = require('fs')
const { shell } = require('electron')

module.exports = function registerGeneralIPC(ipcMain) {
	ipcMain.handle('load-view', (event, viewName) => {
		const viewPath = path.join(__dirname, '../../views', viewName)
		return fs.readFileSync(viewPath, 'utf8')
	})

	ipcMain.handle('abrirArchivo', async (event, ruta) => {
		try {
			await shell.openPath(ruta)
			return { ok: true }
		} catch (error) {
			return { ok: false, error: error.message }
		}
	})
}
