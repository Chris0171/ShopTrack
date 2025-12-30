export function initCreateProducto() {
	const form = document.getElementById('form-crear-producto')
	const appModal = document.getElementById('appModal')
	const btnModalOk = document.getElementById('btn-modal-ok')
	const btnExaminar = document.getElementById('btn-examinar')
	const inputNombreImagen = document.getElementById('NombreImagen')
	const inputTasas = document.getElementById('Tasas')

	let selectedImagePath = null // Ruta real del archivo elegido

	// Cargar IVA predeterminado desde configuración
	async function cargarIVAPredeterminado() {
		try {
			if (window.api?.config?.get) {
				const res = await window.api.config.get()
				if (res.ok && res.data.ivaPredeterminado !== undefined) {
					// Convertir decimal a porcentaje (0.21 -> 21)
					const ivaPorcentaje = (res.data.ivaPredeterminado * 100).toFixed(2)
					inputTasas.value = ivaPorcentaje
					console.log(`✓ IVA predeterminado cargado: ${ivaPorcentaje}%`)
				}
			} else {
				// Fallback: cargar de localStorage
				const config = JSON.parse(localStorage.getItem('appConfig') || '{}')
				if (config.ivaPredeterminado !== undefined) {
					const ivaPorcentaje = (config.ivaPredeterminado * 100).toFixed(2)
					inputTasas.value = ivaPorcentaje
				}
			}
		} catch (error) {
			console.warn('No se pudo cargar IVA predeterminado:', error)
			// Mantener valor por defecto del placeholder (21)
		}
	}

	// Cargar IVA al iniciar
	cargarIVAPredeterminado()

	// Abrir selector de archivos (IPC seguro) al hacer clic en "Examinar"
	btnExaminar.addEventListener('click', async () => {
		try {
			const res = await window.api.producto.seleccionarImagen()
			if (!res || !res.ok || res.canceled) return

			selectedImagePath = res.path
			inputNombreImagen.value = res.fileName || ''
		} catch (error) {
			console.error('Error seleccionando imagen:', error)
		}
	})

	// Abrir modal con mensaje
	function mostrarModal(icono, titulo, mensaje, esError = false) {
		document.getElementById('modalIcon').textContent = icono
		document.getElementById('modalTitle').textContent = titulo
		document.getElementById('modalMessage').textContent = mensaje

		const btnOk = document.getElementById('btn-modal-ok')
		btnOk.className = esError
			? 'bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition transform hover:scale(1.08)'
			: 'bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition transform hover:scale(1.08)'

		appModal.style.display = 'flex'

		btnOk.onclick = () => {
			appModal.style.display = 'none'
			if (!esError) {
				form.reset()
				selectedImagePath = null
			}
		}
	}

	// Cerrar modal al hacer clic fuera
	appModal.addEventListener('click', (e) => {
		if (e.target === appModal) appModal.style.display = 'none'
	})

	// Limpiar formulario
	document.getElementById('btn-limpiar').addEventListener('click', () => {
		form.reset()
	})

	// Guardar producto
	document.getElementById('btn-guardar').addEventListener('click', async () => {
		const nroParte = document.getElementById('NroParte').value.trim()
		const descripcion = document.getElementById('Descripcion').value.trim()
		const cantidad = parseInt(document.getElementById('Cantidad').value) || 0
		const precio = parseFloat(document.getElementById('Precio').value) || 0
		const precioCosto =
			parseFloat(document.getElementById('PrecioCosto').value) || 0
		// Convertir porcentaje a decimal (21 -> 0.21)
		const tasasInput = parseFloat(document.getElementById('Tasas').value)
		const tasas = tasasInput ? tasasInput / 100 : 0.21
		const esOriginal = parseInt(document.getElementById('EsOriginal').value)
		let nombreImagen =
			document.getElementById('NombreImagen').value.trim() || null

		// Validaciones
		if (!nroParte) {
			mostrarModal(
				'❌',
				'Campo Requerido',
				'El Número de Parte es obligatorio',
				true
			)
			return
		}

		if (!descripcion) {
			mostrarModal(
				'❌',
				'Campo Requerido',
				'La Descripción es obligatoria',
				true
			)
			return
		}

		if (precio <= 0) {
			mostrarModal(
				'❌',
				'Precio Inválido',
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

			const result = await window.api.producto.create(data)

			mostrarModal('✅', 'Éxito', `Producto "${nroParte}" creado correctamente`)
		} catch (err) {
			mostrarModal('❌', 'Error', `No se pudo crear: ${err}`, true)
			console.error(err)
		}
	})
}
