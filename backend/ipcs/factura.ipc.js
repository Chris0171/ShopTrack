const facturaController = require('../controllers/factura-controller')
const PDFService = require('../services/pdf-service')
const detalleVentaController = require('../controllers/detalleVenta-controller')
const ventaController = require('../controllers/venta-controller')
const clienteController = require('../controllers/cliente-controller')
const { shell } = require('electron')
const fs = require('fs')
const path = require('path')

module.exports = function registerFacturaIPC(ipcMain) {
	ipcMain.handle('factura:generateNumero', async () => {
		return new Promise((resolve) => {
			facturaController.generateNumeroFactura((err, numero) => {
				if (err) resolve({ ok: false, error: err.message })
				else resolve({ ok: true, numeroFactura: numero })
			})
		})
	})

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

	// Nuevo handler: generar PDF desde historial (verifica si existe, genera si no, y abre)
	ipcMain.handle('factura:generatePDF', async (event, idVenta) => {
		try {
			// 1. Obtener factura por idVenta
			const facturaResult = await new Promise((resolve) => {
				facturaController.getByVentaId(idVenta, (err, rows) => {
					if (err) resolve({ ok: false, error: err.message })
					else resolve({ ok: true, facturas: rows })
				})
			})

			if (!facturaResult.ok || !facturaResult.facturas.length) {
				return { ok: false, error: 'Factura no encontrada' }
			}

			const factura = facturaResult.facturas[0]

			// 2. Verificar si ya existe rutaPDF y el archivo existe
			if (factura.rutaPDF && fs.existsSync(factura.rutaPDF)) {
				// Abrir PDF existente
				await shell.openPath(factura.rutaPDF)
				return { ok: true, ruta: factura.rutaPDF, nuevo: false }
			}

			// 3. Si no existe, generar el PDF
			// Obtener datos necesarios
			const ventaResult = await new Promise((resolve) => {
				ventaController.getById(idVenta, (err, row) => {
					if (err) resolve({ ok: false, error: err.message })
					else resolve({ ok: true, venta: row })
				})
			})

			if (!ventaResult.ok) {
				return { ok: false, error: 'Venta no encontrada' }
			}

			const venta = ventaResult.venta

			const clienteResult = await new Promise((resolve) => {
				clienteController.getById(venta.idCliente, (err, row) => {
					if (err) resolve({ ok: false, error: err.message })
					else resolve({ ok: true, cliente: row })
				})
			})

			if (!clienteResult.ok) {
				return { ok: false, error: 'Cliente no encontrado' }
			}

			const cliente = clienteResult.cliente

			const detallesResult = await new Promise((resolve) => {
				detalleVentaController.getByVentaId(idVenta, (err, rows) => {
					if (err) resolve({ ok: false, error: err.message })
					else resolve({ ok: true, detalles: rows })
				})
			})

			if (!detallesResult.ok) {
				return { ok: false, error: 'Detalles de venta no encontrados' }
			}

			const detalles = detallesResult.detalles

			// Preparar datos para PDF
			const datosFactura = {
				numeroFactura: factura.numeroFactura,
				fechaEmision: factura.fechaEmision,
				cliente: cliente,
				detalles: detalles,
				subtotal: factura.subtotal,
				impuestos: factura.impuestos,
				descuento: venta.descuento || 0,
				total: factura.total,
				metodoPago: factura.metodoPago,
				observaciones: factura.observaciones,
			}

			// Generar PDF
			const resultado = await PDFService.generarFacturaPDF(datosFactura)

			if (!resultado.success) {
				return { ok: false, error: 'Error al generar PDF' }
			}

			// 4. Guardar ruta en base de datos
			await new Promise((resolve) => {
				facturaController.updateRutaPDF(
					idVenta,
					resultado.ruta,
					(err, result) => {
						if (err) resolve({ ok: false, error: err.message })
						else resolve({ ok: true })
					}
				)
			})

			// 5. Abrir PDF
			await shell.openPath(resultado.ruta)

			return { ok: true, ruta: resultado.ruta, nuevo: true }
		} catch (error) {
			return { ok: false, error: error.message }
		}
	})
}
