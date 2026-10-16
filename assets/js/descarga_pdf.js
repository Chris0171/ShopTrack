// Ciclo de vida del botón "Descargar PDF" de Nueva Venta (oculto -> generando -> oculto | recuperado)
export function crearDescargaPDF({
	boton,
	generar,
	abrir,
	avisar,
	textoGenerando = '⏳ Generando factura…',
}) {
	const htmlOriginal = boton.innerHTML
	let venta = null
	let rutaGenerada = null
	let ocupado = false

	const restaurar = () => {
		boton.disabled = false
		boton.innerHTML = htmlOriginal
	}

	return {
		// Hay una factura descargable: se muestra el botón en su estado inicial
		setVenta(datos) {
			rutaGenerada = null
			venta = datos
			restaurar()
			boton.classList.remove('hidden')
		},

		async descargar() {
			if (ocupado) return
			if (!venta) {
				await avisar('No hay factura para descargar.', 'Aviso', 'info')
				return
			}
			ocupado = true
			const actual = venta
			boton.disabled = true
			boton.textContent = textoGenerando

			let error = null
			try {
				// Si el PDF ya se generó en un intento anterior, solo se reintenta la apertura
				let ruta = venta === actual ? rutaGenerada : null
				if (!ruta) {
					let res
					try {
						res = await generar(actual)
					} catch (e) {
						res = { ok: false, error: e?.message || String(e) }
					}
					if (!res?.ok) {
						error = `Error al generar el PDF: ${res?.error || 'error desconocido'}`
					} else {
						ruta = res.ruta
						if (venta === actual) rutaGenerada = ruta
					}
				}
				if (ruta) {
					let abierto
					try {
						abierto = await abrir(ruta)
					} catch (e) {
						abierto = { ok: false, error: e?.message || String(e) }
					}
					if (!abierto?.ok) {
						error = `El PDF se generó (${ruta}) pero no se pudo abrir: ${abierto?.error || 'error desconocido'}`
					}
				}
			} catch (e) {
				error = `Error inesperado: ${e?.message || e}`
			}

			// Estado final antes de cualquier aviso, para no dejar el botón bloqueado
			ocupado = false
			restaurar()
			if (!error) {
				// Si ya hay otra venta pendiente de descargar, el botón sigue visible para ella
				if (venta === actual) {
					venta = null
					rutaGenerada = null
					boton.classList.add('hidden')
				}
				return
			}
			await avisar(error, 'Error', 'error')
		},
	}
}
