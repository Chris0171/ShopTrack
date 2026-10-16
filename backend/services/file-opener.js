const fs = require('fs')
const { spawn } = require('child_process')

// Si el lanzador sigue vivo pasado este tiempo, el visor ya se ha iniciado (proceso desacoplado).
const GRACE_LANZADOR_MS = 5000

function abrirConXdg(ruta) {
	return new Promise((resolve) => {
		let resuelto = false
		let timer
		const fin = (r) => {
			if (resuelto) return
			resuelto = true
			clearTimeout(timer)
			resolve(r)
		}
		let child
		try {
			child = spawn('xdg-open', [ruta], { detached: true, stdio: 'ignore' })
		} catch (e) {
			return fin({ ok: false, error: `No se pudo ejecutar xdg-open: ${e.message}` })
		}
		child.on('error', (e) =>
			fin({ ok: false, error: `No se pudo ejecutar xdg-open: ${e.message}` }),
		)
		child.on('exit', (code) =>
			fin(
				code === 0
					? { ok: true }
					: { ok: false, error: `xdg-open terminó con código ${code}` },
			),
		)
		timer = setTimeout(() => {
			child.unref()
			fin({ ok: true })
		}, GRACE_LANZADOR_MS)
	})
}

// En Linux shell.openPath de Electron puede no responder nunca (promesa que no se resuelve)
async function abrirPorDefecto(ruta) {
	if (process.platform === 'linux') return abrirConXdg(ruta)
	const error = await require('electron').shell.openPath(ruta)
	return error ? { ok: false, error } : { ok: true }
}

let abridor = abrirPorDefecto

// Sustituye el mecanismo de apertura (pruebas)
function configurarApertura(fn) {
	abridor = fn || abrirPorDefecto
}

// Siempre devuelve { ok, error? }; nunca lanza ni deja la promesa sin resolver
async function abrirArchivo(ruta) {
	try {
		if (typeof ruta !== 'string' || !ruta.trim()) {
			return { ok: false, error: 'Ruta de archivo no válida.' }
		}
		if (!fs.existsSync(ruta) || !fs.statSync(ruta).isFile()) {
			return { ok: false, error: `El archivo no existe: ${ruta}` }
		}
		return await abridor(ruta)
	} catch (e) {
		return { ok: false, error: e?.message || String(e) }
	}
}

module.exports = { abrirArchivo, configurarApertura, abrirConXdg }
