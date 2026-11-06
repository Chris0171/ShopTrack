// Inicialización del esquema de SQLite: transaccional e idempotente.

const run = (db, sql, params = []) =>
	new Promise((resolve, reject) =>
		db.run(sql, params, function (err) {
			err ? reject(err) : resolve(this)
		}),
	)
const all = (db, sql) =>
	new Promise((resolve, reject) =>
		db.all(sql, (err, rows) => (err ? reject(err) : resolve(rows))),
	)
const exec = (db, sql) =>
	new Promise((resolve, reject) =>
		db.exec(sql, (err) => (err ? reject(err) : resolve())),
	)

// Columnas añadidas a Venta en bases existentes.
// labor: ventas antiguas => 0. tasaImpuesto: ventas antiguas => NULL (tasa no registrada).
// descuentoPorcentaje: ventas antiguas => NULL (el descuento histórico es solo un importe).
const COLUMNAS_VENTA = [
	['labor', 'REAL NOT NULL DEFAULT 0'],
	['tasaImpuesto', 'REAL'],
	['descuentoPorcentaje', 'REAL'],
]

// Ejecuta el script completo en una transacción: o se aplica entero o no se aplica nada.
// Los errores se propagan (rechaza la promesa) tras hacer ROLLBACK.
async function aplicarEsquema(db, sql) {
	await exec(db, 'BEGIN IMMEDIATE')
	try {
		await exec(db, sql)
		await exec(db, 'COMMIT')
	} catch (error) {
		await exec(db, 'ROLLBACK').catch(() => {})
		throw error
	}
}

// Factura.terminos: instantánea de los términos vigentes al emitir. NULL = factura anterior (sin términos).
const COLUMNAS_FACTURA = [['terminos', 'TEXT']]

// Todas las columnas pendientes se añaden en una sola transacción; si falla, no queda nada a medias.
async function agregarColumnas(db, tabla, columnas) {
	const cols = await all(db, `PRAGMA table_info(${tabla})`)
	const pendientes = columnas.filter(
		([nombre]) => !cols.some((c) => c.name === nombre),
	)
	if (!pendientes.length) return
	await exec(db, 'BEGIN IMMEDIATE')
	try {
		for (const [nombre, definicion] of pendientes) {
			await run(db, `ALTER TABLE ${tabla} ADD COLUMN ${nombre} ${definicion}`)
		}
		await exec(db, 'COMMIT')
	} catch (error) {
		await exec(db, 'ROLLBACK').catch(() => {})
		throw error
	}
	for (const [nombre] of pendientes) console.log(`✔ Columna ${tabla}.${nombre} añadida`)
}

const migrarVenta = (db) => agregarColumnas(db, 'Venta', COLUMNAS_VENTA)
const migrarFactura = (db) => agregarColumnas(db, 'Factura', COLUMNAS_FACTURA)

// Tablas y columnas que usa la aplicación actual (controladores y servicios).
const ESQUEMA_REQUERIDO = {
	Clientes: ['id', 'nombre', 'telefono', 'email', 'direccion'],
	DetalleVenta: ['id', 'idVenta', 'idProducto', 'cantidad', 'precioUnitario', 'tasaAplicada', 'totalLinea'],
	Factura: ['id', 'idVenta', 'numeroFactura', 'fechaEmision', 'subtotal', 'impuestos', 'total', 'metodoPago', 'observaciones', 'estado', 'rutaPDF', 'terminos'],
	Marca: ['id', 'nombre', 'activo'],
	Producto: ['id', 'NroParte', 'Descripcion', 'Cantidad', 'stockMinimo', 'Precio', 'Tasas', 'activo', 'marcaId', 'precioCosto', 'ubicacion'],
	ProductoFotos: ['id', 'idProducto', 'nombreImagen', 'esPrincipal', 'orden'],
	ProductoNumerosParte: ['id', 'idProducto', 'nroParte', 'esPrincipal'],
	Venta: ['id', 'idCliente', 'fecha', 'subtotal', 'impuestos', 'total', 'descuento', 'motivoDescuento', 'labor', 'tasaImpuesto', 'descuentoPorcentaje'],
}

// Solo lectura: rechaza con un mensaje claro si falta alguna tabla o columna; no modifica nada.
async function validarEsquema(db, requerido = ESQUEMA_REQUERIDO) {
	const problemas = []
	for (const [tabla, columnas] of Object.entries(requerido)) {
		const existentes = (await all(db, `PRAGMA table_info("${tabla}")`)).map((c) => c.name)
		if (!existentes.length) {
			problemas.push(`falta la tabla ${tabla}`)
			continue
		}
		const ausentes = columnas.filter((c) => !existentes.includes(c))
		if (ausentes.length) problemas.push(`tabla ${tabla}: faltan las columnas ${ausentes.join(', ')}`)
	}
	if (problemas.length) {
		throw new Error(`Esquema de la base de datos incompleto (${problemas.join('; ')}).`)
	}
}

module.exports = {
	aplicarEsquema,
	migrarVenta,
	migrarFactura,
	validarEsquema,
	ESQUEMA_REQUERIDO,
}
