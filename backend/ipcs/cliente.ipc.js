const clienteController = require('../controllers/cliente-controller.js')

module.exports = function registerClienteIPC(ipcMain) {
	ipcMain.handle('crear-cliente', async (event, cliente) => {
		return new Promise((resolve) => {
			clienteController.create(cliente, (err, result) => {
				if (err) {
					resolve({ ok: false, error: err.message })
				} else {
					resolve({ ok: true, id: result.id })
				}
			})
		})
	})
	ipcMain.handle('cliente:getAll', async () => {
		return new Promise((resolve) => {
			clienteController.getAll((err, rows) => {
				if (err) resolve({ ok: false, error: err.message })
				else resolve({ ok: true, clientes: rows })
			})
		})
	})
	ipcMain.handle('cliente:update', async (event, { id, data }) => {
		return new Promise((resolve) => {
			clienteController.update(id, data, (err, result) => {
				if (err) resolve({ ok: false, error: err.message })
				else resolve({ ok: true, changes: result.changes })
			})
		})
	})
	ipcMain.handle('cliente:delete', async (event, id) => {
		return new Promise((resolve) => {
			clienteController.delete(id, (err, result) => {
				if (err) resolve({ ok: false, error: err.message })
				else resolve({ ok: true, changes: result.changes })
			})
		})
	})
	ipcMain.handle('cliente:buscar-nombre', async (event, nombre) => {
		return new Promise((resolve) => {
			clienteController.buscarPorNombre(nombre, (err, row) => {
				if (err) resolve({ ok: false, error: err.message })
				else resolve({ ok: true, cliente: row })
			})
		})
	})
	ipcMain.handle('cliente:getById', async (event, id) => {
		return new Promise((resolve) => {
			clienteController.getById(id, (err, row) => {
				if (err) resolve({ ok: false, error: err.message })
				else resolve({ ok: true, cliente: row })
			})
		})
	})
}
