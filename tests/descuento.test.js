const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const zlib = require('zlib')

const ROOT = path.join(__dirname, '..')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shoptrack-desc-'))
process.chdir(tmp) // datos y configuración aislados en ./data

const electronPath = require.resolve('electron')
require.cache[electronPath] = {
	id: electronPath,
	filename: electronPath,
	loaded: true,
	exports: { shell: { openPath: async () => '' } },
}

const money = require('../backend/services/money-utils')
const PDFService = require('../backend/services/pdf-service')

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
		for (const arr of content.matchAll(/\[([^\]]*)\]\s*TJ/g)) {
			out.push([...arr[1].matchAll(/<([0-9a-fA-F]+)>/g)].map((h) => Buffer.from(h[1], 'hex').toString('latin1')).join(''))
		}
		for (const h of content.matchAll(/<([0-9a-fA-F]+)>\s*Tj/g)) out.push(Buffer.from(h[1], 'hex').toString('latin1'))
	}
	return out.join('\n')
}

const run = (db, sql, p = []) => new Promise((res, rej) => db.run(sql, p, function (e) { e ? rej(e) : res(this) }))
const all = (db, sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => (e ? rej(e) : res(r))))
const cb = (fn, ...a) => new Promise((res, rej) => fn(...a, (e, r) => (e ? rej(e) : res(r))))

let db, ventaCtrl, facturaCtrl, configService, handlers, idCliente, idProducto, seq = 0

test.before(async () => {
	db = require('../backend/db/initDatabase')
	await db.ready
	ventaCtrl = require('../backend/controllers/venta-controller')
	facturaCtrl = require('../backend/controllers/factura-controller')
	configService = require('../backend/services/config-service')
	require('../backend/services/file-opener').configurarApertura(async () => ({ ok: true }))
	handlers = {}
	require('../backend/ipcs/factura.ipc')({ handle: (n, fn) => (handlers[n] = fn) })
	configService.updateConfig({ ivaPredeterminado: 0.0825, idiomaFactura: 'es', zonaHoraria: 'UTC' })
	await run(db, "INSERT INTO Clientes (nombre) VALUES ('Cliente')")
	idCliente = (await all(db, 'SELECT id FROM Clientes'))[0].id
	await run(db, "INSERT OR IGNORE INTO Marca (nombre) VALUES ('M')")
	await run(db, "INSERT INTO Producto (NroParte, Descripcion, Cantidad, Precio, Tasas, marcaId) VALUES ('D-1','Producto',100000,100,0.21,1)")
	idProducto = (await all(db, "SELECT id FROM Producto WHERE NroParte='D-1'"))[0].id
})

test.after(() => {
	process.chdir(ROOT)
	fs.rmSync(tmp, { recursive: true, force: true })
})

// Subtotal fijo 200 (2 × 100). Importes esperados calculados a mano.
async function crearVenta({ descuentoPorcentaje, descuento = 0, labor = 0, impuestos = 16.5, total, omitirPorcentaje = false }) {
	const data = {
		idCliente, subtotal: 200, impuestos, total, descuento, labor,
		detalles: [{ idProducto, cantidad: 2, precioUnitario: 100 }],
	}
	if (!omitirPorcentaje) data.descuentoPorcentaje = descuentoPorcentaje
	const res = await cb(ventaCtrl.createWithDetails, data)
	const numeroFactura = `DSC-${++seq}`
	await cb(facturaCtrl.create, { idVenta: res.id, numeroFactura, subtotal: 200, impuestos, total })
	return res.id
}
const venta = async (id) => (await all(db, 'SELECT * FROM Venta WHERE id = ?', [id]))[0]
async function pdf(idVenta) {
	const r = await handlers['factura:generatePDF'](null, idVenta)
	assert.equal(r.ok, true, r.error)
	return pdfText(r.ruta)
}
const orden = (text, etiquetas) => {
	let desde = 0
	for (const e of etiquetas) {
		const i = text.indexOf(e, desde)
		assert.ok(i >= 0, `falta o desordenado: ${e}`)
		desde = i + e.length
	}
}

test('money-utils: porcentaje válido, inválido y redondeo del importe', () => {
	for (const v of [0, 10, 100, '', null, undefined, '12.5']) assert.equal(money.parsePorcentaje(v).ok, true, String(v))
	assert.equal(money.parsePorcentaje('').value, 0)
	for (const v of [-1, -0.01, 100.01, 101, 'abc', NaN, Infinity, true]) {
		const r = money.parsePorcentaje(v)
		assert.equal(r.ok, false, String(v))
		assert.ok(r.error)
	}
	assert.match(money.parsePorcentaje(-5).error, /negativo/)
	assert.match(money.parsePorcentaje(150).error, /100 %/)
	assert.equal(money.calcularDescuento(200, 10), 20)
	assert.equal(money.calcularDescuento(200, 0), 0)
	assert.equal(money.calcularDescuento(200, 100), 200)
	assert.equal(money.calcularDescuento(33.33, 12.5), 4.17) // 4.16625
	assert.equal(money.calcularDescuento(0.05, 10), 0.01) // medio céntimo hacia arriba
})

test('10 %: el descuento es solo sobre el subtotal (excluye Labor e impuestos)', async () => {
	// base imponible 250 → Tax 20.63; descuento 10 % de 200 = 20.00 (no 25.00); total 250.63
	const id = await crearVenta({ descuentoPorcentaje: 10, descuento: 20, labor: 50, impuestos: 20.63, total: 250.63 })
	const v = await venta(id)
	assert.deepEqual([v.descuento, v.descuentoPorcentaje, v.labor, v.impuestos, v.total], [20, 10, 50, 20.63, 250.63])
	const text = await pdf(id)
	orden(text, ['Subtotal:', 'Labor:', 'Tax (8.25%):', 'Descuento (10%):', '-$20.00', 'TOTAL:'])
	assert.ok(text.includes('$250.63'))
	// Un importe calculado sobre Labor o impuestos se rechaza
	await assert.rejects(crearVenta({ descuentoPorcentaje: 10, descuento: 25, labor: 50, impuestos: 20.63, total: 245.63 }), /no coincide con el 10%/)
})

test('0 %: se guarda 0, no hay línea de descuento y el total no cambia', async () => {
	const id = await crearVenta({ descuentoPorcentaje: 0, descuento: 0, total: 216.5 })
	const v = await venta(id)
	assert.deepEqual([v.descuento, v.descuentoPorcentaje, v.total], [0, 0, 216.5])
	const text = await pdf(id)
	assert.ok(!text.includes('Descuento'))
	assert.ok(text.includes('$216.50'))
})

test('100 %: descuento igual al subtotal; queda Labor + impuestos', async () => {
	const id = await crearVenta({ descuentoPorcentaje: 100, descuento: 200, labor: 50, impuestos: 20.63, total: 70.63 })
	const v = await venta(id)
	assert.deepEqual([v.descuento, v.descuentoPorcentaje, v.total], [200, 100, 70.63])
	const text = await pdf(id)
	assert.ok(text.includes('Descuento (100%):') && text.includes('-$200.00') && text.includes('$70.63'))
})

test('Negativo, mayor que 100 o no numérico: se rechaza y no se guarda la venta', async () => {
	const antes = (await all(db, 'SELECT COUNT(*) n FROM Venta'))[0].n
	const stock = (await all(db, 'SELECT Cantidad c FROM Producto WHERE id=?', [idProducto]))[0].c
	for (const [pct, re] of [[-10, /negativo/], [100.01, /100 %/], [150, /100 %/], ['abc', /porcentaje válido/]]) {
		await assert.rejects(crearVenta({ descuentoPorcentaje: pct, descuento: 0, total: 216.5 }), re, String(pct))
	}
	assert.equal((await all(db, 'SELECT COUNT(*) n FROM Venta'))[0].n, antes)
	assert.equal((await all(db, 'SELECT Cantidad c FROM Producto WHERE id=?', [idProducto]))[0].c, stock)
})

test('Venta antigua o sin porcentaje: importe tal cual, porcentaje NULL y PDF sin porcentaje inventado', async () => {
	const id = await crearVenta({ omitirPorcentaje: true, descuento: 10, total: 206.5 })
	const v = await venta(id)
	assert.deepEqual([v.descuento, v.descuentoPorcentaje, v.total], [10, null, 206.5])
	const text = await pdf(id)
	assert.ok(text.includes('Descuento:') && text.includes('-$10.00'))
	assert.ok(!/Descuento \(/.test(text))
	// Actualizar una venta histórica no inventa un porcentaje
	await cb(ventaCtrl.update, id, { idCliente, subtotal: 200, impuestos: 16.5, total: 206.5, descuento: 10, labor: 0 })
	assert.equal((await venta(id)).descuentoPorcentaje, null)
})

test('update conserva y valida el porcentaje guardado', async () => {
	const id = await crearVenta({ descuentoPorcentaje: 10, descuento: 20, total: 196.5 })
	// importe distinto del 10 % guardado: se rechaza
	await assert.rejects(cb(ventaCtrl.update, id, { idCliente, subtotal: 200, impuestos: 16.5, total: 191.5, descuento: 25 }), /no coincide con el 10%/)
	await cb(ventaCtrl.update, id, { idCliente, subtotal: 200, impuestos: 16.5, total: 196.5, descuento: 20 })
	assert.deepEqual([(await venta(id)).descuento, (await venta(id)).descuentoPorcentaje], [20, 10])
})

test('Historial: la consulta paginada devuelve importe y porcentaje (NULL en ventas antiguas)', async () => {
	const rows = await cb((c) => require('../backend/controllers/detalleVenta-controller').getPaginated(500, 0, c))
	assert.ok(rows.length > 3)
	assert.ok(rows.some((r) => r.descuentoPorcentaje === 10 && r.descuento === 20))
	assert.ok(rows.some((r) => r.descuentoPorcentaje === null && r.descuento === 10))
})

test('Factura PDF: fecha y hora de emisión (SQLite en UTC, zona horaria configurada)', async () => {
	assert.equal(PDFService.formatearFecha('2026-03-05 14:07:00', 'UTC'), '03/05/2026, 14:07')
	assert.equal(PDFService.formatearFecha('2026-03-05T14:07:00.000Z', 'America/Chicago'), '03/05/2026, 08:07')
	assert.equal(PDFService.formatearFecha('no es una fecha'), 'no es una fecha')
	const id = await crearVenta({ descuentoPorcentaje: 0, total: 216.5 })
	await run(db, "UPDATE Factura SET fechaEmision = '2026-03-05 14:07:00' WHERE idVenta = ?", [id])
	assert.ok((await pdf(id)).includes('03/05/2026, 14:07'))
})

test('Términos y condiciones: solo se imprimen si la configuración tiene texto', async () => {
	const sin = await crearVenta({ descuentoPorcentaje: 0, total: 216.5 })
	assert.ok(!(await pdf(sin)).includes('Términos y condiciones'))
	configService.updateConfig({ terminosCondiciones: 'Texto de prueba de los términos.' })
	try {
		const con = await crearVenta({ descuentoPorcentaje: 0, total: 216.5 })
		const text = await pdf(con)
		orden(text, ['Términos y condiciones', 'Texto de prueba de los términos.'])
	} finally {
		configService.updateConfig({ terminosCondiciones: '' })
	}
})
