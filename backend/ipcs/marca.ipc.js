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

	ipcMain.handle('marca:getAllWithInactive', async () => {
		return new Promise((resolve) => {
			marcaController.getAllWithInactive((err, rows) => {
				if (err) resolve({ ok: false, error: err.message })
				else resolve({ ok: true, marcas: rows })
			})
		})
	})

	ipcMain.handle('marca:create', async (event, data) => {
		return new Promise((resolve) => {
			marcaController.create(data, (err, result) => {
				if (err) resolve({ ok: false, error: err.message })
				else resolve({ ok: true, id: result.id })
			})
		})
	})

	ipcMain.handle('marca:update', async (event, { id, data }) => {
		return new Promise((resolve) => {
			marcaController.update(id, data, (err, result) => {
				if (err) resolve({ ok: false, error: err.message })
				else resolve({ ok: true, changes: result.changes })
			})
		})
	})

	ipcMain.handle('marca:delete', async (event, id) => {
		return new Promise((resolve) => {
			marcaController.countProducts(id, (err, count) => {
				if (err) return resolve({ ok: false, error: err.message })
				if (count > 0) {
					return resolve({
						ok: false,
						error: 'Marca en uso',
						code: 'BRAND_IN_USE',
						count,
					})
				}

				marcaController.delete(id, (err2, result) => {
					if (err2) resolve({ ok: false, error: err2.message })
					else resolve({ ok: true, changes: result.changes })
				})
			})
		})
	})

	ipcMain.handle('marca:setActive', async (event, { id, activo }) => {
		return new Promise((resolve) => {
			marcaController.setActive(id, activo, (err, result) => {
				if (err) resolve({ ok: false, error: err.message })
				else resolve({ ok: true, changes: result.changes })
			})
		})
	})
}
