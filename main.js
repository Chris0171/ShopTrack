const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')

// ** === Controladores === ** //
const productoController = require('./backend/controllers/producto-controller')
const clienteController = require('./backend/controllers/cliente-controller')
const ventaController = require('./backend/controllers/venta-controller')

const db = require('./backend/db/initDatabase') // * Inicializa DB

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

// ** === Producto === ** //
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

// ** === Cliente === ** //
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

// ** === Venta == ** //
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
