const facturaController = require('../controllers/factura-controller')
const PDFService = require('../services/pdf-service')
const detalleVentaController = require('../controllers/detalleVenta-controller')

module.exports = function registerFacturaIPC(ipcMain) {
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
	ipcMain.handle(
		'factura:generarPDF',
		async (event, { factura, cliente, detalles }) => {
			try {
				const datosFactura = {
					numeroFactura: factura.numeroFactura,
					fechaEmision: factura.fechaEmision,
					cliente: cliente,
					detalles: detalles,
					subtotal: factura.subtotal,
					impuestos: factura.impuestos,
					descuento: factura.descuento || 0,
					total: factura.total,
					metodoPago: factura.metodoPago,
					observaciones: factura.observaciones,
				}

				const resultado = await PDFService.generarFacturaPDF(datosFactura)
				return { ok: true, ...resultado }
			} catch (error) {
				return { ok: false, error: error.message }
			}
		}
	)
}
