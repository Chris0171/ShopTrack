const PDFDocument = require('pdfkit-table')
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

				// Paleta de colores Tailwind
				const COLORS = {
					indigo700: '#4338CA',
					indigo800: '#3730A3',
					cyan600: '#0891B2',
					white: '#FFFFFF',
					black: '#000000',
				}

				// Encabezado - Logo/Nombre empresa
				doc
					.fontSize(20)
					.font('Helvetica-Bold')
					.fillColor(COLORS.indigo700)
					.text('Core transport lLC', { align: 'center' })
				doc.fontSize(10).font('Helvetica').fillColor(COLORS.black)

				// Layout cabecera correcto: FACTURA, luego fecha y número
				let posY = 110

				// Estilo de línea divisoria
				doc.lineWidth(1.2).strokeColor(COLORS.indigo700).stroke()

				// Título FACTURA en indigo-700
				doc
					.fontSize(14)
					.font('Helvetica-Bold')
					.fillColor(COLORS.indigo700)
					.text('FACTURA', 40, posY)
				doc.fontSize(10).font('Helvetica')

				posY += 15

				// Línea divisoria 1
				doc.moveTo(40, posY).lineTo(555, posY).stroke()

				posY += 10

				doc
					.fillColor(COLORS.black)
					.text(
						`Fecha de factura: ${this.formatearFecha(datos.fechaEmision)}`,
						40,
						posY
					)
				doc.text(`Número de factura: ${datos.numeroFactura}`, 40, posY + 18)

				// Nombre del cliente con menos margen antes de la siguiente línea
				posY += 70
				doc
					.fontSize(12)
					.font('Helvetica-Bold')
					.fillColor(COLORS.indigo700)
					.text(`${datos.cliente.nombre}`, 40, posY)

				// Línea divisoria 2 más cercana
				posY += 15
				doc.fontSize(10).font('Helvetica').fillColor(COLORS.black)
				doc.moveTo(40, posY).lineTo(555, posY).stroke()

				// Datos del cliente debajo de la línea 2
				posY += 10
				doc.text(`Dirección: ${datos.cliente.direccion || 'N/A'}`, 40, posY)
				doc.text(`Teléfono: ${datos.cliente.telefono || 'N/A'}`, 40, posY + 18)
				doc.text(`Email: ${datos.cliente.email || 'N/A'}`, 40, posY + 36)

				// Tabla manual estilizada con gradiente y bordes redondeados
				posY += 95
				const headers = [
					'Nro Parte',
					'Descripción',
					'Cantidad',
					'Tasas',
					'Total',
				]
				const columnWidths = [120, 210, 60, 60, 65]
				const tableX = 40
				const tableY = posY
				const tableWidth = 515
				const headerHeight = 30
				const rowHeight = 25
				const rows = datos.detalles.map((d) => {
					const totalLinea = (
						d.precioUnitario *
						d.cantidad *
						(1 + d.tasaAplicada)
					).toFixed(2)
					const tasaPorcentaje = (d.tasaAplicada * 100).toFixed(0)
					return {
						nroParte: d.nroParte,
						descripcion: d.descripcion,
						cantidad: d.cantidad.toString(),
						tasa: `${tasaPorcentaje}%`,
						total: `$${totalLinea}`,
					}
				})
				const tableHeight = headerHeight + rows.length * rowHeight
				const colX = [
					tableX,
					tableX + columnWidths[0],
					tableX + columnWidths[0] + columnWidths[1],
					tableX + columnWidths[0] + columnWidths[1] + columnWidths[2],
					tableX +
						columnWidths[0] +
						columnWidths[1] +
						columnWidths[2] +
						columnWidths[3],
				]
				// Header con gradiente y solo esquinas superiores redondeadas
				const radius = 6

				// Crear el gradiente
				const gradient = doc
					.linearGradient(tableX, tableY, tableX + tableWidth, tableY)
					.stop(0, COLORS.indigo800)
					.stop(1, COLORS.cyan600)

				// Guardar estado
				doc.save()

				doc
					.moveTo(tableX, tableY + headerHeight) // Esquina inferior izquierda
					.lineTo(tableX, tableY + radius) // Subir hasta antes del radio
					.quadraticCurveTo(tableX, tableY, tableX + radius, tableY) // Esquina sup. izquierda
					.lineTo(tableX + tableWidth - radius, tableY) // Línea superior
					.quadraticCurveTo(
						tableX + tableWidth,
						tableY,
						tableX + tableWidth,
						tableY + radius
					) // Esquina sup. derecha
					.lineTo(tableX + tableWidth, tableY + headerHeight) // Bajar
					.lineTo(tableX, tableY + headerHeight) // Cerrar figura
					.clip()

				// Rellenar área recortada con gradiente
				doc.rect(tableX, tableY, tableWidth, headerHeight).fill(gradient)

				// Restaurar estado
				doc.restore()

				// Texto del encabezado
				doc.fontSize(10).font('Helvetica-Bold').fillColor(COLORS.white)

				// Calcular altura del texto para centrar verticalmente
				let textHeight = doc.currentLineHeight()
				const headerTextY = tableY + (headerHeight - textHeight) / 2

				doc.text(headers[0], colX[0] + 6, headerTextY)
				doc.text(headers[1], colX[1] + 6, headerTextY)
				doc.text(headers[2], colX[2] + 15, headerTextY)
				doc.text(headers[3], colX[3] + 20, headerTextY)
				doc.text(headers[4], colX[4] + 20, headerTextY)

				// Contorno completo de la tabla
				doc
					.lineWidth(1)
					.strokeColor(COLORS.indigo700)
					.roundedRect(tableX, tableY, tableWidth, tableHeight, 6)
					.stroke()

				// Filas
				doc.font('Helvetica').fontSize(9).fillColor(COLORS.black)
				let rowY = tableY + headerHeight
				textHeight = doc.currentLineHeight()

				rows.forEach((row) => {
					const rowTextY = rowY + (rowHeight - textHeight) / 2

					doc.text(row.nroParte, colX[0] + 6, rowTextY)

					doc.text(row.descripcion, colX[1] + 6, rowTextY, {
						width: columnWidths[1] - 12,
						ellipsis: true,
					})

					doc.text(row.cantidad, colX[2] - 5, rowTextY, {
						width: columnWidths[2] - 12,
						align: 'right',
					})

					doc.text(row.tasa, colX[3] - 3, rowTextY, {
						width: columnWidths[3] - 12,
						align: 'right',
					})

					doc.text(row.total, colX[4] - 2, rowTextY, {
						width: columnWidths[4] - 12,
						align: 'right',
					})

					rowY += rowHeight
				})

				// Separadores horizontales entre filas
				doc.lineWidth(0.5).strokeColor(COLORS.indigo700)
				for (let i = 1; i <= rows.length; i++) {
					const yLine = tableY + headerHeight + i * rowHeight
					if (rows.length !== i) {
						doc
							.moveTo(tableX, yLine)
							.lineTo(tableX + tableWidth, yLine)
							.stroke()
					}
				}

				posY = tableY + tableHeight + 20
				// Línea divisoria posterior a la tabla
				doc.moveTo(40, posY).lineTo(555, posY).stroke()

				// Detalles de precios
				posY += 20
				doc.fontSize(11).font('Helvetica')

				// Calcular precio base (sin tasas)
				const precioBase = datos.detalles.reduce(
					(sum, d) => sum + d.precioUnitario * d.cantidad,
					0
				)

				// Dinero por tasas (impuestos)
				const dineroTasas = datos.impuestos

				// Total descontado
				const descuentoMostrado =
					datos.descuento && datos.descuento > 0 ? datos.descuento : 0

				// Mostrar detalles (más separación entre etiqueta y monto)
				doc.fontSize(11).font('Helvetica-Bold')
				doc.text(`Precio Base:`, 250, posY, {
					width: 100,
					align: 'right',
				})
				doc.text(`$${precioBase.toFixed(2)}`, 450, posY, {
					width: 100,
					align: 'right',
				})

				posY += 25
				doc.text(`Dinero por Tasas:`, 250, posY, {
					width: 100,
					align: 'right',
				})
				doc.text(`$${dineroTasas.toFixed(2)}`, 450, posY, {
					width: 100,
					align: 'right',
				})

				posY += 25
				doc.text(`Total Descontado:`, 250, posY, {
					width: 100,
					align: 'right',
				})
				if (descuentoMostrado > 0) {
					doc.fillColor('red')
				}
				doc.text(`-$${descuentoMostrado.toFixed(2)}`, 450, posY, {
					width: 100,
					align: 'right',
				})
				doc.fillColor(COLORS.black)

				posY += 30
				doc
					.fontSize(13)
					.font('Helvetica-Bold')
					.fillColor('#2ecc71') // Verde para el total
					.text(`TOTAL A PAGAR:`, 150, posY, {
						width: 200,
						align: 'right',
					})
				doc.text(`$${datos.total.toFixed(2)}`, 450, posY, {
					width: 100,
					align: 'right',
				})

				// Método de pago y observaciones
				doc.fillColor(COLORS.black).fontSize(10).font('Helvetica')
				doc.text(
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
