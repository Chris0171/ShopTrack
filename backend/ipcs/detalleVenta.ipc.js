const detalleController = require('../controllers/detalleVenta-controller')

module.exports = function registerDetalleVentaIPC(ipcMain) {
	ipcMain.handle('detalle:create', async (event, data) => {
		return new Promise((resolve) => {
			detalleController.create(data, (err, result) => {
				if (err) resolve({ ok: false, error: err.message })
				else resolve({ ok: true, id: result.id })
			})
		})
	})
	ipcMain.handle('detalle:getAll', async () => {
		return new Promise((resolve) => {
			detalleController.getAll((err, rows) => {
				if (err) resolve({ ok: false, error: err.message })
				else resolve({ ok: true, detalles: rows })
			})
		})
	})
	ipcMain.handle('detalle:update', async (event, { id, data }) => {
		return new Promise((resolve) => {
			detalleController.update(id, data, (err, result) => {
				if (err) resolve({ ok: false, error: err.message })
				else resolve({ ok: true, changes: result.changes })
			})
		})
	})
	ipcMain.handle('detalle:delete', async (event, id) => {
		return new Promise((resolve) => {
			detalleController.delete(id, (err, result) => {
				if (err) resolve({ ok: false, error: err.message })
				else resolve({ ok: true, changes: result.changes })
			})
		})
	})
	ipcMain.handle('detalle:getById', async (event, id) => {
		return new Promise((resolve) => {
			detalleController.getById(id, (err, row) => {
				if (err) resolve({ ok: false, error: err.message })
				else resolve({ ok: true, detalle: row })
			})
		})
	})
	ipcMain.handle('detalle:getByVentaId', async (event, idVenta) => {
		return new Promise((resolve) => {
			detalleController.getByVentaId(idVenta, (err, rows) => {
				if (err) resolve({ ok: false, error: err.message })
				else resolve({ ok: true, detalles: rows })
			})
		})
	})
	ipcMain.handle('detalle:getPaginated', async (event, { limit, offset }) => {
		return new Promise((resolve) => {
			detalleController.getPaginated(limit, offset, (err, rows) => {
				if (err) resolve({ ok: false, error: err.message })
				else resolve({ ok: true, ventas: rows })
			})
		})
	})
}
