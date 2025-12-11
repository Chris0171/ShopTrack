const productoController = require('../controllers/producto-controller.js')

module.exports = function registerProductoIPC(ipcMain) {
	ipcMain.handle('producto:getAll', async () => {
		return new Promise((resolve, reject) => {
			productoController.getAll((err, rows) => {
				if (err) return reject(err.message)
				resolve(rows)
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

	ipcMain.handle('producto:delete', async (event, id) => {
		return new Promise((resolve, reject) => {
			productoController.delete(id, (err) => {
				if (err) return reject(err.message)
				resolve({ ok: true })
			})
		})
	})

	ipcMain.handle('producto:buscar-producto', async (event, nroParte) => {
		return new Promise((resolve, reject) => {
			productoController.buscarPorNroParte(nroParte, (err, row) => {
				if (err) return reject(err.message)
				resolve(row)
			})
		})
	})
	ipcMain.handle(
		'producto:actualizar-stock',
		async (event, idProducto, nuevaCantidad) => {
			return new Promise((resolve) => {
				productoController.actualizarStock(
					idProducto,
					nuevaCantidad,
					(err, result) => {
						if (err) {
							resolve({ ok: false, error: err.message })
						} else {
							resolve({ ok: true })
						}
					}
				)
			})
		}
	)
	ipcMain.handle('producto:getPaginated', async (event, filtros) => {
		return new Promise((resolve, reject) => {
			productoController.getPaginated(filtros, (err, result) => {
				if (err) return reject(err.message)
				resolve(result)
			})
		})
	})
}
