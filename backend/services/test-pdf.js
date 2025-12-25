const PDFService = require('./pdf-service')

async function main() {
	const datos = {
		numeroFactura: 'F-12345',
		fechaEmision: new Date().toISOString(),
		cliente: {
			nombre: 'Cliente Ejemplo S.A.',
			direccion: 'Av. Siempre Viva 742',
			telefono: '+54 11 5555-5555',
			email: 'contacto@cliente.com',
		},
		detalles: [
			{
				nroParte: 'P-001',
				descripcion: 'Producto A muy largo con descripción',
				cantidad: 2,
				precioUnitario: 150.0,
				tasaAplicada: 0.21,
			},
			{
				nroParte: 'P-002',
				descripcion: 'Servicio B',
				cantidad: 1,
				precioUnitario: 300.0,
				tasaAplicada: 0.1,
			},
			{
				nroParte: 'P-003',
				descripcion: 'Repuesto C',
				cantidad: 3,
				precioUnitario: 75.0,
				tasaAplicada: 0.21,
			},
		],
		metodoPago: 'tarjeta',
		observaciones: 'Entrega dentro de 48 horas.',
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

	try {
		const res = await PDFService.generarFacturaPDF(datos)
		console.log('PDF generado:', res)
	} catch (err) {
		console.error('Error generando PDF:', err)
	}
}

main()
