const ventaController = require('../controllers/venta-controller')

module.exports = function registerVentaIPC(ipc) {
	ipcMain.handle('venta:create', async (event, data) => {
		return new Promise((resolve) => {
			ventaController.create(data, (err, result) => {
				if (err) resolve({ ok: false, error: err.message })
				else resolve({ ok: true, id: result.id })
			})
		})
	})
	ipcMain.handle('venta:getAll', async () => {
		return new Promise((resolve) => {
			ventaController.getAll((err, rows) => {
				if (err) resolve({ ok: false, error: err.message })
				else resolve({ ok: true, ventas: rows })
			})
		})
	})
	ipcMain.handle('venta:update', async (event, { id, data }) => {
		return new Promise((resolve) => {
			ventaController.update(id, data, (err, result) => {
				if (err) resolve({ ok: false, error: err.message })
				else resolve({ ok: true, changes: result.changes })
			})
		})
	})
	ipcMain.handle('venta:delete', async (event, id) => {
		return new Promise((resolve) => {
			ventaController.delete(id, (err, result) => {
				if (err) resolve({ ok: false, error: err.message })
				else resolve({ ok: true, changes: result.changes })
			})
		})
	})
	ipcMain.handle('venta:getById', async (event, id) => {
		return new Promise((resolve) => {
			ventaController.getById(id, (err, row) => {
				if (err) resolve({ ok: false, error: err.message })
				else resolve({ ok: true, venta: row })
			})
		})
	})
	ipcMain.handle('venta:getByClienteId', async (event, idCliente) => {
		return new Promise((resolve) => {
			ventaController.getByClienteId(idCliente, (err, rows) => {
				if (err) resolve({ ok: false, error: err.message })
				else resolve({ ok: true, ventas: rows })
			})
		})
	})
}
