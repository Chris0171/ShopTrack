export function initCreateProducto() {
	const form = document.getElementById('form-crear-producto')
	const appModal = document.getElementById('appModal')
	const btnModalOk = document.getElementById('btn-modal-ok')
	const inputTasas = document.getElementById('Tasas')
	const marcaSelect = document.getElementById('marcaSelect')
	const ubicacionInput = document.getElementById('Ubicacion')
	const stockMinimoInput = document.getElementById('StockMinimo')
	const numerosParteContainer = document.getElementById(
		'numeros-parte-container',
	)
	const btnAddNroParte = document.getElementById('btn-add-nroParte')
	const fotosContainer = document.getElementById('fotos-container')
	const btnAddFoto = document.getElementById('btn-add-foto')

	let fotoIndex = 0
	let fotosSeleccionadas = [] // Array de { fileName, sourcePath }

	// Agregar número de parte
	btnAddNroParte.addEventListener('click', () => {
		const index = numerosParteContainer.children.length
		const row = document.createElement('div')
		row.className = 'flex items-center gap-2 numero-parte-row'
		row.innerHTML = `
			<input type="text" class="flex-1 border-2 border-indigo-300 p-2 rounded-lg focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 outline-none transition numero-parte-input" placeholder="P-001-ALT" />
			<label class="flex items-center gap-1 text-sm">
				<input type="radio" name="nroParte-principal" value="${index}" class="nroParte-radio" />
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
	})

	// Actualizar visibilidad de botones eliminar
	function actualizarBotonesEliminarNroParte() {
		const rows = numerosParteContainer.querySelectorAll('.numero-parte-row')
		rows.forEach((row, index) => {
			const btnRemove = row.querySelector('.btn-remove-nroParte')
			if (rows.length > 1) {
				btnRemove.classList.remove('hidden')
			} else {
				btnRemove.classList.add('hidden')
			}
		})
	}

	// Agregar foto
	btnAddFoto.addEventListener('click', async () => {
		try {
			const res = await window.api.producto.seleccionarImagen()
			if (!res || !res.ok || res.canceled) return

			const currentIndex = fotoIndex++
			const isPrincipal = fotosSeleccionadas.length === 0

			fotosSeleccionadas.push({
				fileName: res.fileName,
				sourcePath: res.path,
				index: currentIndex,
			})

			const row = document.createElement('div')
			row.className = 'flex items-center gap-2 foto-row'
			row.dataset.fotoIndex = currentIndex
			row.innerHTML = `
				<input type="text" readonly class="flex-1 border-2 border-gray-300 p-2 rounded-lg bg-gray-50 text-gray-600" value="${
					res.fileName
				}" />
				<label class="flex items-center gap-1 text-sm">
					<input type="radio" name="foto-principal" value="${currentIndex}" ${
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
		} catch (error) {
			console.error('Error seleccionando imagen:', error)
		}
	})

	// Cargar marcas desde backend
	async function cargarMarcas() {
		try {
			const res = await window.api.marca.getAll()
			if (res.ok && Array.isArray(res.marcas)) {
				marcaSelect.innerHTML = `
					<option value="" data-i18n="products.create.selectBrand">Selecciona una marca</option>
				`
				res.marcas.forEach((marca) => {
					const opt = document.createElement('option')
					opt.value = marca.id
					opt.textContent = marca.nombre
					marcaSelect.appendChild(opt)
				})
				window.i18n?.applyTranslations?.(marcaSelect)
			}
		} catch (error) {
			console.error('Error cargando marcas:', error)
		}
	}

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
	// Cargar marcas al iniciar
	cargarMarcas()

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
		fotosSeleccionadas = []
		fotoIndex = 0
		fotosContainer.innerHTML = ''

		// Resetear números de parte a solo uno
		const rows = numerosParteContainer.querySelectorAll('.numero-parte-row')
		rows.forEach((row, index) => {
			if (index > 0) row.remove()
		})
		actualizarBotonesEliminarNroParte()
	})

	// Guardar producto
	document.getElementById('btn-guardar').addEventListener('click', async () => {
		// Recolectar números de parte
		const numerosParteInputs = numerosParteContainer.querySelectorAll(
			'.numero-parte-input',
		)
		const numerosParte = []
		const principalRadio = document.querySelector(
			'input[name="nroParte-principal"]:checked',
		)
		const principalIndex = principalRadio ? parseInt(principalRadio.value) : 0

		numerosParteInputs.forEach((input, index) => {
			const valor = input.value.trim()
			if (valor) {
				numerosParte.push({
					nroParte: valor,
					esPrincipal: index === principalIndex ? 1 : 0,
				})
			}
		})

		const descripcion = document.getElementById('Descripcion').value.trim()
		const cantidad = parseInt(document.getElementById('Cantidad').value) || 0
		const stockMinimo = parseInt(stockMinimoInput.value) || 0
		const precio = parseFloat(document.getElementById('Precio').value) || 0
		const precioCosto =
			parseFloat(document.getElementById('PrecioCosto').value) || 0
		const tasasInput = parseFloat(document.getElementById('Tasas').value)
		const tasas = tasasInput ? tasasInput / 100 : 0.21
		const marcaId = parseInt(marcaSelect.value)
		const ubicacion = ubicacionInput.value.trim()

		// Validaciones
		if (numerosParte.length === 0) {
			mostrarModal(
				'❌',
				'Campo Requerido',
				'Debe agregar al menos un Número de Parte',
				true,
			)
			return
		}

		if (!descripcion) {
			mostrarModal(
				'❌',
				'Campo Requerido',
				'La Descripción es obligatoria',
				true,
			)
			return
		}

		if (precio <= 0) {
			mostrarModal(
				'❌',
				'Precio Inválido',
				'El Precio de Venta debe ser mayor a 0',
				true,
			)
			return
		}

		if (stockMinimo < 0) {
			mostrarModal(
				'❌',
				'Stock mínimo inválido',
				'El stock mínimo debe ser mayor o igual a 0',
				true,
			)
			return
		}

		if (!marcaId) {
			mostrarModal('❌', 'Marca requerida', 'Debes seleccionar una marca', true)
			return
		}

		if (precioCosto > precio) {
			mostrarModal(
				'⚠️',
				'Advertencia',
				'El Precio de Costo no puede ser mayor al Precio de Venta',
				true,
			)
			return
		}

		try {
			// Copiar fotos y obtener nombres guardados
			const fotos = []
			if (fotosSeleccionadas.length > 0) {
				const principalFotoRadio = document.querySelector(
					'input[name="foto-principal"]:checked',
				)
				const principalFotoIndex = principalFotoRadio
					? parseInt(principalFotoRadio.value)
					: fotosSeleccionadas[0].index

				for (const foto of fotosSeleccionadas) {
					const copyRes = await window.api.producto.copiarImagen({
						sourcePath: foto.sourcePath,
						fileName: foto.fileName,
					})

					if (copyRes && copyRes.ok) {
						fotos.push(copyRes.savedName || foto.fileName)
					}
				}

				// Reordenar para que la principal sea la primera
				const principalFoto = fotosSeleccionadas.find(
					(f) => f.index === principalFotoIndex,
				)
				if (principalFoto) {
					const principalIndex = fotos.indexOf(principalFoto.fileName)
					if (principalIndex > 0) {
						const [principal] = fotos.splice(principalIndex, 1)
						fotos.unshift(principal)
					}
				}
			}

			const data = {
				numerosParte: numerosParte,
				Descripcion: descripcion,
				Cantidad: cantidad,
				stockMinimo: stockMinimo,
				Precio: precio,
				Tasas: tasas,
				precioCosto: precioCosto,
				marcaId: marcaId,
				ubicacion: ubicacion || null,
				fotos: fotos,
			}

			const result = await window.api.producto.create(data)

			mostrarModal(
				'✅',
				'Éxito',
				`Producto "${numerosParte[0].nroParte}" creado correctamente`,
			)

			// Limpiar formulario
			form.reset()
			fotosSeleccionadas = []
			fotoIndex = 0
			fotosContainer.innerHTML = ''
			const rows = numerosParteContainer.querySelectorAll('.numero-parte-row')
			rows.forEach((row, index) => {
				if (index > 0) row.remove()
			})
			actualizarBotonesEliminarNroParte()
		} catch (err) {
			mostrarModal('❌', 'Error', `No se pudo crear: ${err}`, true)
			console.error(err)
		}
	})
}
