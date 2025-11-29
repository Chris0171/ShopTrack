const { app, BrowserWindow, Menu, ipcMain, screen } = require('electron')
const fs = require('fs')
const path = require('path')

// ** === Controladores === ** //
const productoController = require('./backend/controllers/producto-controller')
const clienteController = require('./backend/controllers/cliente-controller')
const ventaController = require('./backend/controllers/venta-controller')
const detalleController = require('./backend/controllers/detalleVenta-controller')
const facturaController = require('./backend/controllers/factura-controller')

const db = require('./backend/db/initDatabase') // * Inicializa DB

function createWindow(width, height) {
	const mainWindow = new BrowserWindow({
		minWidth: width,
		minHeight: height,
		maxWidth: width,
		maxHeight: height,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			nodeIntegration: false, // si quieres usar Node.js en tu ventana
			contextIsolation: true,
		},
	})
	mainWindow.maximize()
	mainWindow.setBounds({ x: 0, y: 0, width, height })
	mainWindow.loadFile('index.html')
}

// Menu.setApplicationMenu(null)

app.whenReady().then(() => {
	// ** Obtener parámetros de la pantalla
	const primaryDisplay = screen.getPrimaryDisplay()
	const { width, height } = primaryDisplay.workAreaSize
	createWindow(width, height)

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow()
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

// ** === Venta === ** //
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

// ** === DetalleVenta === ** //
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

// ** === Factura === ** //
ipcMain.handle('factura:create', async (event, data) => {
	return new Promise((resolve) => {
		facturaController.create(data, (err, result) => {
			if (err) resolve({ ok: false, error: err.message })
			else resolve({ ok: true, id: result.id })
		})
	})
})
ipcMain.handle('factura:getAll', async () => {
	return new Promise((resolve) => {
		facturaController.getAll((err, rows) => {
			if (err) resolve({ ok: false, error: err.message })
			else resolve({ ok: true, facturas: rows })
		})
	})
})
ipcMain.handle('factura:update', async (event, { id, data }) => {
	return new Promise((resolve) => {
		facturaController.update(id, data, (err, result) => {
			if (err) resolve({ ok: false, error: err.message })
			else resolve({ ok: true, changes: result.changes })
		})
	})
})
ipcMain.handle('factura:delete', async (event, id) => {
	return new Promise((resolve) => {
		facturaController.delete(id, (err, result) => {
			if (err) resolve({ ok: false, error: err.message })
			else resolve({ ok: true, changes: result.changes })
		})
	})
})
ipcMain.handle('factura:getById', async (event, id) => {
	return new Promise((resolve) => {
		facturaController.getById(id, (err, row) => {
			if (err) resolve({ ok: false, error: err.message })
			else resolve({ ok: true, factura: row })
		})
	})
})
ipcMain.handle('factura:getByVentaId', async (event, idVenta) => {
	return new Promise((resolve) => {
		facturaController.getByVentaId(idVenta, (err, rows) => {
			if (err) resolve({ ok: false, error: err.message })
			else resolve({ ok: true, facturas: rows })
		})
	})
})
