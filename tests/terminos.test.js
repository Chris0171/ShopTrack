const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const zlib = require('zlib')
const { execFileSync } = require('child_process')
const sqlite3 = require('sqlite3')

const ROOT = path.join(__dirname, '..')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shoptrack-terms-'))
process.chdir(tmp) // configuración y base de datos aisladas en ./data

const electronPath = require.resolve('electron')
require.cache[electronPath] = { id: electronPath, filename: electronPath, loaded: true, exports: { shell: {}, dialog: {} } }

function pdfInfo(file) {
	const buf = fs.readFileSync(file)
	const out = []
	const re = /stream\r?\n/g
	let m
	while ((m = re.exec(buf.toString('latin1')))) {
		const st = m.index + m[0].length
		const en = buf.indexOf('endstream', st)
		let c
		try { c = zlib.inflateSync(buf.subarray(st, en)).toString('latin1') } catch { continue }
		for (const a of c.matchAll(/\[([^\]]*)\]\s*TJ/g)) out.push([...a[1].matchAll(/<([0-9a-fA-F]+)>/g)].map((h) => Buffer.from(h[1], 'hex').toString('latin1')).join(''))
		for (const h of c.matchAll(/<([0-9a-fA-F]+)>\s*Tj/g)) out.push(Buffer.from(h[1], 'hex').toString('latin1'))
	}
	return { text: out.join('\n'), lineas: out, paginas: (buf.toString('latin1').match(/\/Type \/Page(?!s)/g) || []).length }
}
const run = (db, sql, p = []) => new Promise((res, rej) => db.run(sql, p, function (e) { e ? rej(e) : res(this) }))
const all = (db, sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => (e ? rej(e) : res(r))))
const cb = (fn, ...a) => new Promise((res, rej) => fn(...a, (e, r) => (e ? rej(e) : res(r))))

let db, ventaCtrl, facturaCtrl, cfg, handlers, general, idCliente, idProducto, seq = 0

test.before(async () => {
	db = require('../backend/db/initDatabase')
	await db.ready
	ventaCtrl = require('../backend/controllers/venta-controller')
	facturaCtrl = require('../backend/controllers/factura-controller')
	cfg = require('../backend/services/config-service')
	require('../backend/services/file-opener').configurarApertura(async () => ({ ok: true }))
	handlers = {}
	const ipc = { handle: (n, fn) => (handlers[n] = fn) }
	require('../backend/ipcs/factura.ipc')(ipc)
	require('../backend/ipcs/general.ipc')(ipc, () => null)
	cfg.updateConfig({ ivaPredeterminado: 0.0825, idiomaFactura: 'es', zonaHoraria: 'UTC' })
	await run(db, "INSERT INTO Clientes (nombre) VALUES ('Cliente')")
	idCliente = (await all(db, 'SELECT id FROM Clientes'))[0].id
	await run(db, "INSERT OR IGNORE INTO Marca (nombre) VALUES ('M')")
	await run(db, "INSERT INTO Producto (NroParte, Descripcion, Cantidad, Precio, Tasas, marcaId) VALUES ('T-1','Producto',100000,100,0.21,1)")
	idProducto = (await all(db, 'SELECT id FROM Producto'))[0].id
})
test.after(() => { process.chdir(ROOT); fs.rmSync(tmp, { recursive: true, force: true }) })

// Venta de 100 + 8.25 % = 108.25 y su factura (los términos se capturan al crearla)
async function nuevaFactura() {
	const v = await cb(ventaCtrl.createWithDetails, { idCliente, subtotal: 100, impuestos: 8.25, total: 108.25, detalles: [{ idProducto, cantidad: 1, precioUnitario: 100 }] })
	const numeroFactura = `TC-${++seq}`
	await cb(facturaCtrl.create, { idVenta: v.id, numeroFactura, subtotal: 100, impuestos: 8.25, total: 108.25 })
	return { idVenta: v.id, numeroFactura }
}
const pdfHistorial = async (idVenta) => {
	const r = await handlers['factura:generatePDF'](null, idVenta)
	assert.equal(r.ok, true, r.error)
	return pdfInfo(r.ruta)
}
const guardar = async (texto) => assert.equal((await handlers['config:set'](null, { terminosCondiciones: texto })).ok, true)
const leerEnOtroProceso = () => {
	const out = execFileSync(process.execPath, ['-e', `process.chdir(${JSON.stringify(tmp)});console.log('RESULT '+JSON.stringify(require(${JSON.stringify(path.join(ROOT, 'backend/services/config-service'))}).getConfig()))`], { encoding: 'utf8' })
	return JSON.parse(out.split('\n').find((l) => l.startsWith('RESULT ')).slice(7))
}

test('Guardar, modificar, vaciar y recuperar los términos tras reiniciar (otro proceso)', async () => {
	await guardar('Primera versión')
	assert.equal(leerEnOtroProceso().terminosCondiciones, 'Primera versión')
	await guardar('Segunda versión\ncon dos líneas')
	assert.equal(leerEnOtroProceso().terminosCondiciones, 'Segunda versión\ncon dos líneas')
	await guardar('')
	const c = leerEnOtroProceso()
	assert.equal(c.terminosCondiciones, '')
	// El resto de la configuración no se altera al guardar solo los términos
	assert.deepEqual([c.ivaPredeterminado, c.idiomaFactura, c.zonaHoraria], [0.0825, 'es', 'UTC'])
})

test('Vacío: la factura no muestra el apartado', async () => {
	await guardar('')
	const f = await nuevaFactura()
	assert.equal((await all(db, 'SELECT terminos FROM Factura WHERE numeroFactura = ?', [f.numeroFactura]))[0].terminos, '')
	assert.ok(!(await pdfHistorial(f.idVenta)).text.includes('Términos y condiciones'))
})

test('Nueva factura: muestra los términos con saltos de línea, después del total', async () => {
	await guardar('Primera línea\nSegunda línea\n\nTercera línea tras un salto doble')
	const f = await nuevaFactura()
	const { lineas } = await pdfHistorial(f.idVenta)
	const pos = (t) => lineas.findIndex((l) => l.includes(t))
	for (const t of ['TOTAL:', 'Términos y condiciones', 'Primera línea', 'Segunda línea', 'Tercera línea tras un salto doble']) assert.ok(pos(t) >= 0, t)
	assert.ok(pos('TOTAL:') < pos('Términos y condiciones') && pos('Términos y condiciones') < pos('Primera línea') && pos('Primera línea') < pos('Segunda línea') && pos('Segunda línea') < pos('Tercera línea'))
	assert.ok(pos('Tercera línea') < pos('Gracias') || pos('Gracias') === -1) // antes del pie
})

test('Texto extenso: se ajusta al ancho y continúa en otra página', async () => {
	const largo = Array.from({ length: 100 }, (_, i) => `Cláusula ${i + 1}: texto de prueba para varias páginas.`).join('\n')
	assert.ok(largo.length <= 5000)
	await guardar(largo)
	const f = await nuevaFactura()
	const r = await pdfHistorial(f.idVenta)
	assert.ok(r.paginas > 1, `páginas: ${r.paginas}`)
	assert.ok(r.text.includes('Cláusula 1:') && r.text.includes('Cláusula 100:'))
	const corto = await (async () => { await guardar('Corto'); return pdfHistorial((await nuevaFactura()).idVenta) })()
	assert.equal(corto.paginas, 1)
})

test('Las facturas emitidas conservan sus términos aunque cambie la configuración (ambas rutas de PDF)', async () => {
	await guardar('Términos V1')
	const a = await nuevaFactura()
	await guardar('Términos V2 distintos')
	const regenerada = await pdfHistorial(a.idVenta)
	assert.ok(regenerada.text.includes('Términos V1') && !regenerada.text.includes('V2'))
	// Ruta de Nueva Venta (datos del frontend) para la misma factura
	const [fac] = await cb(facturaCtrl.getByVentaId, a.idVenta)
	const r = await handlers['factura:generarPDF'](null, {
		factura: { numeroFactura: a.numeroFactura, fechaEmision: new Date().toISOString(), subtotal: 100, impuestos: 8.25, total: 108.25, metodoPago: 'efectivo' },
		cliente: { nombre: 'Cliente' }, detalles: [{ nroParte: 'T-1', descripcion: 'x', cantidad: 1, precioUnitario: 100, tasaAplicada: 0.0825 }],
	})
	assert.equal(r.ok, true, r.error)
	const info = pdfInfo(r.ruta)
	assert.ok(info.text.includes('Términos V1') && !info.text.includes('V2'))
	assert.equal(fac.terminos, 'Términos V1')
	// Y una factura nueva ya usa la versión vigente
	assert.ok((await pdfHistorial((await nuevaFactura()).idVenta)).text.includes('Términos V2 distintos'))
})

test('Factura anterior sin instantánea (NULL): no adquiere términos nuevos al regenerarse', async () => {
	await guardar('Términos actuales que no deben aparecer')
	const f = await nuevaFactura()
	await run(db, 'UPDATE Factura SET terminos = NULL WHERE idVenta = ?', [f.idVenta]) // equivale a una factura previa a esta versión
	assert.ok(!(await pdfHistorial(f.idVenta)).text.includes('Términos y condiciones'))
})

test('Migración: Factura.terminos se añade a una base anterior, es idempotente y conserva las facturas', async () => {
	const { aplicarEsquema, migrarFactura } = require('../backend/db/schema-init')
	const legacy = new sqlite3.Database(':memory:')
	const sql = fs.readFileSync(path.join(ROOT, 'backend/db/database.sql'), 'utf8').replace(/^terminos TEXT,\r?\n/m, '')
	assert.ok(!/terminos TEXT/.test(sql))
	await aplicarEsquema(legacy, sql)
	await run(legacy, "INSERT INTO Clientes (nombre) VALUES ('C')")
	await run(legacy, 'INSERT INTO Venta (idCliente, subtotal, impuestos, total) VALUES (1, 10, 1, 11)')
	await run(legacy, "INSERT INTO Factura (idVenta, numeroFactura, subtotal, impuestos, total) VALUES (1, 'OLD-1', 10, 1, 11)")
	await migrarFactura(legacy)
	await migrarFactura(legacy)
	const cols = (await all(legacy, 'PRAGMA table_info(Factura)')).filter((c) => c.name === 'terminos')
	assert.equal(cols.length, 1)
	assert.equal(cols[0].notnull, 0)
	assert.deepEqual((await all(legacy, 'SELECT numeroFactura, total, terminos FROM Factura')).map((r) => ({ ...r })), [{ numeroFactura: 'OLD-1', total: 11, terminos: null }])
	await new Promise((res) => legacy.close(res))
})

test('Servidor: límite de 5000 caracteres y tipo de dato (no depende del HTML)', async () => {
	await guardar('Texto válido previo')
	const set = (v) => handlers['config:set'](null, { terminosCondiciones: v })

	assert.equal((await set('a'.repeat(5000))).ok, true)
	assert.equal((await set(`  ${'b'.repeat(5000)}  \n`)).ok, true) // se recorta antes de contar
	assert.equal(cfg.getConfig().terminosCondiciones.length, 5000)

	await guardar('Se conserva')
	for (const invalido of ['c'.repeat(5001), 12345, { x: 1 }, ['a']]) {
		const r = await set(invalido)
		assert.equal(r.ok, false, String(invalido).slice(0, 20))
		assert.match(r.error, /términos y condiciones/i)
	}
	assert.equal(leerEnOtroProceso().terminosCondiciones, 'Se conserva') // un rechazo no modifica la configuración
	assert.equal((await set(null)).ok, true) // null equivale a vacío
	assert.equal(cfg.getConfig().terminosCondiciones, '')
})

test('Si falla la migración de Factura.terminos, ready se rechaza y la app no continúa', () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shoptrack-migfail-'))
	try {
		fs.mkdirSync(path.join(dir, 'data'))
		const script = `
			const sqlite3 = require(${JSON.stringify(path.join(ROOT, 'node_modules/sqlite3'))})
			const pre = new sqlite3.Database(${JSON.stringify(path.join(dir, 'data', 'shoptrack.db'))})
			pre.exec('CREATE VIEW Factura AS SELECT 1 AS id', () => pre.close(() => {
				const db = require(${JSON.stringify(path.join(ROOT, 'backend/db/initDatabase'))})
				db.ready.then(() => console.log('RESULT resuelto'), (e) => console.log('RESULT rechazado: ' + e.message)).then(() => process.exit(0))
			}))`
		const out = execFileSync(process.execPath, ['-e', script], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
		assert.match(out, /RESULT rechazado:/)
	} finally {
		fs.rmSync(dir, { recursive: true, force: true })
	}
})
