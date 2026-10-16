// Ejecutar con: npm test  (node --test). Usa una BD y carpeta de datos temporales.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const zlib = require('zlib')
const { execFileSync } = require('child_process')
const sqlite3 = require('sqlite3')

const ROOT = path.join(__dirname, '..')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shoptrack-test-'))
const dataDir = path.join(tmp, 'data')
const dbFile = path.join(dataDir, 'shoptrack.db')
fs.mkdirSync(dataDir, { recursive: true })

// Evita depender de Electron en Node puro
const electronPath = require.resolve('electron')
require.cache[electronPath] = {
	id: electronPath,
	filename: electronPath,
	loaded: true,
	exports: { shell: { openPath: async () => '' } },
}

const run = (db, sql, params = []) =>
	new Promise((resolve, reject) =>
		db.run(sql, params, function (err) {
			err ? reject(err) : resolve(this)
		}),
	)
const all = (db, sql, params = []) =>
	new Promise((resolve, reject) =>
		db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))),
	)
const cb = (fn, ...args) =>
	new Promise((resolve, reject) =>
		fn(...args, (err, res) => (err ? reject(err) : resolve(res))),
	)

// Texto de un PDF de pdfkit en orden de dibujo (streams deflate + strings hex/literal)
function pdfText(file) {
	const buf = fs.readFileSync(file)
	const out = []
	const re = /stream\r?\n/g
	let m
	while ((m = re.exec(buf.toString('latin1')))) {
		const start = m.index + m[0].length
		const end = buf.indexOf('endstream', start)
		let content
		try {
			content = zlib.inflateSync(buf.subarray(start, end)).toString('latin1')
		} catch {
			continue
		}
		// Un TJ = una cadena de texto con kerning entre fragmentos hex
		for (const arr of content.matchAll(/\[([^\]]*)\]\s*TJ/g)) {
			out.push(
				[...arr[1].matchAll(/<([0-9a-fA-F]+)>/g)]
					.map((h) => Buffer.from(h[1], 'hex').toString('latin1'))
					.join(''),
			)
		}
		for (const h of content.matchAll(/<([0-9a-fA-F]+)>\s*Tj/g)) {
			out.push(Buffer.from(h[1], 'hex').toString('latin1'))
		}
		for (const l of content.matchAll(/\(((?:[^()\\]|\\.)*)\)\s*Tj/g)) {
			out.push(l[1])
		}
	}
	return out.join('\n')
}

let db, ventaCtrl, facturaCtrl, configService, handlers
let idCliente, idProducto
const LEGACY_VENTA = 1

const setRate = (fraccion) => configService.updateConfig({ ivaPredeterminado: fraccion })

test.before(async () => {
	// BD "antigua": esquema sin labor ni tasaImpuesto
	const sql = fs
		.readFileSync(path.join(ROOT, 'backend/db/database.sql'), 'utf8')
		.replace(/^labor REAL NOT NULL DEFAULT 0,\r?\n/m, '')
		.replace(/^tasaImpuesto REAL,\r?\n/m, '')
	assert.ok(!/labor|tasaImpuesto/.test(sql.split('INSERT INTO Marca')[0]))
	const legacy = new sqlite3.Database(dbFile)
	await new Promise((res, rej) => legacy.exec(sql, (e) => (e ? rej(e) : res())))
	await run(legacy, "INSERT INTO Clientes (nombre) VALUES ('Cliente legado')")
	await run(
		legacy,
		'INSERT INTO Venta (idCliente, subtotal, impuestos, total, descuento) VALUES (1, 100, 21, 121, 0)',
	)
	await run(
		legacy,
		"INSERT INTO Factura (idVenta, numeroFactura, subtotal, impuestos, total, metodoPago) VALUES (1, 'OLD-0001', 100, 21, 121, 'efectivo')",
	)
	await new Promise((res) => legacy.close(res))

	process.chdir(tmp)
	db = require('../backend/db/initDatabase')
	await db.ready
	ventaCtrl = require('../backend/controllers/venta-controller')
	facturaCtrl = require('../backend/controllers/factura-controller')
	configService = require('../backend/services/config-service')
	const registerFacturaIPC = require('../backend/ipcs/factura.ipc')
	require('../backend/services/file-opener').configurarApertura(async () => ({ ok: true }))
	handlers = {}
	registerFacturaIPC({ handle: (name, fn) => (handlers[name] = fn) })

	setRate(0.0825)

	await run(db, "INSERT INTO Clientes (nombre) VALUES ('Cliente test')")
	idCliente = (await all(db, 'SELECT id FROM Clientes ORDER BY id DESC LIMIT 1'))[0].id
	await run(db, "INSERT OR IGNORE INTO Marca (nombre) VALUES ('MarcaTest')")
	// Tasas propia del producto (21 %) debe ser ignorada: manda la configuración
	await run(
		db,
		"INSERT INTO Producto (NroParte, Descripcion, Cantidad, Precio, Tasas, marcaId) VALUES ('T-1', 'Producto de prueba', 100000, 100, 0.21, 1)",
	)
	idProducto = (await all(db, "SELECT id FROM Producto WHERE NroParte='T-1'"))[0].id
})

test.after(() => {
	process.chdir(ROOT)
	fs.rmSync(tmp, { recursive: true, force: true })
})

let seq = 0
// Los importes esperados se pasan calculados a mano (independientes del código bajo prueba)
async function crearVenta({
	items = [{ precio: 100, cantidad: 1 }],
	labor,
	descuento = 0,
	subtotal,
	impuestos,
	total,
	tasaImpuesto,
}) {
	const data = {
		idCliente,
		subtotal,
		impuestos,
		total,
		descuento,
		motivoDescuento: '',
		detalles: items.map((i) => ({
			idProducto,
			cantidad: i.cantidad,
			precioUnitario: i.precio,
			tasaAplicada: 0.21, // el backend la sustituye por la configurada
		})),
	}
	if (labor !== undefined) data.labor = labor
	if (tasaImpuesto !== undefined) data.tasaImpuesto = tasaImpuesto
	const res = await cb(ventaCtrl.createWithDetails, data)
	const numeroFactura = `TST-${++seq}`
	await cb(facturaCtrl.create, { idVenta: res.id, numeroFactura, subtotal, impuestos, total })
	return { idVenta: res.id, numeroFactura }
}

const venta = async (id) => (await all(db, 'SELECT * FROM Venta WHERE id = ?', [id]))[0]

async function pdfHistorial(idVenta) {
	const res = await handlers['factura:generatePDF'](null, idVenta)
	assert.equal(res.ok, true, res.error)
	return pdfText(res.ruta)
}

// Las etiquetas deben aparecer en este orden en el texto del PDF
function assertOrden(text, etiquetas) {
	let desde = 0
	for (const e of etiquetas) {
		const i = text.indexOf(e, desde)
		assert.ok(i >= 0, `falta o desordenado: ${e}`)
		desde = i + e.length
	}
}

test('Migración: añade labor y tasaImpuesto sin perder datos; idempotente', async () => {
	const cols = await all(db, 'PRAGMA table_info(Venta)')
	assert.equal(cols.find((c) => c.name === 'labor').dflt_value, '0')
	assert.ok(cols.some((c) => c.name === 'tasaImpuesto'))
	const old = await venta(LEGACY_VENTA)
	assert.equal(old.total, 121)
	assert.equal(old.labor, 0)
	assert.equal(old.tasaImpuesto, null)

	const script = `
		const db = require(${JSON.stringify(path.join(ROOT, 'backend/db/initDatabase'))})
		db.ready.then(() => db.all('PRAGMA table_info(Venta)', (e, cols) => {
			if (e) throw e
			console.log(cols.filter(c => ['labor','tasaImpuesto'].includes(c.name)).length)
			process.exit(0)
		}))`
	const out = execFileSync(process.execPath, ['-e', script], { cwd: tmp, encoding: 'utf8' })
	assert.equal(out.trim().split('\n').pop(), '2')
})

test('Tasa 8,25 % y Labor 0: Tax 8.25, total 108.25, sin línea Labor', async () => {
	setRate(0.0825)
	const { idVenta } = await crearVenta({ labor: 0, subtotal: 100, impuestos: 8.25, total: 108.25 })
	const v = await venta(idVenta)
	assert.deepEqual(
		[v.subtotal, v.labor, v.impuestos, v.total, v.tasaImpuesto],
		[100, 0, 8.25, 108.25, 0.0825],
	)
	const det = (await all(db, 'SELECT * FROM DetalleVenta WHERE idVenta = ?', [idVenta]))[0]
	assert.equal(det.tasaAplicada, 0.0825) // no la 21 % del producto
	assert.equal(det.totalLinea, 108.25)
	const text = await pdfHistorial(idVenta)
	assert.ok(!text.includes('Labor'))
	assert.ok(text.includes('Tax (8.25%):'))
	assert.ok(text.includes('$8.25') && text.includes('$108.25'))
})

test('Labor > 0 con 8,25 %: base 130, Tax 10.73 (medio céntimo hacia arriba), total 140.73', async () => {
	setRate(0.0825)
	const { idVenta } = await crearVenta({ labor: 30, subtotal: 100, impuestos: 10.73, total: 140.73 })
	const v = await venta(idVenta)
	assert.deepEqual([v.labor, v.impuestos, v.total], [30, 10.73, 140.73])
	const text = await pdfHistorial(idVenta)
	assertOrden(text, ['Subtotal:', 'Labor:', 'Tax (8.25%):', 'Descuento:', 'TOTAL:'])
	assert.equal(text.split('Labor').length - 1, 1)
	assert.ok(text.includes('$30.00') && text.includes('$10.73') && text.includes('$140.73'))
	assert.ok(text.includes('$100.00')) // subtotal de productos sin Labor
})

test('Labor y descuento: total = 100 + 30 + 10.73 - 10 = 130.73', async () => {
	setRate(0.0825)
	const { idVenta } = await crearVenta({
		labor: 30,
		descuento: 10,
		subtotal: 100,
		impuestos: 10.73,
		total: 130.73,
	})
	const text = await pdfHistorial(idVenta)
	assertOrden(text, ['Subtotal:', 'Labor:', 'Tax (8.25%):', 'Descuento:', '-$10.00', 'TOTAL:'])
	assert.ok(text.includes('$130.73'))
})

test('Decimales y redondeo: 3 × 19.99 + Labor 12.34 al 8,25 %', async () => {
	setRate(0.0825)
	// base 72.31 × 0.0825 = 5.965575 → 5.97; total 59.97 + 12.34 + 5.97 = 78.28
	const { idVenta } = await crearVenta({
		items: [{ precio: 19.99, cantidad: 3 }],
		labor: 12.34,
		subtotal: 59.97,
		impuestos: 5.97,
		total: 78.28,
	})
	const v = await venta(idVenta)
	assert.deepEqual([v.subtotal, v.impuestos, v.total], [59.97, 5.97, 78.28])
	assert.ok((await pdfHistorial(idVenta)).includes('$78.28'))
})

test('Sin doble impuesto: se rechaza el IVA por producto y el IVA mal aplicado', async () => {
	setRate(0.0825)
	// 21 % del producto (21.00) en lugar de la tasa configurada
	await assert.rejects(crearVenta({ subtotal: 100, impuestos: 21, total: 121 }), /impuestos/i)
	// Tax sobre subtotal sin Labor (olvida la base imponible)
	await assert.rejects(
		crearVenta({ labor: 30, subtotal: 100, impuestos: 8.25, total: 138.25 }),
		/impuestos/i,
	)
	// Impuesto sumado dos veces al total
	await assert.rejects(crearVenta({ subtotal: 100, impuestos: 8.25, total: 116.5 }), /total/i)
})

test('Cambio de tasa en Configuración: nuevas ventas usan la nueva; las antiguas conservan la suya', async () => {
	setRate(0.0825)
	const antigua = await crearVenta({ labor: 30, subtotal: 100, impuestos: 10.73, total: 140.73 })

	setRate(0.1)
	const nueva = await crearVenta({ labor: 30, subtotal: 100, impuestos: 13, total: 143 })
	assert.equal((await venta(nueva.idVenta)).tasaImpuesto, 0.1)
	const textoNueva = await pdfHistorial(nueva.idVenta)
	assert.ok(textoNueva.includes('Tax (10%):') && textoNueva.includes('$143.00'))

	// Regenerar la antigua con la configuración ya cambiada
	const textoAntigua = await pdfHistorial(antigua.idVenta)
	assert.ok(textoAntigua.includes('Tax (8.25%):'))
	assert.ok(textoAntigua.includes('$10.73') && textoAntigua.includes('$140.73'))

	// Cliente con tasa obsoleta
	await assert.rejects(
		crearVenta({ subtotal: 100, impuestos: 8.25, total: 108.25, tasaImpuesto: 0.0825 }),
		/tasa de impuestos/i,
	)
	setRate(0.0825)
})

test('Labor vacío/omitido = 0; negativo o inválido se rechaza sin guardar', async () => {
	setRate(0.0825)
	for (const labor of ['', undefined, null]) {
		const { idVenta } = await crearVenta({ labor, subtotal: 100, impuestos: 8.25, total: 108.25 })
		assert.equal((await venta(idVenta)).labor, 0)
	}
	const antes = (await all(db, 'SELECT COUNT(*) n FROM Venta'))[0].n
	const stock = (await all(db, 'SELECT Cantidad c FROM Producto WHERE id=?', [idProducto]))[0].c
	for (const labor of [-5, '-0.01', 'abc', NaN, Infinity, true]) {
		await assert.rejects(
			crearVenta({ labor, subtotal: 100, impuestos: 8.25, total: 108.25 }),
			/Labor/,
			`labor=${String(labor)}`,
		)
	}
	assert.equal((await all(db, 'SELECT COUNT(*) n FROM Venta'))[0].n, antes)
	assert.equal((await all(db, 'SELECT Cantidad c FROM Producto WHERE id=?', [idProducto]))[0].c, stock)
})

test('Descuento mayor que el total, subtotal falso y factura discordante se rechazan', async () => {
	setRate(0.0825)
	await assert.rejects(
		crearVenta({ descuento: 500, subtotal: 100, impuestos: 8.25, total: -391.75 }),
		/descuento/i,
	)
	await assert.rejects(crearVenta({ subtotal: 50, impuestos: 4.13, total: 54.13 }), /subtotal/i)
	const res = await cb(ventaCtrl.createWithDetails, {
		idCliente,
		subtotal: 100,
		impuestos: 8.25,
		total: 108.25,
		detalles: [{ idProducto, cantidad: 1, precioUnitario: 100 }],
	})
	await assert.rejects(
		cb(facturaCtrl.create, {
			idVenta: res.id,
			numeroFactura: 'BAD-1',
			subtotal: 100,
			impuestos: 8.25,
			total: 999,
		}),
		/no coinciden/,
	)
})

test('Persistencia: otra conexión lee labor, tasa y total; la factura regenerada coincide', async () => {
	setRate(0.0825)
	const { idVenta } = await crearVenta({ labor: 30, subtotal: 100, impuestos: 10.73, total: 140.73 })
	const script = `
		const sqlite3 = require(${JSON.stringify(path.join(ROOT, 'node_modules/sqlite3'))})
		const d = new sqlite3.Database(${JSON.stringify(dbFile)})
		d.get('SELECT labor, tasaImpuesto, impuestos, total FROM Venta WHERE id = ?', [${idVenta}], (e, r) => {
			if (e) throw e
			console.log(JSON.stringify(r))
		})`
	const out = execFileSync(process.execPath, ['-e', script], { encoding: 'utf8' })
	assert.deepEqual(JSON.parse(out.trim().split('\n').pop()), {
		labor: 30,
		tasaImpuesto: 0.0825,
		impuestos: 10.73,
		total: 140.73,
	})

	// Ruta Nueva Venta (datos del frontend) y ruta historial (datos de SQLite): mismo resumen
	const v = await venta(idVenta)
	const [fac] = await cb(facturaCtrl.getByVentaId, idVenta)
	const hist = await cb((c) =>
		require('../backend/controllers/detalleVenta-controller').getPaginated(1000, 0, c),
	)
	assert.equal(hist.find((r) => r.idVenta === idVenta).labor, 30)
	const textoHistorial = await pdfHistorial(idVenta)
	const res = await handlers['factura:generarPDF'](null, {
		factura: {
			numeroFactura: fac.numeroFactura,
			fechaEmision: new Date().toISOString(),
			subtotal: v.subtotal,
			impuestos: v.impuestos,
			descuento: v.descuento,
			labor: v.labor,
			tasaImpuesto: v.tasaImpuesto,
			total: v.total,
			metodoPago: 'efectivo',
		},
		cliente: { nombre: 'Cliente test' },
		detalles: [{ nroParte: 'T-1', descripcion: 'x', cantidad: 1, precioUnitario: 100, tasaAplicada: 0.0825 }],
	})
	assert.equal(res.ok, true, res.error)
	const resumen = (t) => t.slice(t.indexOf('Subtotal:'))
	assert.equal(resumen(pdfText(res.ruta)), resumen(textoHistorial))
	assert.ok(resumen(textoHistorial).includes('$140.73'))
})

test('Factura antigua: se regenera con su total y su tasa efectiva, ignorando la configuración actual', async () => {
	setRate(0.0825)
	const v = await venta(LEGACY_VENTA)
	assert.equal(v.tasaImpuesto, null)
	const text = await pdfHistorial(LEGACY_VENTA)
	assert.ok(!text.includes('Labor'))
	assert.ok(text.includes('Tax (21%):'), 'tasa efectiva 21/100, no la 8.25 actual')
	assert.ok(!text.includes('8.25'))
	assert.ok(text.includes('$21.00') && text.includes('$121.00'))
	assert.equal((await venta(LEGACY_VENTA)).total, 121)
})

test('La tasa no está escrita en el código y se interpreta como fracción', () => {
	for (const f of [
		'assets/js/nueva_venta.js',
		'backend/controllers/venta-controller.js',
		'backend/services/pdf-service.js',
		'backend/services/money-utils.js',
	]) {
		const src = fs.readFileSync(path.join(ROOT, f), 'utf8')
		assert.ok(!/0\.0825|8\.25/.test(src), `${f} contiene la tasa literal`)
	}
	setRate(0.0825)
	assert.equal(configService.getTasaImpuesto(), 0.0825)
	configService.updateConfig({ ivaPredeterminado: 8.25 }) // porcentaje guardado por error
	assert.throws(() => configService.getTasaImpuesto(), /no es válida/)
	setRate(0.0825)
})

test('money-utils: redondeo sin ruido de coma flotante', () => {
	const { calcularImpuesto, calcularTotal, parseMonto } = require('../backend/services/money-utils')
	assert.equal(calcularImpuesto(130, 0, 0.0825), 10.73)
	assert.equal(calcularImpuesto(100, 30, 0.0825), 10.73)
	assert.equal(calcularImpuesto(0.1, 0.2, 0.1), 0.03)
	assert.equal(calcularImpuesto(100, 0, 0), 0)
	assert.equal(calcularTotal({ subtotal: 0.1, impuestos: 0.2, labor: 0.3 }), 0.6)
	assert.deepEqual(parseMonto('', 'x'), { ok: true, value: 0 })
	assert.equal(parseMonto('-1', 'x').ok, false)
})
