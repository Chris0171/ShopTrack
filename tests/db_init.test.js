const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')
const sqlite3 = require('sqlite3')
const { aplicarEsquema, migrarVenta, migrarFactura } = require('../backend/db/schema-init')

const ROOT = path.join(__dirname, '..')
const SQL = fs.readFileSync(path.join(ROOT, 'backend/db/database.sql'), 'utf8')
const MARCAS_INICIALES = 11

const dirs = []
const tmpDir = () => {
	const d = fs.mkdtempSync(path.join(os.tmpdir(), 'shoptrack-init-'))
	dirs.push(d)
	return d
}
test.after(() => dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })))

const abrir = (file = ':memory:') => new sqlite3.Database(file)
const run = (db, sql, params = []) =>
	new Promise((res, rej) => db.run(sql, params, function (e) { e ? rej(e) : res(this) }))
const all = (db, sql, params = []) =>
	new Promise((res, rej) => db.all(sql, params, (e, r) => (e ? rej(e) : res(r))))
const cerrar = (db) => new Promise((res) => db.close(res))

const nombres = async (db) => (await all(db, 'SELECT nombre FROM Marca ORDER BY id')).map((r) => r.nombre)

test('BD nueva: se crean el esquema y las marcas iniciales una sola vez', async () => {
	const db = abrir()
	await aplicarEsquema(db, SQL)
	const marcas = await nombres(db)
	assert.equal(marcas.length, MARCAS_INICIALES)
	assert.equal(new Set(marcas).size, MARCAS_INICIALES)
	const cols = (await all(db, 'PRAGMA table_info(Venta)')).map((c) => c.name)
	assert.ok(cols.includes('labor') && cols.includes('tasaImpuesto'))
	await cerrar(db)
})

test('Inicializar varias veces no falla, no duplica ni cambia los ids', async () => {
	const db = abrir()
	await aplicarEsquema(db, SQL)
	const antes = await all(db, 'SELECT id, nombre, activo FROM Marca ORDER BY id')
	for (let i = 0; i < 3; i++) {
		await aplicarEsquema(db, SQL)
		await migrarVenta(db)
	}
	assert.deepEqual(await all(db, 'SELECT id, nombre, activo FROM Marca ORDER BY id'), antes)
	await cerrar(db)
})

test('Datos existentes: marcas propias, productos, clientes, ventas y facturas intactos', async () => {
	const db = abrir()
	await aplicarEsquema(db, SQL)
	await run(db, "INSERT INTO Marca (nombre) VALUES ('Marca del usuario')")
	await run(db, "UPDATE Marca SET activo = 0 WHERE nombre = 'SKF'") // desactivada por el usuario
	const [{ id: marcaId }] = await all(db, "SELECT id FROM Marca WHERE nombre='Marca del usuario'")
	await run(db, `INSERT INTO Producto (NroParte, Descripcion, Precio, marcaId) VALUES ('P1','Prod',10,${marcaId})`)
	await run(db, "INSERT INTO Clientes (nombre) VALUES ('Cli')")
	await run(db, 'INSERT INTO Venta (idCliente, subtotal, impuestos, total, labor, tasaImpuesto) VALUES (1, 10, 0.83, 10.83, 0, 0.0825)')
	await run(db, "INSERT INTO Factura (idVenta, numeroFactura, subtotal, impuestos, total) VALUES (1,'F-1',10,0.83,10.83)")

	const instantanea = async () => ({
		producto: await all(db, 'SELECT * FROM Producto'),
		clientes: await all(db, 'SELECT * FROM Clientes'),
		venta: await all(db, 'SELECT * FROM Venta'),
		factura: await all(db, 'SELECT * FROM Factura'),
		marcas: await all(db, 'SELECT * FROM Marca ORDER BY id'),
	})
	const antes = await instantanea()
	await aplicarEsquema(db, SQL)
	await aplicarEsquema(db, SQL)
	await migrarVenta(db)
	assert.deepEqual(await instantanea(), antes)

	const [fila] = await all(db, 'SELECT p.NroParte, m.nombre FROM Producto p JOIN Marca m ON m.id = p.marcaId')
	assert.deepEqual({ ...fila }, { NroParte: 'P1', nombre: 'Marca del usuario' })
	assert.equal((await all(db, "SELECT activo FROM Marca WHERE nombre='SKF'"))[0].activo, 0)
	await cerrar(db)
})

test('Las marcas iniciales que faltan se recrean; las demás no se tocan', async () => {
	const db = abrir()
	await aplicarEsquema(db, SQL)
	await run(db, "DELETE FROM Marca WHERE nombre = 'Torque'")
	await aplicarEsquema(db, SQL)
	assert.equal((await nombres(db)).length, MARCAS_INICIALES)
	await cerrar(db)
})

test('La unicidad de Marca.nombre se mantiene', async () => {
	const db = abrir()
	await aplicarEsquema(db, SQL)
	await assert.rejects(run(db, "INSERT INTO Marca (nombre) VALUES ('SKF')"), /UNIQUE constraint failed: Marca.nombre/)
	await cerrar(db)
})

test('Un error real de SQLite se notifica y la transacción se revierte', async () => {
	const db = abrir()
	await aplicarEsquema(db, SQL)
	const antes = await nombres(db)
	const mal = `
		INSERT INTO Marca (nombre) VALUES ('Nueva transitoria');
		INSERT INTO TablaInexistente (x) VALUES (1);`
	await assert.rejects(aplicarEsquema(db, mal), /no such table: TablaInexistente/)
	assert.deepEqual(await nombres(db), antes) // nada aplicado a medias
	// Un conflicto único fuera del patrón de siembra tampoco se oculta
	await assert.rejects(aplicarEsquema(db, "INSERT INTO Marca (nombre) VALUES ('SKF');"), /UNIQUE constraint failed/)
	// La conexión queda utilizable (sin transacción abierta)
	await run(db, "INSERT INTO Marca (nombre) VALUES ('Posterior')")
	await cerrar(db)
})

test('Arranque real de initDatabase dos veces sobre la misma BD: sin errores ni duplicados', async () => {
	const dir = tmpDir()
	const script = `
		const db = require(${JSON.stringify(path.join(ROOT, 'backend/db/initDatabase'))})
		db.ready.then(() => db.all('SELECT COUNT(*) n, COUNT(DISTINCT nombre) d FROM Marca', (e, r) => {
			if (e) throw e
			console.log('RESULT ' + JSON.stringify(r[0]))
			process.exit(0)
		}))`
	const arrancar = () =>
		execFileSync(process.execPath, ['-e', script], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
	const primera = arrancar()
	assert.match(primera, /RESULT {"n":11,"d":11}/)
	// Marca creada por el usuario entre arranques
	const db = abrir(path.join(dir, 'data', 'shoptrack.db'))
	await run(db, "INSERT INTO Marca (nombre) VALUES ('Del usuario')")
	await cerrar(db)
	const segunda = arrancar()
	assert.match(segunda, /RESULT {"n":12,"d":12}/)
	for (const salida of [primera, segunda]) assert.doesNotMatch(salida, /UNIQUE|Error exec SQL/)
})

// --- Migración de Venta.descuentoPorcentaje ---
const SQL_1_0_4 = SQL.replace(/^labor REAL NOT NULL DEFAULT 0,\r?\n/m, '')
	.replace(/^tasaImpuesto REAL,\r?\n/m, '')
	.replace(/^descuentoPorcentaje REAL,\r?\n/m, '')

test('Migración: añade descuentoPorcentaje (nullable) a una base 1.0.4 sin tocar ventas ni importes', async () => {
	const db = abrir()
	await aplicarEsquema(db, SQL_1_0_4)
	await run(db, "INSERT INTO Clientes (nombre) VALUES ('C')")
	await run(db, 'INSERT INTO Venta (idCliente, subtotal, impuestos, total, descuento) VALUES (1, 100, 21, 111, 10), (1, 50, 5, 55, 0)')
	const antes = await all(db, 'SELECT id, subtotal, impuestos, total, descuento FROM Venta ORDER BY id')

	await migrarVenta(db)
	const col = (await all(db, 'PRAGMA table_info(Venta)')).find((c) => c.name === 'descuentoPorcentaje')
	assert.ok(col)
	assert.equal(col.notnull, 0)
	assert.equal(col.dflt_value, null)
	assert.deepEqual(await all(db, 'SELECT id, subtotal, impuestos, total, descuento FROM Venta ORDER BY id'), antes)
	assert.deepEqual((await all(db, 'SELECT descuentoPorcentaje p, labor, tasaImpuesto t FROM Venta')).map((r) => ({ ...r })), [
		{ p: null, labor: 0, t: null },
		{ p: null, labor: 0, t: null },
	])
	// Idempotente: repetir no falla ni duplica
	await migrarVenta(db)
	await aplicarEsquema(db, SQL)
	assert.equal((await all(db, 'PRAGMA table_info(Venta)')).filter((c) => c.name === 'descuentoPorcentaje').length, 1)
	await cerrar(db)
})

test('Migración: un fallo se propaga y no deja columnas a medias', async () => {
	const db = abrir()
	await run(db, 'CREATE TABLE Otra (id INTEGER)')
	await assert.rejects(migrarVenta(db), /no such table/)

	// Venta es una vista: ningún ALTER es posible
	const db2 = abrir()
	await run(db2, 'CREATE VIEW Venta AS SELECT 1 AS id')
	await assert.rejects(migrarVenta(db2), /view/i)
	await run(db2, 'SELECT 1') // sin transacción abierta
	await cerrar(db)
	await cerrar(db2)
})

test('initDatabase: si la migración falla, ready se rechaza y la app no continúa en silencio', () => {
	const dir = tmpDir()
	fs.mkdirSync(path.join(dir, 'data'))
	const f = path.join(dir, 'data', 'shoptrack.db')
	const script = `
		const sqlite3 = require(${JSON.stringify(path.join(ROOT, 'node_modules/sqlite3'))})
		const pre = new sqlite3.Database(${JSON.stringify(f)})
		pre.exec('CREATE VIEW Venta AS SELECT 1 AS id', () => pre.close(() => {
			const db = require(${JSON.stringify(path.join(ROOT, 'backend/db/initDatabase'))})
			db.ready.then(() => console.log('RESULT resuelto'), (e) => console.log('RESULT rechazado: ' + e.message))
				.then(() => process.exit(0))
		}))`
	const out = execFileSync(process.execPath, ['-e', script], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
	assert.match(out, /RESULT rechazado:/)
})

// --- Validación final del esquema ---
const { validarEsquema, ESQUEMA_REQUERIDO } = require('../backend/db/schema-init')

test('validarEsquema: esquema completo y migrado es válido; no modifica nada', async () => {
	const db = abrir()
	await aplicarEsquema(db, SQL)
	const antes = await all(db, "SELECT name, sql FROM sqlite_master ORDER BY name")
	await validarEsquema(db)
	assert.deepEqual(await all(db, "SELECT name, sql FROM sqlite_master ORDER BY name"), antes)
	await cerrar(db)
})

test('validarEsquema: una base 1.0.4 sin migrar se rechaza con tabla y columnas; migrada es válida', async () => {
	const db = abrir()
	await aplicarEsquema(db, SQL_1_0_4.replace(/^terminos TEXT,\r?\n/m, ''))
	await assert.rejects(validarEsquema(db), (e) => {
		assert.match(e.message, /tabla Venta: faltan las columnas labor, tasaImpuesto, descuentoPorcentaje/)
		assert.match(e.message, /tabla Factura: faltan las columnas terminos/)
		return true
	})
	// la validación no añadió ninguna columna
	assert.ok(!(await all(db, 'PRAGMA table_info(Venta)')).some((c) => c.name === 'labor'))
	await migrarVenta(db)
	await migrarFactura(db)
	await validarEsquema(db)
	await cerrar(db)
})

test('validarEsquema: columnas y tablas ausentes se nombran y los datos no se tocan', async () => {
	const db = abrir()
	const incompleto = SQL.replace(/^stockMinimo INTEGER NOT NULL DEFAULT 0,\r?\n/m, '')
	assert.notEqual(incompleto, SQL)
	await aplicarEsquema(db, incompleto)
	await run(db, 'DROP TABLE ProductoFotos')
	await run(db, "INSERT INTO Producto (NroParte, Descripcion, Cantidad, Precio, marcaId) VALUES ('X','d',1,1,1)")
	const filas = await all(db, 'SELECT * FROM Producto')
	await assert.rejects(validarEsquema(db), (e) => {
		assert.match(e.message, /falta la tabla ProductoFotos/)
		assert.match(e.message, /tabla Producto: faltan las columnas stockMinimo/)
		return true
	})
	assert.deepEqual(await all(db, 'SELECT * FROM Producto'), filas)
	assert.ok(!(await all(db, 'PRAGMA table_info(Producto)')).some((c) => c.name === 'stockMinimo'))
	await cerrar(db)
})

test('ESQUEMA_REQUERIDO coincide con el esquema que crea database.sql + migraciones', async () => {
	const db = abrir()
	await aplicarEsquema(db, SQL)
	const real = {}
	for (const t of await all(db, "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")) {
		real[t.name] = (await all(db, `PRAGMA table_info("${t.name}")`)).map((c) => c.name).sort()
	}
	const requerido = Object.fromEntries(Object.entries(ESQUEMA_REQUERIDO).map(([t, c]) => [t, [...c].sort()]))
	assert.deepEqual(real, requerido)
	await cerrar(db)
})

test('initDatabase: base con esquema incompleto rechaza ready con el detalle y no añade columnas', () => {
	const dir = tmpDir()
	fs.mkdirSync(path.join(dir, 'data'))
	const f = path.join(dir, 'data', 'shoptrack.db')
	const script = `
		const sqlite3 = require(${JSON.stringify(path.join(ROOT, 'node_modules/sqlite3'))})
		const sql = require('fs').readFileSync(${JSON.stringify(path.join(ROOT, 'backend/db/database.sql'))}, 'utf8').replace(/^stockMinimo INTEGER NOT NULL DEFAULT 0,\\r?\\n/m, '')
		const pre = new sqlite3.Database(${JSON.stringify(f)})
		pre.exec(sql, () => pre.close(() => {
			const db = require(${JSON.stringify(path.join(ROOT, 'backend/db/initDatabase'))})
			db.ready.then(() => console.log('RESULT resuelto'), (e) => console.log('RESULT rechazado: ' + e.message))
				.then(() => db.all('PRAGMA table_info(Producto)', (e, c) => { console.log('COLS ' + c.map((x) => x.name).join(',')); process.exit(0) }))
		}))`
	const out = execFileSync(process.execPath, ['-e', script], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
	assert.match(out, /RESULT rechazado: Esquema de la base de datos incompleto \(tabla Producto: faltan las columnas stockMinimo\)/)
	assert.ok(!/COLS .*stockMinimo/.test(out))
})

for (const tag of ['v1.0.0', 'v1.0.1', 'v1.0.2', 'v1.0.3', 'v1.0.4']) {
	test(`Versión publicada ${tag}: su base se inicializa y supera la validación (datos conservados)`, async (t) => {
		let sqlTag
		try {
			sqlTag = execFileSync('git', ['show', `${tag}:backend/db/database.sql`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 })
		} catch {
			return t.skip(`tag ${tag} no disponible en este clon`)
		}
		const dir = tmpDir()
		fs.mkdirSync(path.join(dir, 'data'))
		const file = path.join(dir, 'data', 'shoptrack.db')
		const pre = abrir(file)
		await new Promise((res) => pre.exec(sqlTag, () => res())) // como hacía esa versión: el error de exec solo se registraba
		const filasAntes = {}
		for (const tb of ['Marca', 'Producto', 'Clientes', 'Venta', 'DetalleVenta', 'Factura']) filasAntes[tb] = (await all(pre, `SELECT COUNT(*) n FROM ${tb}`))[0].n
		await cerrar(pre)
		const script = `const db = require(${JSON.stringify(path.join(ROOT, 'backend/db/initDatabase'))});db.ready.then(() => console.log('RESULT ok'), (e) => console.log('RESULT rechazado: ' + e.message)).then(() => process.exit(0))`
		const out = execFileSync(process.execPath, ['-e', script], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
		assert.match(out, /RESULT ok/, out)
		const post = abrir(file)
		for (const [tb, n] of Object.entries(filasAntes)) {
			const despues = (await all(post, `SELECT COUNT(*) n FROM ${tb}`))[0].n
			assert.ok(despues >= n, `${tb}: ${despues} < ${n}`) // las marcas iniciales pueden completarse; nada se pierde
			if (tb !== 'Marca') assert.equal(despues, n, tb)
		}
		await cerrar(post)
	})
}
