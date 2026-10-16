const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')
const { pathToFileURL } = require('url')

const ORIGINAL = '<span data-i18n="x">📄 Descargar PDF</span>'

function fakeBoton() {
	const clases = new Set(['hidden'])
	let html = ORIGINAL
	return {
		disabled: false,
		get innerHTML() {
			return html
		},
		set innerHTML(v) {
			html = v
		},
		set textContent(v) {
			html = v
		},
		classList: {
			add: (c) => clases.add(c),
			remove: (c) => clases.delete(c),
			contains: (c) => clases.has(c),
		},
	}
}

async function montar(opts = {}) {
	const { crearDescargaPDF } = await import(
		pathToFileURL(path.join(__dirname, '../assets/js/descarga_pdf.js')).href
	)
	const boton = fakeBoton()
	const avisos = []
	let generaciones = 0
	const ctl = crearDescargaPDF({
		boton,
		generar: opts.generar || (async () => (generaciones++, { ok: true, ruta: '/tmp/a.pdf' })),
		abrir: opts.abrir || (async () => ({ ok: true })),
		avisar: async (...a) => void avisos.push(a),
	})
	return { boton, ctl, avisos, generaciones: () => generaciones }
}

const estaOculto = (b) => b.classList.contains('hidden')

test('Antes de haber factura el botón está oculto y descargar avisa sin generar', async () => {
	const { boton, ctl, avisos } = await montar()
	assert.ok(estaOculto(boton))
	await ctl.descargar()
	assert.equal(avisos.length, 1)
	assert.ok(estaOculto(boton))
})

test('Éxito: muestra "Generando factura…" deshabilitado, abre el PDF y se oculta', async () => {
	let visto
	const { boton, ctl, avisos } = await montar({
		generar: async () => {
			visto = { texto: boton.innerHTML, disabled: boton.disabled }
			return { ok: true, ruta: '/tmp/a.pdf' }
		},
	})
	ctl.setVenta({ factura: {} })
	assert.ok(!estaOculto(boton))
	await ctl.descargar()
	assert.deepEqual(visto, { texto: '⏳ Generando factura…', disabled: true })
	assert.ok(estaOculto(boton))
	assert.equal(boton.disabled, false)
	assert.equal(boton.innerHTML, ORIGINAL)
	assert.equal(avisos.length, 0)
	// La factura ya se descargó: otro clic no vuelve a generar
	await ctl.descargar()
	assert.equal(avisos.length, 1)
})

for (const [nombre, opts] of [
	['generar devuelve ok:false', { generar: async () => ({ ok: false, error: 'boom' }) }],
	['generar lanza excepción', { generar: async () => { throw new Error('boom') } }],
]) {
	test(`Error al generar (${nombre}): aviso de error y botón recuperado y visible`, async () => {
		const { boton, ctl, avisos } = await montar(opts)
		ctl.setVenta({})
		await ctl.descargar()
		assert.ok(!estaOculto(boton))
		assert.equal(boton.disabled, false)
		assert.equal(boton.innerHTML, ORIGINAL)
		assert.equal(avisos.length, 1)
		assert.equal(avisos[0][2], 'error')
		assert.match(avisos[0][0], /boom/)
	})
}

for (const [nombre, abrir] of [
	['abrir devuelve ok:false', async () => ({ ok: false, error: 'sin visor' })],
	['abrir lanza excepción', async () => { throw new Error('sin visor') }],
]) {
	test(`Error al abrir (${nombre}): botón recuperado; el reintento solo reabre, sin regenerar`, async () => {
		let aperturas = 0
		const { boton, ctl, avisos, generaciones } = await montar({
			abrir: async (r) => (++aperturas === 1 ? abrir(r) : { ok: true }),
		})
		ctl.setVenta({})
		await ctl.descargar()
		assert.ok(!estaOculto(boton))
		assert.equal(boton.disabled, false)
		assert.equal(boton.innerHTML, ORIGINAL)
		assert.match(avisos[0][0], /sin visor/)
		assert.match(avisos[0][0], /se generó/) // no se presenta como fallo de generación
		await ctl.descargar() // reintento
		assert.equal(generaciones(), 1)
		assert.equal(aperturas, 2)
		assert.ok(estaOculto(boton))
	})
}

test('Nueva venta: el botón sigue oculto hasta la siguiente factura', async () => {
	const { boton, ctl } = await montar()
	ctl.setVenta({ n: 1 })
	await ctl.descargar()
	assert.ok(estaOculto(boton))
	ctl.setVenta({ n: 2 })
	assert.ok(!estaOculto(boton))
	assert.equal(boton.disabled, false)
})

test('Una venta nueva registrada durante la descarga mantiene su botón visible', async () => {
	let liberar
	const { boton, ctl } = await montar({
		generar: () => new Promise((r) => (liberar = () => r({ ok: true, ruta: 'x' }))),
	})
	ctl.setVenta({ n: 1 })
	const p = ctl.descargar()
	ctl.setVenta({ n: 2 })
	liberar()
	await p
	assert.ok(!estaOculto(boton))
})

test('Doble clic: solo una generación simultánea', async () => {
	let liberar
	let llamadas = 0
	const { ctl } = await montar({
		generar: () => {
			llamadas++
			return new Promise((r) => (liberar = () => r({ ok: true, ruta: 'x' })))
		},
	})
	ctl.setVenta({})
	const a = ctl.descargar()
	await ctl.descargar()
	assert.equal(llamadas, 1)
	liberar()
	await a
	assert.equal(llamadas, 1)
})
