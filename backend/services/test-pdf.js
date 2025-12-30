const PDFService = require('./pdf-service')
const configService = require('./config-service')

async function main() {
	// Configurar idioma de factura en inglés para el test
	try {
		const currentConfig = configService.getConfig()
		configService.updateConfig({
			...currentConfig,
			idiomaFactura: 'en',
		})
		console.log('✓ Configuración actualizada a inglés para test')
	} catch (error) {
		console.warn('No se pudo actualizar config, usando por defecto')
	}

	const datos = {
		numeroFactura: 'INV-12345',
		fechaEmision: new Date().toISOString(),
		cliente: {
			nombre: 'Example Customer Inc.',
			direccion: '742 Evergreen Terrace',
			telefono: '+1 555-123-4567',
			email: 'contact@customer.com',
		},
		detalles: [
			{
				nroParte: 'P-001',
				descripcion:
					'Premium Quality Product A with extended warranty and comprehensive technical support including 24/7 customer service',
				cantidad: 2,
				precioUnitario: 150.0,
				tasaAplicada: 0.0825,
			},
			{
				nroParte: 'P-002',
				descripcion: 'Professional Service B - Installation and Configuration',
				cantidad: 1,
				precioUnitario: 300.0,
				tasaAplicada: 0.0825,
			},
			{
				nroParte: 'P-003',
				descripcion: 'Spare Part C',
				cantidad: 3,
				precioUnitario: 75.0,
				tasaAplicada: 0.0825,
			},
			{
				nroParte: 'P-004',
				descripcion:
					'Extended warranty coverage for all electronic components including replacement parts and labor costs with priority technical support and advanced replacement service available 24/7',
				cantidad: 1,
				precioUnitario: 199.99,
				tasaAplicada: 0.0825,
			},
		],
		metodoPago: 'credit card',
		observaciones: 'Delivery within 48 hours. Handle with care.',
		descuento: 25.0,
	}

	const precioBase = datos.detalles.reduce(
		(sum, d) => sum + d.precioUnitario * d.cantidad,
		0
	)
	const impuestos = datos.detalles.reduce(
		(sum, d) => sum + d.precioUnitario * d.cantidad * d.tasaAplicada,
		0
	)
	datos.impuestos = impuestos
	datos.total = precioBase + impuestos - (datos.descuento || 0)

	console.log('📊 Test Invoice Data:')
	console.log(`   Subtotal: $${precioBase.toFixed(2)}`)
	console.log(`   Taxes: $${impuestos.toFixed(2)}`)
	console.log(`   Discount: -$${datos.descuento.toFixed(2)}`)
	console.log(`   Total: $${datos.total.toFixed(2)}`)
	console.log('')

	try {
		console.log('🔄 Generating PDF invoice in English...')
		const res = await PDFService.generarFacturaPDF(datos)
		console.log('✅ PDF generated successfully!')
		console.log(`   File: ${res.nombreArchivo}`)
		console.log(`   Path: ${res.ruta}`)
	} catch (err) {
		console.error('❌ Error generating PDF:', err.message)
		console.error(err)
		process.exit(1)
	}
}

main()
