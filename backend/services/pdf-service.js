const PDFDocument = require('pdfkit-table')
const fs = require('fs')
const path = require('path')
const configService = require('./config-service')
const pathService = require('./path-service')

// Cargar localizaciones (caché)
let locales = {}

function loadLocale(language = 'es') {
	if (!locales[language]) {
		try {
			const localePath = path.join(
				__dirname,
				`../../assets/locales/${language}.json`
			)
			const content = fs.readFileSync(localePath, 'utf-8')
			locales[language] = JSON.parse(content)
			console.log(`✓ Locale ${language} cargado en pdf-service`)
		} catch (error) {
			console.error(`Error cargando locale ${language}:`, error.message)
			// Fallback a español
			return loadLocale('es')
		}
	}
	return locales[language]
}

// Función auxiliar para obtener traducción
function t(locale, key) {
	const keys = key.split('.')
	let value = locale
	for (const k of keys) {
		value = value?.[k]
	}
	return value || key
}

// Clase contenedora del servicio PDF
class PDFService {
	// Generar PDF de factura con soporte i18n
	static generarFacturaPDF(datos) {
		return new Promise((resolve, reject) => {
			try {
				// Obtener configuración para idioma de factura
				const config = configService.getConfig()
				const idiomaFactura = config.idiomaFactura || 'es'
				const locale = loadLocale(idiomaFactura)

				// Función auxiliar dentro del contexto
				const getText = (key) => t(locale, key)

			// Obtener directorio de facturas desde pathService
			const dirFacturas = pathService.getInvoicesPath()

			// Crear nombre de archivo
			const nombreArchivo = `Factura_${datos.numeroFactura}_${Date.now()}.pdf`
			const rutaArchivo = pathService.getInvoicePath(nombreArchivo)
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
					.text(config.nombre || 'Core transport lLC', { align: 'center' })
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
					.text(getText('invoice.title'), 40, posY)
				doc.fontSize(10).font('Helvetica')

				posY += 15

				// Línea divisoria 1
				doc.moveTo(40, posY).lineTo(555, posY).stroke()

				posY += 10

				doc
					.fillColor(COLORS.black)
					.text(
						`${getText('invoice.date')}: ${this.formatearFecha(
							datos.fechaEmision
						)}`,
						40,
						posY
					)
				doc.text(
					`${getText('invoice.invoiceNumber')}: ${datos.numeroFactura}`,
					40,
					posY + 18
				)

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
				doc.text(
					`${getText('invoice.customer')}: ${datos.cliente.nombre}`,
					40,
					posY
				)
				doc.text(
					`${getText('common.address')}: ${datos.cliente.direccion || 'N/A'}`,
					40,
					posY + 18
				)
				doc.text(
					`${getText('common.phone')}: ${datos.cliente.telefono || 'N/A'}`,
					40,
					posY + 36
				)
				doc.text(
					`${getText('common.email')}: ${datos.cliente.email || 'N/A'}`,
					40,
					posY + 54
				)

				// Tabla manual estilizada con gradiente y bordes redondeados
				posY += 115
				const headers = [
					getText('products.list.nroParte'),
					getText('products.list.description'),
					getText('invoice.unitPrice'),
					getText('invoice.quantity'),
					getText('invoice.total'),
				]
				const columnWidths = [120, 195, 80, 70, 50]
				const tableX = 40
				const tableY = posY
				const tableWidth = 515
				const headerHeight = 30
				const minRowHeight = 25
				const rows = datos.detalles.map((d) => {
					// Total de línea SIN tasa: solo precio × cantidad
					const totalLinea = (d.precioUnitario * d.cantidad).toFixed(2)
					return {
						nroParte: d.nroParte,
						descripcion: d.descripcion,
						precioUnit: `$${Number(d.precioUnitario || 0).toFixed(2)}`,
						cantidad: d.cantidad.toString(),
						total: `$${totalLinea}`,
					}
				})

				// Calcular altura de cada fila según el contenido de la descripción
				doc.font('Helvetica').fontSize(9)
				const rowHeights = rows.map((row) => {
					const descHeight = doc.heightOfString(row.descripcion, {
						width: columnWidths[1] - 12,
					})
					// Añadir padding vertical (10px arriba + 10px abajo)
					return Math.max(minRowHeight, descHeight + 20)
				})

				const tableHeight =
					headerHeight + rowHeights.reduce((sum, h) => sum + h, 0)
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
				doc.text(headers[2], colX[2] + 6, headerTextY, {
					width: columnWidths[2] - 16,
					align: 'right',
				})
				doc.text(headers[3], colX[3] + 6, headerTextY, {
					width: columnWidths[3] - 20,
					align: 'right',
				})
				doc.text(headers[4], colX[4] + 6, headerTextY, {
					width: columnWidths[4] - 12,
					align: 'center',
				})

				// Contorno completo de la tabla
				doc
					.lineWidth(1)
					.strokeColor(COLORS.indigo700)
					.roundedRect(tableX, tableY, tableWidth, tableHeight, 6)
					.stroke()

				// Filas
				doc.font('Helvetica').fontSize(9).fillColor(COLORS.black)
				let rowY = tableY + headerHeight

				rows.forEach((row, index) => {
					const currentRowHeight = rowHeights[index]

					// Calcular altura del texto de descripción para centrado vertical
					const descHeight = doc.heightOfString(row.descripcion, {
						width: columnWidths[1] - 12,
					})
					const textHeight = doc.currentLineHeight()

					// Centrar verticalmente la descripción multilínea
					const descTextY = rowY + (currentRowHeight - descHeight) / 2

					// Centrar verticalmente el resto de campos (altura simple)
					const singleLineTextY = rowY + (currentRowHeight - textHeight) / 2

					// Nro Parte
					doc.text(row.nroParte, colX[0] + 6, singleLineTextY)

					// Descripción (puede ser multilínea)
					doc.text(row.descripcion, colX[1] + 6, descTextY, {
						width: columnWidths[1] - 12,
						lineBreak: true,
					})

					// Precio Unitario (alineado a la derecha con padding derecho)
					doc.text(row.precioUnit, colX[2] + 6, singleLineTextY, {
						width: columnWidths[2] - 16,
						align: 'right',
					})

					// Cantidad (alineado a la derecha con padding derecho)
					doc.text(row.cantidad, colX[3] + 6, singleLineTextY, {
						width: columnWidths[3] - 28,
						align: 'right',
					})

					// Total (alineado a la derecha con padding derecho)
					doc.text(row.total, colX[4] + 6, singleLineTextY, {
						width: columnWidths[4] - 12,
						align: 'right',
					})

					rowY += currentRowHeight
				})

				// Separadores horizontales entre filas
				doc.lineWidth(0.5).strokeColor(COLORS.indigo700)
				let separatorY = tableY + headerHeight
				for (let i = 0; i < rows.length; i++) {
					separatorY += rowHeights[i]
					if (i < rows.length - 1) {
						doc
							.moveTo(tableX, separatorY)
							.lineTo(tableX + tableWidth, separatorY)
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
				doc.text(`${getText('invoice.subtotal')}:`, 250, posY, {
					width: 100,
					align: 'right',
				})
				doc.text(`$${precioBase.toFixed(2)}`, 450, posY, {
					width: 100,
					align: 'right',
				})

				posY += 25
				// Obtener IVA predeterminado de configuración para mostrar en porcentaje
				const ivaPredeterminado = config.ivaPredeterminado || 0.21
				const ivaPorcentaje = ivaPredeterminado * 100
				doc.text(
					`${getText('invoice.taxes')} (${ivaPorcentaje}%):`,
					250,
					posY,
					{
						width: 100,
						align: 'right',
					}
				)
				doc.text(`$${dineroTasas.toFixed(2)}`, 450, posY, {
					width: 100,
					align: 'right',
				})

				posY += 25
				doc.text(`${getText('invoice.discount')}:`, 250, posY, {
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
					.text(`${getText('invoice.total').toUpperCase()}:`, 150, posY, {
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
					`${getText(
						'sales.new.invoice.paymentMethod'
					)}: ${datos.metodoPago.toUpperCase()}`,
					40,
					posY + 50
				)

				if (datos.observaciones) {
					doc.text(
						`${getText('sales.new.invoice.observations')}: ${
							datos.observaciones
						}`,
						40,
						posY + 70,
						{
							width: 515,
						}
					)
				}

				// Pie de página
				doc.fontSize(8).text(getText('invoice.thankYou'), 40, 750, {
					align: 'center',
				})

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
