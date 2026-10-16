const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { abrirArchivo, configurarApertura } = require('../backend/services/file-opener')

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opener-'))
const pdf = path.join(dir, 'a.pdf')
fs.writeFileSync(pdf, '%PDF-1.4')

test.after(() => {
	configurarApertura(null)
	fs.rmSync(dir, { recursive: true, force: true })
})

test('Abre un PDF existente mediante el mecanismo configurado', async () => {
	const abiertos = []
	configurarApertura(async (r) => (abiertos.push(r), { ok: true }))
	assert.deepEqual(await abrirArchivo(pdf), { ok: true })
	assert.deepEqual(await abrirArchivo(pdf), { ok: true }) // 2ª llamada igual que la 1ª
	assert.deepEqual(abiertos, [pdf, pdf])
})

test('Ruta inexistente, vacía o inválida: error controlado sin invocar al visor', async () => {
	let llamadas = 0
	configurarApertura(async () => (llamadas++, { ok: true }))
	for (const r of [path.join(dir, 'nope.pdf'), dir, '', '   ', null, undefined, 42]) {
		const res = await abrirArchivo(r)
		assert.equal(res.ok, false, String(r))
		assert.ok(res.error)
	}
	assert.equal(llamadas, 0)
})

test('Error de apertura o excepción del visor: resultado ok:false, nunca rechaza', async () => {
	configurarApertura(async () => ({ ok: false, error: 'sin visor' }))
	assert.deepEqual(await abrirArchivo(pdf), { ok: false, error: 'sin visor' })
	configurarApertura(async () => {
		throw new Error('boom')
	})
	assert.deepEqual(await abrirArchivo(pdf), { ok: false, error: 'boom' })
})

test('Lanzador xdg-open real: código distinto de 0 => error; ok si arranca', { skip: process.platform !== 'linux' }, async () => {
	const { abrirConXdg } = require('../backend/services/file-opener')
	const orig = process.env.PATH
	try {
		const bin = path.join(dir, 'bin')
		fs.mkdirSync(bin)
		fs.writeFileSync(path.join(bin, 'xdg-open'), '#!/bin/sh\nexit 4\n', { mode: 0o755 })
		process.env.PATH = bin
		const fallo = await abrirConXdg(pdf)
		assert.equal(fallo.ok, false)
		assert.match(fallo.error, /código 4/)
		fs.writeFileSync(path.join(bin, 'xdg-open'), '#!/bin/sh\nexit 0\n', { mode: 0o755 })
		assert.deepEqual(await abrirConXdg(pdf), { ok: true })
		process.env.PATH = path.join(dir, 'vacio')
		assert.equal((await abrirConXdg(pdf)).ok, false) // xdg-open ausente
	} finally {
		process.env.PATH = orig
	}
})
