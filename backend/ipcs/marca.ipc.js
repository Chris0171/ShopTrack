const marcaController = require('../controllers/marca-controller')

module.exports = function registerMarcaIPC(ipcMain) {
	ipcMain.handle('marca:getAll', async () => {
		return new Promise((resolve) => {
			marcaController.getAll((err, rows) => {
				if (err) resolve({ ok: false, error: err.message })
				else resolve({ ok: true, marcas: rows })
			})
		})
	})
}
