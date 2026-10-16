const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shoptrack-cfg-'))
process.chdir(tmp) // la configuración se guarda en ./data
const registerGeneralIPC = require('../backend/ipcs/general.ipc')
const fs2 = require('fs')

test.after(() => {
	process.chdir(ROOT)
	fs2.rmSync(tmp, { recursive: true, force: true })
})

function fakeVentana({ destruida = false, contenidoDestruido = false, falla = false } = {}) {
	const enviados = []
	return {
		enviados,
		isDestroyed: () => destruida,
		webContents: {
			isDestroyed: () => contenidoDestruido,
			send: (...a) => {
				if (falla) throw new Error('send falló')
				enviados.push(a)
			},
		},
	}
}

function registrar(getter) {
	const handlers = {}
	registerGeneralIPC({ handle: (n, fn) => (handlers[n] = fn) }, getter)
	return handlers
}

test('config:set y config:reset emiten config:changed a la ventana actual', async () => {
	const win = fakeVentana()
	const h = registrar(() => win)
	const r = await h['config:set'](null, { nombre: 'Empresa X' })
	assert.equal(r.ok, true)
	assert.equal(win.enviados.length, 1)
	assert.equal(win.enviados[0][0], 'config:changed')
	assert.equal(win.enviados[0][1].nombre, 'Empresa X')
	const rr = await h['config:reset']()
	assert.equal(rr.ok, true)
	assert.equal(win.enviados.length, 2)
	assert.equal(win.enviados[1][1].nombre, 'Mi Empresa')
})

test('config:get no emite eventos', async () => {
	const win = fakeVentana()
	const h = registrar(() => win)
	assert.equal((await h['config:get']()).ok, true)
	assert.equal(win.enviados.length, 0)
})

test('La ventana se resuelve en cada llamada: registro previo a la creación y reapertura', async () => {
	let actual = null // aún no existe en el momento de registrar
	const h = registrar(() => actual)
	assert.equal((await h['config:set'](null, { nombre: 'A' })).ok, true) // sin ventana: no falla

	const w1 = (actual = fakeVentana())
	await h['config:set'](null, { nombre: 'B' })
	assert.equal(w1.enviados.length, 1)

	actual = null // ventana cerrada
	assert.equal((await h['config:set'](null, { nombre: 'C' })).ok, true)

	const w2 = (actual = fakeVentana()) // ventana reabierta
	await h['config:set'](null, { nombre: 'D' })
	assert.equal(w2.enviados.length, 1)
	assert.equal(w1.enviados.length, 1)
})

test('Ventana o webContents destruidos, o send que falla: config se guarda y no hay error', async () => {
	for (const opts of [{ destruida: true }, { contenidoDestruido: true }, { falla: true }]) {
		const win = fakeVentana(opts)
		const h = registrar(() => win)
		const r = await h['config:set'](null, { nombre: 'Z' })
		assert.equal(r.ok, true, JSON.stringify(opts))
		assert.equal(win.enviados.length, 0)
	}
})

test('Sin getter (valor por defecto) tampoco falla', async () => {
	const h = registrar(undefined)
	assert.equal((await h['config:set'](null, { nombre: 'Q' })).ok, true)
})

test('Cada registro añade cada canal una sola vez (sin duplicados)', () => {
	const canales = []
	registerGeneralIPC({ handle: (n) => canales.push(n) }, () => null)
	assert.equal(new Set(canales).size, canales.length)
	assert.ok(canales.includes('config:changed') === false)
})
