// Restauración de copias: usa carpetas temporales; nunca toca los datos reales del repositorio.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const crypto = require('crypto')
const { execFileSync } = require('child_process')
const sqlite3 = require('sqlite3')

const ROOT = path.join(__dirname, '..')
const SQL = fs.readFileSync(path.join(ROOT, 'backend/db/database.sql'), 'utf8')
const dirs = []
const tmpDir = () => {
	const d = fs.mkdtempSync(path.join(os.tmpdir(), 'shoptrack-restore-'))
	dirs.push(d)
	return d
}
test.after(() => {
	process.chdir(ROOT)
	dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true }))
})

const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')
const run = (db, sql, p = []) => new Promise((res, rej) => db.run(sql, p, function (e) { e ? rej(e) : res(this) }))
const all = (db, sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => (e ? rej(e) : res(r))))
const exec = (db, sql) => new Promise((res, rej) => db.exec(sql, (e) => (e ? rej(e) : res())))
const close = (db) => new Promise((res) => db.close(res))

// Base con el esquema de la 1.0.4 (sin labor ni tasaImpuesto) y datos de ejemplo
async function crearBaseLegacy(file) {
	const sql = SQL.replace(/^labor REAL NOT NULL DEFAULT 0,\r?\n/m, '').replace(/^tasaImpuesto REAL,\r?\n/m, '')
	const db = new sqlite3.Database(file)
	await exec(db, sql)
	await run(db, "INSERT INTO Clientes (nombre, telefono) VALUES ('Cliente A','111'),('Cliente B','222')")
	await run(db, "INSERT INTO Producto (NroParte, Descripcion, Cantidad, Precio, Tasas, marcaId) VALUES ('L-1','Legacy 1',10,100,0.21,1),('L-2','Legacy 2',5,50,0.10,2)")
	await run(db, 'INSERT INTO Venta (idCliente, subtotal, impuestos, total, descuento) VALUES (1,100,21,121,0),(2,50,5,55,0)')
	await run(db, 'INSERT INTO DetalleVenta (idVenta,idProducto,cantidad,precioUnitario,tasaAplicada,totalLinea) VALUES (1,1,1,100,0.21,121),(2,2,1,50,0.10,55)')
	await run(db, "INSERT INTO Factura (idVenta,numeroFactura,subtotal,impuestos,total,metodoPago) VALUES (1,'OLD-1',100,21,121,'efectivo'),(2,'OLD-2',50,5,55,'efectivo')")
	await close(db)
}

const verificador = (dir) => `
	process.chdir(${JSON.stringify(dir)})
	const R = ${JSON.stringify(ROOT)}
	const db = require(R + '/backend/db/initDatabase')
	const vc = require(R + '/backend/controllers/venta-controller')
	const dv = require(R + '/backend/controllers/detalleVenta-controller')
	const fc = require(R + '/backend/controllers/factura-controller')
	const cb = (fn, ...a) => new Promise((res, rej) => fn(...a, (e, r) => (e ? rej(e) : res(r))))
	const q = (s) => new Promise((res, rej) => db.all(s, (e, r) => (e ? rej(e) : res(r))))
	db.ready.then(async () => {
		const out = {}
		for (const t of ['Marca','Producto','Clientes','Venta','DetalleVenta','Factura']) out[t] = (await q('SELECT COUNT(*) n FROM ' + t))[0].n
		out.cols = (await q('PRAGMA table_info(Venta)')).map(c => c.name)
		out.ventas = await q('SELECT id, subtotal, impuestos, total, labor, tasaImpuesto FROM Venta ORDER BY id')
		out.historial = (await cb(dv.getPaginated, 50, 0)).map(r => ({ id: r.idVenta, labor: r.labor, total: r.total, factura: r.numeroFactura }))
		out.getById = (await cb(vc.getById, 1)).labor
		out.factura = (await cb(fc.getByVentaId, 1)).map(f => f.numeroFactura)
		out.integrity = (await q('PRAGMA integrity_check'))[0].integrity_check
		console.log('RESULT ' + JSON.stringify(out))
		process.exit(0)
	})`
const verificar = (dir) => {
	const out = execFileSync(process.execPath, ['-e', verificador(dir)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
	return JSON.parse(out.split('\n').find((l) => l.startsWith('RESULT ')).slice(7))
}

const dir = tmpDir()
const dataDir = path.join(dir, 'data')
const dbFile = path.join(dataDir, 'shoptrack.db')
const legacyFile = path.join(tmpDir(), 'backup-1.0.4.sql') // las copias de la app usan extensión .sql
let db, backupService, handlers
let dialogResult

test.before(async () => {
	fs.mkdirSync(dataDir, { recursive: true })
	await crearBaseLegacy(legacyFile)
	process.chdir(dir)
	const electronPath = require.resolve('electron')
	require.cache[electronPath] = {
		id: electronPath, filename: electronPath, loaded: true,
		exports: { shell: {}, dialog: { showOpenDialog: async () => dialogResult } },
	}
	db = require('../backend/db/initDatabase')
	await db.ready
	backupService = require('../backend/services/backup-service')
	handlers = {}
	require('../backend/ipcs/general.ipc')({ handle: (n, fn) => (handlers[n] = fn) }, () => null)
	// Datos "actuales" (esquema nuevo) que deben quedar recuperables tras restaurar
	await run(db, "INSERT INTO Clientes (nombre) VALUES ('Cliente actual')")
	await run(db, 'INSERT INTO Venta (idCliente, subtotal, impuestos, total, labor, tasaImpuesto) VALUES (1, 100, 10.73, 140.73, 30, 0.0825)')
})

test('Copias inválidas se rechazan sin tocar la base actual ni dejar temporales', async () => {
	const antes = sha(dbFile)
	const basura = path.join(tmpDir(), 'basura.sql')
	fs.writeFileSync(basura, 'esto no es una base de datos')
	const vacio = path.join(tmpDir(), 'vacio.sql')
	fs.writeFileSync(vacio, '')
	const truncada = path.join(tmpDir(), 'truncada.sql')
	fs.writeFileSync(truncada, fs.readFileSync(legacyFile).subarray(0, 5000))
	const otra = path.join(tmpDir(), 'otra.sql')
	const o = new sqlite3.Database(otra)
	await run(o, 'CREATE TABLE Otra (id INTEGER)')
	await close(o)
	const textoSQL = path.join(tmpDir(), 'dump.sql')
	fs.writeFileSync(textoSQL, 'CREATE TABLE Marca (id INTEGER);\n')

	for (const f of [basura, vacio, truncada, otra, textoSQL, path.join(tmpDir(), 'no-existe.sql')]) {
		const r = await backupService.restoreDatabase(f, { closeConnection: async () => assert.fail('no debe cerrar la conexión') })
		assert.equal(r.ok, false, path.basename(f))
		assert.ok(r.error)
		assert.ok(!r.restartRequired)
	}
	assert.equal(sha(dbFile), antes)
	assert.ok(!fs.existsSync(`${dbFile}.restore-tmp`))
	assert.equal((await all(db, 'SELECT COUNT(*) n FROM Venta'))[0].n, 1) // la conexión sigue operativa
})

test('Restaurar cancelado desde el diálogo no cambia nada', async () => {
	dialogResult = { canceled: true, filePaths: [] }
	const antes = sha(dbFile)
	assert.deepEqual(await handlers['backup:restore'](), { ok: false, canceled: true })
	assert.equal(sha(dbFile), antes)
})

test('Restaurar copia de la 1.0.4: sustituye la base, guarda copia previa y pide reiniciar', async () => {
	const actualAntes = sha(dbFile)
	dialogResult = { canceled: false, filePaths: [legacyFile] }
	const r = await handlers['backup:restore']()
	assert.equal(r.ok, true, r.error)
	assert.equal(r.restartRequired, true)
	assert.equal(sha(dbFile), sha(legacyFile)) // copia completa, no parcial
	assert.ok(!fs.existsSync(`${dbFile}.restore-tmp`))
	for (const s of ['-journal', '-wal', '-shm']) assert.ok(!fs.existsSync(dbFile + s))

	// copia recuperable de la base anterior (con la venta con Labor)
	const previas = fs.readdirSync(path.join(dataDir, 'backups')).filter((f) => f.startsWith('db-before-restore-'))
	assert.equal(previas.length, 1)
	assert.equal(sha(path.join(dataDir, 'backups', previas[0])), actualAntes)
	const prev = new sqlite3.Database(path.join(dataDir, 'backups', previas[0]), sqlite3.OPEN_READONLY)
	assert.deepEqual((await all(prev, 'SELECT labor, total FROM Venta')).map((v) => ({ ...v })), [{ labor: 30, total: 140.73 }])
	await close(prev)

	// la conexión antigua ya no se puede usar por error
	await assert.rejects(all(db, 'SELECT 1'), /closed|CLOSED|MISUSE/i)
})

test('Tras reiniciar: migra la base restaurada y historial, ventas y facturas funcionan', () => {
	const r = verificar(dir)
	assert.ok(r.cols.includes('labor') && r.cols.includes('tasaImpuesto'))
	assert.deepEqual(
		[r.Marca, r.Producto, r.Clientes, r.Venta, r.DetalleVenta, r.Factura],
		[11, 2, 2, 2, 2, 2],
	)
	assert.deepEqual(r.ventas.map((v) => [v.id, v.total, v.labor, v.tasaImpuesto]), [[1, 121, 0, null], [2, 55, 0, null]])
	assert.deepEqual(r.historial.map((h) => [h.id, h.total, h.labor, h.factura]), [[2, 55, 0, 'OLD-2'], [1, 121, 0, 'OLD-1']])
	assert.equal(r.getById, 0)
	assert.deepEqual(r.factura, ['OLD-1'])
	assert.equal(r.integrity, 'ok')
})

test('Restaurar sobre una base ya migrada vuelve a funcionar con el esquema nuevo (segunda restauración)', async () => {
	// copia en esquema nuevo restaurada sobre otra instalación aislada
	const d2 = tmpDir()
	fs.mkdirSync(path.join(d2, 'data'))
	const nueva = path.join(d2, 'nueva.sql')
	fs.copyFileSync(dbFile, nueva) // base ya migrada por el paso anterior
	const script = `
		process.chdir(${JSON.stringify(d2)})
		const R = ${JSON.stringify(ROOT)}
		const db = require(R + '/backend/db/initDatabase')
		const bs = require(R + '/backend/services/backup-service')
		db.ready.then(async () => {
			const r = await bs.restoreDatabase(${JSON.stringify(nueva)}, { closeConnection: () => new Promise((res, rej) => db.close((e) => e ? rej(e) : res())) })
			console.log('RESULT ' + JSON.stringify(r))
			process.exit(0)
		})`
	const out = execFileSync(process.execPath, ['-e', script], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
	const r = JSON.parse(out.split('\n').find((l) => l.startsWith('RESULT ')).slice(7))
	assert.deepEqual(r, { ok: true, restartRequired: true })
	assert.equal(sha(path.join(d2, 'data', 'shoptrack.db')), sha(nueva))
})

test('Copia real de la 1.0.4 (tag v1.0.4 del repositorio, si está disponible)', async (t) => {
	let real
	try {
		real = execFileSync('git', ['show', 'v1.0.4:data/shoptrack.db'], { cwd: ROOT, maxBuffer: 50 * 1024 * 1024 })
	} catch {
		return t.skip('tag v1.0.4 no disponible en este clon')
	}
	const d3 = tmpDir()
	fs.mkdirSync(path.join(d3, 'data'))
	const f = path.join(tmpDir(), 'real-1.0.4.sql')
	fs.writeFileSync(f, real)
	const script = `
		process.chdir(${JSON.stringify(d3)})
		const R = ${JSON.stringify(ROOT)}
		const db = require(R + '/backend/db/initDatabase')
		const bs = require(R + '/backend/services/backup-service')
		db.ready.then(async () => {
			const r = await bs.restoreDatabase(${JSON.stringify(f)}, { closeConnection: () => new Promise((res, rej) => db.close((e) => e ? rej(e) : res())) })
			console.log('RESULT ' + JSON.stringify(r)); process.exit(0)
		})`
	const out = execFileSync(process.execPath, ['-e', script], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
	assert.equal(JSON.parse(out.split('\n').find((l) => l.startsWith('RESULT ')).slice(7)).ok, true)
	const r = verificar(d3)
	assert.deepEqual([r.Marca, r.Producto, r.Clientes, r.Venta, r.DetalleVenta, r.Factura], [11, 20, 10, 9, 14, 9])
	assert.ok(r.cols.includes('labor') && r.cols.includes('tasaImpuesto'))
	assert.equal(r.historial.length, 9)
	assert.ok(r.ventas.every((v) => v.labor === 0 && v.tasaImpuesto === null))
	assert.equal(r.integrity, 'ok')
})
