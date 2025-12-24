const PDFDocument = require('pdfkit')
const fs = require('fs')
const path = require('path')

class PDFService {
	// Generar PDF de factura
	static generarFacturaPDF(datos) {
		return new Promise((resolve, reject) => {
			try {
				// Crear directorio de facturas si no existe
				const dirFacturas = path.join(__dirname, '../../facturas')
				if (!fs.existsSync(dirFacturas)) {
					fs.mkdirSync(dirFacturas, { recursive: true })
				}

				// Crear nombre de archivo
				const nombreArchivo = `Factura_${datos.numeroFactura}_${Date.now()}.pdf`
				const rutaArchivo = path.join(dirFacturas, nombreArchivo)

				// Crear documento
				const doc = new PDFDocument({
					size: 'A4',
					margin: 40,
				})

				// Pipe a archivo
				const stream = fs.createWriteStream(rutaArchivo)
				doc.pipe(stream)

				// Encabezado - Logo/Nombre empresa
				doc
					.fontSize(20)
					.font('Helvetica-Bold')
					.text('ShopTrack', { align: 'center' })
				doc
					.fontSize(10)
					.font('Helvetica')
					.text('Tu tienda online profesional', { align: 'center' })
					.text('Email: info@shoptrack.com | Tel: +34 123 456 789', {
						align: 'center',
					})

				doc.moveTo(40, 110).lineTo(555, 110).stroke()

				// Número y fecha de factura
				doc
					.fontSize(14)
					.font('Helvetica-Bold')
					.text('FACTURA', { align: 'left' })
				doc.fontSize(10).font('Helvetica')
				doc.text(`Número: ${datos.numeroFactura}`, 40, 140)
				doc.text(`Fecha: ${this.formatearFecha(datos.fechaEmision)}`, 40, 160)

				// Datos del cliente
				doc
					.fontSize(12)
					.font('Helvetica-Bold')
					.text('DATOS DEL CLIENTE', 40, 200)
				doc.fontSize(10).font('Helvetica')
				doc.text(`Nombre: ${datos.cliente.nombre}`, 40, 225)
				doc.text(`Teléfono: ${datos.cliente.telefono || 'N/A'}`, 40, 245)
				doc.text(`Email: ${datos.cliente.email || 'N/A'}`, 40, 265)
				doc.text(`Dirección: ${datos.cliente.direccion || 'N/A'}`, 40, 285)

				// Tabla de productos
				const topTabla = 330
				const alturaFila = 25
				const colAncho = [80, 150, 60, 80, 80]
				const posiciones = [40, 120, 270, 330, 430]

				// Encabezados tabla
				doc
					.fontSize(10)
					.font('Helvetica-Bold')
					.fillColor('white')
					.rect(40, topTabla, 515, 25)
					.fill('#6d3aef')
					.text('Nro Parte', posiciones[0], topTabla + 5)
					.text('Descripción', posiciones[1], topTabla + 5)
					.text('Cantidad', posiciones[2], topTabla + 5)
					.text('Precio Unit.', posiciones[3], topTabla + 5)
					.text('Total', posiciones[4], topTabla + 5)

				// Datos productos
				doc.font('Helvetica').fillColor('black')
				let posY = topTabla + alturaFila

				datos.detalles.forEach((detalle) => {
					const totalLinea = (
						detalle.precioUnitario *
						detalle.cantidad *
						(1 + detalle.tasaAplicada)
					).toFixed(2)

					doc.text(detalle.nroParte, posiciones[0], posY)
					doc.text(detalle.descripcion, posiciones[1], posY)
					doc.text(detalle.cantidad.toString(), posiciones[2], posY)
					doc.text(`$${detalle.precioUnitario.toFixed(2)}`, posiciones[3], posY)
					doc.text(`$${totalLinea}`, posiciones[4], posY)

					posY += alturaFila
				})

				// Línea divisoria
				posY += 10
				doc.moveTo(40, posY).lineTo(555, posY).stroke()

				// Totales
				posY += 20
				doc.fontSize(11).font('Helvetica')
				doc.text(`Subtotal:`, 330, posY)
				doc.text(`$${datos.subtotal.toFixed(2)}`, 430, posY)

				posY += 25
				doc.text(`Impuestos (IVA):`, 330, posY)
				doc.text(`$${datos.impuestos.toFixed(2)}`, 430, posY)

				if (datos.descuento && datos.descuento > 0) {
					posY += 25
					doc.fillColor('red')
					doc.text(`Descuento:`, 330, posY)
					doc.text(`-$${datos.descuento.toFixed(2)}`, 430, posY)
					doc.fillColor('black')
				}

				// Total final
				posY += 30
				doc
					.fontSize(14)
					.font('Helvetica-Bold')
					.fillColor('#6d3aef')
					.text(`TOTAL:`, 330, posY)
					.text(`$${datos.total.toFixed(2)}`, 430, posY)

				// Método de pago y observaciones
				doc.fillColor('black')
				doc
					.fontSize(10)
					.font('Helvetica')
					.text(
						`Método de pago: ${datos.metodoPago.toUpperCase()}`,
						40,
						posY + 50
					)

				if (datos.observaciones) {
					doc.text(`Observaciones: ${datos.observaciones}`, 40, posY + 70, {
						width: 515,
					})
				}

				// Pie de página
				doc
					.fontSize(8)
					.text(
						'Gracias por su compra. Este documento es una factura válida.',
						40,
						750,
						{
							align: 'center',
						}
					)

				// Finalizar PDF
				doc.end()

				stream.on('finish', () => {
					resolve({
						success: true,
						ruta: rutaArchivo,
						nombreArchivo: nombreArchivo,
					})
				})

				stream.on('error', (err) => {
					reject(err)
				})
			} catch (error) {
				reject(error)
			}
		})
	}

	// Formatear fecha
	static formatearFecha(fechaISO) {
		const fecha = new Date(fechaISO)
		return fecha.toLocaleDateString('es-ES', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
		})
	}
}

module.exports = PDFService
