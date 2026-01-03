export function initUpdateProducto(productId = null) {
	const inputBuscar = document.getElementById('buscarNroParte')
	const btnBuscar = document.getElementById('btnBuscar')
	const form = document.getElementById('formUpdate')
	const btnLimpiar = document.getElementById('btnLimpiar')
	const btnAddNroParte = document.getElementById('btn-add-nroParte')
	const btnAddFoto = document.getElementById('btn-add-foto')
	const numerosParteContainer = document.getElementById(
		'numeros-parte-container'
	)
	const fotosContainer = document.getElementById('fotos-container')

	// Campos del formulario
	const Descripcion = document.getElementById('Descripcion')
	const Cantidad = document.getElementById('Cantidad')
	const Precio = document.getElementById('Precio')
	const PrecioCosto = document.getElementById('PrecioCosto')
	const Tasas = document.getElementById('Tasas')
	const EsOriginal = document.getElementById('EsOriginal')

	const appModal = document.getElementById('appModal')
	const btnModalOk = document.getElementById('btn-modal-ok')

	let currentProductId = productId
	let fotoIndex = 0
	let fotosSeleccionadas = [] // Array de { fileName, sourcePath, index, isExisting }
	let fotosExistentes = [] // Para rastrear fotos que ya estaban en la BD

	// Cargar IVA predeterminado desde configuración (solo si no hay producto cargado)
	async function cargarIVAPredeterminadoSiVacio() {
		// Solo cargar si el campo está vacío
		if (Tasas.value) return

		try {
			if (window.api?.config?.get) {
				const res = await window.api.config.get()
				if (res.ok && res.data.ivaPredeterminado !== undefined) {
					// Convertir decimal a porcentaje (0.21 -> 21)
					const ivaPorcentaje = (res.data.ivaPredeterminado * 100).toFixed(2)
					Tasas.value = ivaPorcentaje
				}
			} else {
				// Fallback: cargar de localStorage
				const config = JSON.parse(localStorage.getItem('appConfig') || '{}')
				if (config.ivaPredeterminado !== undefined) {
					const ivaPorcentaje = (config.ivaPredeterminado * 100).toFixed(2)
					Tasas.value = ivaPorcentaje
				}
			}
		} catch (error) {
			// Error silencioso al cargar IVA
		}
	}

	// Cargar IVA si no hay producto cargado inicialmente
	if (!currentProductId) {
		cargarIVAPredeterminadoSiVacio()
	}

	// Agregar número de parte
	btnAddNroParte.replaceWith(btnAddNroParte.cloneNode(true))
	const newBtnAddNroParte = document.getElementById('btn-add-nroParte')
	newBtnAddNroParte.addEventListener('click', () => {
		agregarNroParteRow()
	})

	function agregarNroParteRow(valor = '', esPrincipal = false) {
		const index = numerosParteContainer.children.length
		const row = document.createElement('div')
		row.className = 'flex items-center gap-2 numero-parte-row'
		row.innerHTML = `
			<input type="text" value="${valor}" class="flex-1 border-2 border-indigo-300 p-2 rounded-lg focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 outline-none transition numero-parte-input" placeholder="P-001-ALT" />
			<label class="flex items-center gap-1 text-sm">
				<input type="radio" name="nroParte-principal" value="${index}" ${
			esPrincipal ? 'checked' : ''
		} class="nroParte-radio" />
				<span data-i18n="products.create.principal">Principal</span>
			</label>
			<button type="button" class="btn-remove-nroParte bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg font-semibold transition">
				🗑️
			</button>
		`
		numerosParteContainer.appendChild(row)

		// Evento para eliminar
		row.querySelector('.btn-remove-nroParte').addEventListener('click', () => {
			row.remove()
			actualizarBotonesEliminarNroParte()
		})

		actualizarBotonesEliminarNroParte()
	}

	// Actualizar visibilidad de botones eliminar
	function actualizarBotonesEliminarNroParte() {
		const rows = numerosParteContainer.querySelectorAll('.numero-parte-row')
		rows.forEach((row) => {
			const btnRemove = row.querySelector('.btn-remove-nroParte')
			if (rows.length > 1) {
				btnRemove.classList.remove('hidden')
			} else {
				btnRemove.classList.add('hidden')
			}
		})
	}

	// Agregar foto
	btnAddFoto.replaceWith(btnAddFoto.cloneNode(true))
	const newBtnAddFoto = document.getElementById('btn-add-foto')
	newBtnAddFoto.addEventListener('click', async () => {
		try {
			const res = await window.api.producto.seleccionarImagen()
			if (!res || !res.ok || res.canceled) return

			const currentIndex = fotoIndex++
			const isPrincipal = fotosSeleccionadas.length === 0

			fotosSeleccionadas.push({
				fileName: res.fileName,
				sourcePath: res.path,
				index: currentIndex,
				isExisting: false,
			})

			agregarFotoRow(res.fileName, currentIndex, isPrincipal, false)
		} catch (error) {
			// Error al seleccionar imagen
		}
	})

	function agregarFotoRow(fileName, index, isPrincipal, isExisting) {
		const row = document.createElement('div')
		row.className = 'flex items-center gap-2 foto-row'
		row.dataset.fotoIndex = index
		row.innerHTML = `
			<input type="text" readonly class="flex-1 border-2 border-gray-300 p-2 rounded-lg bg-gray-50 text-gray-600" value="${fileName}" />
			<label class="flex items-center gap-1 text-sm">
				<input type="radio" name="foto-principal" value="${index}" ${
			isPrincipal ? 'checked' : ''
		} class="foto-radio" />
				<span data-i18n="products.create.principal">Principal</span>
			</label>
			<button type="button" class="btn-remove-foto bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg font-semibold transition">
				🗑️
			</button>
		`
		fotosContainer.appendChild(row)

		// Evento para eliminar
		row.querySelector('.btn-remove-foto').addEventListener('click', () => {
			const idx = parseInt(row.dataset.fotoIndex)
			fotosSeleccionadas = fotosSeleccionadas.filter((f) => f.index !== idx)
			row.remove()

			// Si era la principal y quedan fotos, marcar la primera como principal
			if (isPrincipal && fotosContainer.children.length > 0) {
				const firstRadio = fotosContainer.querySelector('.foto-radio')
				if (firstRadio) firstRadio.checked = true
			}
		})
	}

	// Abrir modal con mensaje
	function mostrarModal(icono, titulo, mensaje, esError = false) {
		// Si el modal ya está visible, ocultarlo primero completamente
		const yaVisible = appModal.style.display === 'flex'

		// Ocultar completamente
		appModal.style.display = 'none'
		appModal.style.opacity = '0'

		// Esperar a que el navegador renderice el cambio
		setTimeout(
			() => {
				// Actualizar contenido mientras está oculto
				document.getElementById('modalIcon').textContent = icono
				document.getElementById('modalTitle').textContent = titulo
				document.getElementById('modalMessage').textContent = mensaje

				btnModalOk.className = esError
					? 'bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition transform hover:scale-105'
					: 'bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition transform hover:scale-105'

				btnModalOk.onclick = () => {
					appModal.style.opacity = '0'
					setTimeout(() => {
						appModal.style.display = 'none'
					}, 150)
				}

				// Mostrar el modal con el nuevo contenido
				appModal.style.display = 'flex'
				appModal.style.transition = 'opacity 0.2s ease'

				// Fade in suave
				setTimeout(() => {
					appModal.style.opacity = '1'
				}, 20)
			},
			yaVisible ? 100 : 20
		)
	}

	// Cerrar modal al hacer clic fuera
	appModal.addEventListener('click', (e) => {
		if (e.target === appModal) appModal.style.display = 'none'
	})

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
		fotosSeleccionadas = []
		fotosExistentes = []
		rellenarFormulario(producto)
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

		// Recopilar números de parte
		const nroParteInputs = document.querySelectorAll('.numero-parte-input')
		const numerosParte = []
		nroParteInputs.forEach((input, index) => {
			const valor = input.value.trim()
			if (valor) {
				const radio = document.querySelector(
					`input[name="nroParte-principal"][value="${index}"]`
				)
				numerosParte.push({
					NroParte: valor,
					esPrincipal: radio?.checked ? 1 : 0,
				})
			}
		})

		const descripcion = Descripcion.value.trim()
		const cantidad = parseInt(Cantidad.value) || 0
		const precio = parseFloat(Precio.value) || 0
		const precioCosto = parseFloat(PrecioCosto.value) || 0
		// Convertir porcentaje a decimal (21 -> 0.21)
		const tasasInput = parseFloat(Tasas.value)
		const tasas = tasasInput ? tasasInput / 100 : 0.21
		const esOriginal = parseInt(EsOriginal.value)

		// Validaciones
		if (numerosParte.length === 0) {
			mostrarModal(
				'❌',
				'Campo requerido',
				'Debes agregar al menos un Número de Parte',
				true
			)
			return
		}

		// Verificar que haya al menos un número de parte principal
		const hayPrincipal = numerosParte.some((np) => np.esPrincipal === 1)
		if (!hayPrincipal && numerosParte.length > 0) {
			numerosParte[0].esPrincipal = 1
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
			// Procesar fotos nuevas (copiar a assets)
			const fotosParaGuardar = []

			for (const foto of fotosSeleccionadas) {
				if (foto.isExisting) {
					// Foto existente, mantener el nombre
					fotosParaGuardar.push({
						nombreImagen: foto.fileName,
						esPrincipal: 0, // Se actualizará después
						orden: 0,
					})
				} else {
					// Foto nueva, copiar archivo
					const copyRes = await window.api.producto.copiarImagen({
						sourcePath: foto.sourcePath,
						fileName: foto.fileName,
					})

					if (!copyRes || !copyRes.ok) {
						mostrarModal(
							'❌',
							'Error',
							`No se pudo copiar la imagen: ${foto.fileName}`,
							true
						)
						return
					}

					fotosParaGuardar.push({
						nombreImagen: copyRes.savedName || foto.fileName,
						esPrincipal: 0,
						orden: 0,
					})
				}
			}

			// Establecer foto principal y orden
			const fotoPrincipalRadio = document.querySelector(
				'input[name="foto-principal"]:checked'
			)
			if (fotoPrincipalRadio) {
				const principalIndex = parseInt(fotoPrincipalRadio.value)
				const fotoSeleccionada = fotosSeleccionadas.find(
					(f) => f.index === principalIndex
				)
				if (fotoSeleccionada) {
					const fotoEnLista = fotosParaGuardar.find(
						(f) => f.nombreImagen === fotoSeleccionada.fileName
					)
					if (fotoEnLista) {
						fotoEnLista.esPrincipal = 1
					}
				}
			} else if (fotosParaGuardar.length > 0) {
				fotosParaGuardar[0].esPrincipal = 1
			}

			// Asignar orden
			fotosParaGuardar.forEach((foto, index) => {
				foto.orden = index + 1
			})

			const data = {
				Descripcion: descripcion,
				Cantidad: cantidad,
				Precio: precio,
				Tasas: tasas,
				precioCosto: precioCosto,
				esOriginal: esOriginal,
				numerosParte: numerosParte,
				fotos: fotosParaGuardar,
			}

			const result = await window.api.producto.update(currentProductId, data)

			if (result && result.ok) {
				mostrarModal('✅', 'Actualizado', 'Producto actualizado correctamente')
				fotosSeleccionadas = []
				fotosExistentes = []
			} else {
				mostrarModal('❌', 'Error', `No se pudo actualizar el producto`, true)
			}
		} catch (err) {
			mostrarModal('❌', 'Error', `No se pudo actualizar: ${err}`, true)
		}
	})

	// Limpiar formulario
	btnLimpiar.addEventListener('click', () => {
		form.reset()
		numerosParteContainer.innerHTML = ''
		fotosContainer.innerHTML = ''
		fotosSeleccionadas = []
		fotosExistentes = []
		fotoIndex = 0
		currentProductId = null
		// Recargar IVA predeterminado después de limpiar
		cargarIVAPredeterminadoSiVacio()
	})

	// FUNCIONES INTERNAS
	async function cargarProductoPorID(id) {
		const todos = await window.api.producto.getAll()
		const prod = todos.find((p) => p.id === id)

		if (prod) rellenarFormulario(prod)
	}

	function rellenarFormulario(prod) {
		// Limpiar contenedores
		numerosParteContainer.innerHTML = ''
		fotosContainer.innerHTML = ''
		fotosSeleccionadas = []
		fotosExistentes = []
		fotoIndex = 0

		// Llenar campos básicos del formulario
		Descripcion.value = prod.Descripcion || ''
		Cantidad.value = prod.Cantidad || 0
		Precio.value = prod.Precio || 0
		PrecioCosto.value = prod.precioCosto || 0
		// Convertir decimal a porcentaje para mostrar (0.21 -> 21)
		Tasas.value = prod.Tasas ? (prod.Tasas * 100).toFixed(2) : 21
		EsOriginal.value = prod.esOriginal ?? 1

		// Cargar números de parte
		if (prod.numerosParte && prod.numerosParte.length > 0) {
			prod.numerosParte.forEach((np) => {
				// Normalizar: puede venir como nroParte o NroParte
				const nroParteValor = np.nroParte || np.NroParte
				agregarNroParteRow(nroParteValor, np.esPrincipal === 1)
			})
		} else if (prod.NroParte) {
			// Fallback para compatibilidad con productos antiguos
			agregarNroParteRow(prod.NroParte, true)
		}
		// Cargar fotos existentes
		if (prod.fotos && prod.fotos.length > 0) {
			prod.fotos.forEach((foto, index) => {
				const currentIndex = fotoIndex++
				const isPrincipal = foto.esPrincipal === 1

				fotosSeleccionadas.push({
					fileName: foto.nombreImagen,
					sourcePath: null,
					index: currentIndex,
					isExisting: true,
				})

				fotosExistentes.push(foto.nombreImagen)
				agregarFotoRow(foto.nombreImagen, currentIndex, isPrincipal, true)
			})
		} else if (prod.nombreImagen) {
			// Fallback para compatibilidad con productos antiguos
			const currentIndex = fotoIndex++
			fotosSeleccionadas.push({
				fileName: prod.nombreImagen,
				sourcePath: null,
				index: currentIndex,
				isExisting: true,
			})
			fotosExistentes.push(prod.nombreImagen)
			agregarFotoRow(prod.nombreImagen, currentIndex, true, true)
		}
	}

	// Si se pasó un productId al inicializar, cargar el producto automáticamente
	if (currentProductId) {
		window.api.producto.getAll().then((productos) => {
			const producto = productos.find((p) => p.id === currentProductId)
			if (producto) {
				fotosSeleccionadas = []
				fotosExistentes = []
				rellenarFormulario(producto)
			}
		})
	}
}
