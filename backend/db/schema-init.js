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

// Todas las columnas pendientes se añaden en una sola transacción; si falla, no queda nada a medias.
async function migrarVenta(db) {
	const cols = await all(db, 'PRAGMA table_info(Venta)')
	const pendientes = COLUMNAS_VENTA.filter(
		([nombre]) => !cols.some((c) => c.name === nombre),
	)
	if (!pendientes.length) return
	await exec(db, 'BEGIN IMMEDIATE')
	try {
		for (const [nombre, definicion] of pendientes) {
			await run(db, `ALTER TABLE Venta ADD COLUMN ${nombre} ${definicion}`)
		}
		await exec(db, 'COMMIT')
	} catch (error) {
		await exec(db, 'ROLLBACK').catch(() => {})
		throw error
	}
	for (const [nombre] of pendientes) console.log(`✔ Columna Venta.${nombre} añadida`)
}

module.exports = { aplicarEsquema, migrarVenta }
