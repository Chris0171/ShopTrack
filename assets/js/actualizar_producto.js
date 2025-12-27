export function initUpdateProducto(productId = null) {
	const inputBuscar = document.getElementById('buscarNroParte')
	const btnBuscar = document.getElementById('btnBuscar')
	const form = document.getElementById('formUpdate')
	const btnLimpiar = document.getElementById('btnLimpiar')
	const btnExaminar = document.getElementById('btn-examinar')

	// Campos del formulario
	const NroParte = document.getElementById('NroParte')
	const Descripcion = document.getElementById('Descripcion')
	const Cantidad = document.getElementById('Cantidad')
	const Precio = document.getElementById('Precio')
	const PrecioCosto = document.getElementById('PrecioCosto')
	const Tasas = document.getElementById('Tasas')
	const EsOriginal = document.getElementById('EsOriginal')
	const NombreImagen = document.getElementById('NombreImagen')

	const appModal = document.getElementById('appModal')
	const btnModalOk = document.getElementById('btn-modal-ok')

	let currentProductId = productId
	let selectedImagePath = null

	// Abrir modal con mensaje
	function mostrarModal(icono, titulo, mensaje, esError = false) {
		document.getElementById('modalIcon').textContent = icono
		document.getElementById('modalTitle').textContent = titulo
		document.getElementById('modalMessage').textContent = mensaje

		btnModalOk.className = esError
			? 'bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition transform hover:scale-105'
			: 'bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition transform hover:scale-105'

		appModal.style.display = 'flex'

		btnModalOk.onclick = () => {
			appModal.style.display = 'none'
		}
	}

	// Cerrar modal al hacer clic fuera
	appModal.addEventListener('click', (e) => {
		if (e.target === appModal) appModal.style.display = 'none'
	})

	// 🔥 Cargar datos si se pasa un ID desde otra vista
	if (currentProductId) {
		cargarProductoPorID(currentProductId)
	}

	// 🔍 Buscar por Nro de Parte
	btnBuscar.addEventListener('click', async () => {
		const nro = inputBuscar.value.trim()
		if (!nro) {
			mostrarModal('❌', 'Falta dato', 'Escribe un número de parte', true)
			return
		}

		const producto = await window.api.producto.buscarProducto(nro)

		if (!producto) {
			mostrarModal(
				'⚠️',
				'No encontrado',
				'No se encontró ningún producto con ese número de parte',
				true
			)
			return
		}

		currentProductId = producto.id
		selectedImagePath = null
		rellenarFormulario(producto)
	})

	// Examinar imagen
	btnExaminar.addEventListener('click', async () => {
		try {
			const res = await window.api.producto.seleccionarImagen()
			if (!res || !res.ok || res.canceled) return

			selectedImagePath = res.path
			NombreImagen.value = res.fileName || ''
		} catch (error) {
			console.error('Error seleccionando imagen:', error)
		}
	})

	// 📝 Guardar cambios
	form.addEventListener('submit', async (e) => {
		e.preventDefault()

		if (!currentProductId) {
			mostrarModal(
				'❌',
				'Falta producto',
				'Busca un producto antes de actualizar',
				true
			)
			return
		}

		const nroParte = NroParte.value.trim()
		const descripcion = Descripcion.value.trim()
		const cantidad = parseInt(Cantidad.value) || 0
		const precio = parseFloat(Precio.value) || 0
		const precioCosto = parseFloat(PrecioCosto.value) || 0
		const tasas = parseFloat(Tasas.value) || 0
		const esOriginal = parseInt(EsOriginal.value)
		let nombreImagen = NombreImagen.value.trim() || null

		// Validaciones
		if (!nroParte) {
			mostrarModal(
				'❌',
				'Campo requerido',
				'El Número de Parte es obligatorio',
				true
			)
			return
		}

		if (!descripcion) {
			mostrarModal(
				'❌',
				'Campo requerido',
				'La Descripción es obligatoria',
				true
			)
			return
		}

		if (precio <= 0) {
			mostrarModal(
				'❌',
				'Precio inválido',
				'El Precio de Venta debe ser mayor a 0',
				true
			)
			return
		}

		if (precioCosto > precio) {
			mostrarModal(
				'⚠️',
				'Advertencia',
				'El Precio de Costo no puede ser mayor al Precio de Venta',
				true
			)
			return
		}

		try {
			// Si hay imagen seleccionada, copiarla a assets y usar el nombre guardado
			if (selectedImagePath) {
				const copyRes = await window.api.producto.copiarImagen({
					sourcePath: selectedImagePath,
					fileName: nombreImagen || undefined,
				})

				if (!copyRes || !copyRes.ok) {
					mostrarModal(
						'❌',
						'Error',
						'No se pudo copiar la imagen seleccionada',
						true
					)
					return
				}

				nombreImagen = copyRes.savedName || nombreImagen
			}

			const data = {
				NroParte: nroParte,
				Descripcion: descripcion,
				Cantidad: cantidad,
				Precio: precio,
				Tasas: tasas,
				precioCosto: precioCosto,
				esOriginal: esOriginal,
				nombreImagen: nombreImagen,
			}

			await window.api.producto.update(currentProductId, data)

			mostrarModal('✅', 'Actualizado', 'Producto actualizado correctamente')
			selectedImagePath = null
		} catch (err) {
			mostrarModal('❌', 'Error', `No se pudo actualizar: ${err}`, true)
			console.error(err)
		}
	})

	// Limpiar formulario
	btnLimpiar.addEventListener('click', () => {
		form.reset()
		selectedImagePath = null
	})

	// FUNCIONES INTERNAS
	async function cargarProductoPorID(id) {
		const todos = await window.api.producto.getAll()
		const prod = todos.find((p) => p.id === id)

		if (prod) rellenarFormulario(prod)
	}

	function rellenarFormulario(prod) {
		NroParte.value = prod.NroParte || ''
		Descripcion.value = prod.Descripcion || ''
		Cantidad.value = prod.Cantidad ?? 0
		Precio.value = prod.Precio ?? 0
		PrecioCosto.value = prod.precioCosto ?? 0
		Tasas.value = prod.Tasas ?? 0
		EsOriginal.value = prod.esOriginal ?? 1
		NombreImagen.value = prod.nombreImagen || ''
	}
}
