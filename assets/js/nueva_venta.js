import { crearDescargaPDF } from './descarga_pdf.js'

export function initNuevaVenta() {
	// Lista temporal de productos agregados a la venta
	let productosVenta = []
	let ventaActual = null // Almacenar datos de la venta actual

	const buscarInput = document.getElementById('buscarInput')
	const autocompleteDropdown = document.getElementById('autocompleteDropdown')
	const tablaVenta = document.getElementById('tablaVenta')
	const filtroMarcaVenta = document.getElementById('filtroMarcaVenta')

	// Estado del autocompletado
	let productosSugeridos = []
	let selectedIndex = -1
	let searchTimeout = null

	const clienteSelect = document.getElementById('clienteSelect')
	const clienteNombre = document.getElementById('clienteNombre')
	const clienteTelefono = document.getElementById('clienteTelefono')
	const clienteEmail = document.getElementById('clienteEmail')
	const clienteDireccion = document.getElementById('clienteDireccion')

	const subtotalInput = document.getElementById('subtotalVenta')
	const impuestosInput = document.getElementById('impuestosVenta')
	const totalInput = document.getElementById('totalVenta')
	const descuentoInput = document.getElementById('descuentoVenta')
	const laborInput = document.getElementById('laborVenta')
	const laborWrapper = document.getElementById('laborWrapper')
	const laborError = document.getElementById('laborError')
	const btnLimpiarBusqueda = document.getElementById('btnLimpiarBusqueda')
	const laborResumen = document.getElementById('laborResumen')
	const laborResumenValor = document.getElementById('laborResumenValor')
	const taxRateLabel = document.getElementById('taxRateLabel')
	let tasaImpuesto = 0 // fracción; se carga desde Configuración
	const motivoDescuentoInput = document.getElementById('motivoDescuento')

	const metodoPago = document.getElementById('metodoPago')
	const numeroFactura = document.getElementById('numeroFactura')
	const observaciones = document.getElementById('observaciones')

	const btnFinalizarVenta = document.getElementById('btnFinalizarVenta')
	const htmlFinalizarOriginal = btnFinalizarVenta.innerHTML
	const btnDescargarPDF = document.getElementById('btnDescargarPDF')
	const descargaPDF = crearDescargaPDF({
		boton: btnDescargarPDF,
		generar: (venta) => window.api.factura.generarPDF(venta),
		abrir: (ruta) => window.api.general.abrirArchivo(ruta),
		avisar: (msg, titulo, variante) => showModalInfo(msg, titulo, variante),
	})
	let marcasCargadas = false

	// Referencias del modal reutilizable
	const modal = document.getElementById('appModal')
	const modalTitle = document.getElementById('appModalTitle')
	const modalMsg = document.getElementById('appModalMessage')
	const modalOk = document.getElementById('appModalOk')
	const modalCancel = document.getElementById('appModalCancel')
	const modalHeader = document.getElementById('appModalHeader')
	const modalIcon = document.getElementById('appModalIcon')

	// Modal de imagen
	const imageModal = document.getElementById('imageModal')
	const modalImage = document.getElementById('modalImage')
	const closeImageModal = document.getElementById('closeImageModal')

	const MODAL_VARIANTS = {
		info: { icon: 'fas fa-info-circle', colorClass: 'variant-info' },
		success: { icon: 'fas fa-check-circle', colorClass: 'variant-success' },
		warning: {
			icon: 'fas fa-exclamation-circle',
			colorClass: 'variant-warning',
		},
		error: { icon: 'fas fa-times-circle', colorClass: 'variant-error' },
		confirm: { icon: 'fas fa-question-circle', colorClass: 'variant-confirm' },
	}

	function applyModalVariant(variant = 'info') {
		const config = MODAL_VARIANTS[variant] || MODAL_VARIANTS.info
		Object.values(MODAL_VARIANTS).forEach((v) => {
			modalHeader.classList.remove(v.colorClass)
			modalOk.classList.remove(v.colorClass)
		})
		modalHeader.classList.add(config.colorClass)
		modalOk.classList.add(config.colorClass)
		modalIcon.className = config.icon + ' text-white text-2xl'
	}

	function openModal({
		title = 'Aviso',
		message = '',
		showCancel = false,
		okText = 'Aceptar',
		cancelText = 'Cancelar',
		variant = 'info',
	} = {}) {
		return new Promise((resolve) => {
			modalTitle.textContent = title
			modalMsg.textContent = message
			modalOk.textContent = okText
			applyModalVariant(variant)
			if (showCancel) {
				modalCancel.classList.remove('hidden')
				modalCancel.textContent = cancelText
			} else {
				modalCancel.classList.add('hidden')
			}
			const onOk = () => {
				cleanup()
				resolve(true)
			}
			const onCancel = () => {
				cleanup()
				resolve(false)
			}
			function cleanup() {
				modalOk.removeEventListener('click', onOk)
				modalCancel.removeEventListener('click', onCancel)
				modal.style.display = 'none'
			}
			modalOk.addEventListener('click', onOk)
			modalCancel.addEventListener('click', onCancel)
			modal.style.display = 'flex'
		})
	}

	async function showImageModal(nombreImagen) {
		if (!nombreImagen) return
		const rutaImagen = await window.api.producto.getImagenPath(nombreImagen)
		if (rutaImagen?.ok && rutaImagen.path) {
			modalImage.src = rutaImagen.path
		} else {
			modalImage.src = ''
		}
		imageModal.style.display = 'flex'
	}

	function hideImageModal() {
		imageModal.style.display = 'none'
		modalImage.src = ''
	}

	closeImageModal.onclick = hideImageModal
	imageModal.addEventListener('click', (e) => {
		if (e.target === imageModal) hideImageModal()
	})

	async function showModalInfo(message, title = 'Aviso', variant = 'info') {
		await openModal({ title, message, showCancel: false, variant })
	}

	async function showModalConfirm(
		message,
		title = 'Confirmar',
		variant = 'confirm',
	) {
		return await openModal({
			title,
			message,
			showCancel: true,
			okText: 'Sí',
			cancelText: 'No',
			variant,
		})
	}

	// CARGAR CLIENTES EXISTENTES
	async function cargarClientes() {
		const clientes = await window.api.cliente.getAll()
		console.log(clientes)
		clientes.clientes.forEach((c) => {
			const opt = document.createElement('option')
			opt.value = c.id
			opt.textContent = `${c.nombre} (${c.telefono || 'sin teléfono'})`
			clienteSelect.appendChild(opt)
		})
	}

	// Cargar marcas para filtro
	async function cargarMarcasFiltro() {
		try {
			const res = await window.api.marca.getAll()
			if (res.ok && Array.isArray(res.marcas)) {
				filtroMarcaVenta.innerHTML = `
					<option value="" data-i18n="sales.new.brandAll">Todas las marcas</option>
				`
				res.marcas.forEach((marca) => {
					const opt = document.createElement('option')
					opt.value = marca.id
					opt.textContent = marca.nombre
					filtroMarcaVenta.appendChild(opt)
				})
				window.i18n?.applyTranslations?.(filtroMarcaVenta)
				marcasCargadas = true
			}
		} catch (error) {
			console.error('Error cargando marcas:', error)
		}
	}
	// Adaptador: reemplaza alertas en div por modal
	async function showFieldError(_id, msg, elem) {
		await showModalInfo(msg, 'Aviso')
		if (elem) {
			const el = document.getElementById(elem)
			if (el) {
				el.scrollIntoView({ behavior: 'smooth', block: 'start' })
			}
		}
	}

	async function cargarTodo() {
		const ventas = await window.api.venta.getAll()
		console.log(ventas)
		const detalleVentas = await window.api.detalleVenta.getAll()
		console.log(detalleVentas)
		const facturas = await window.api.factura.getAll()
		console.log(facturas)
	}
	cargarTodo()
	cargarClientes()
	cargarNumeroFactura()
	cargarMarcasFiltro()
	renderTabla()
	cargarTasaImpuesto()
		.then(actualizarTotales)
		.catch((error) => showModalInfo(error.message, 'Error', 'error'))

	// Cargar número de factura automático
	async function cargarNumeroFactura() {
		const resultado = await window.api.factura.generateNumero()
		if (resultado.ok) {
			numeroFactura.value = resultado.numeroFactura
		} else {
			console.error('Error al generar número de factura:', resultado.error)
			numeroFactura.value = 'FAC-ERROR-0000'
		}
	}

	// Event listener para descuento
	descuentoInput.addEventListener('change', () => {
		actualizarTotales()
	})

	// Labor: actualizar total al escribir y avisar al confirmar un valor inválido
	laborInput.addEventListener('input', actualizarTotales)
	laborInput.addEventListener('change', async () => {
		actualizarTotales()
		const labor = leerMonto(laborInput, 'Labor')
		if (!labor.ok) await showModalInfo(labor.error, 'Aviso', 'warning')
	})

	// Reaplicar búsqueda al cambiar marca
	filtroMarcaVenta.addEventListener('change', () => {
		if (buscarInput.value.trim().length > 0) {
			buscarInput.dispatchEvent(new Event('input'))
		} else {
			ocultarDropdown()
		}
	})

	function filtrarPorMarca(productos) {
		const marcaId = filtroMarcaVenta.value
		if (!marcaId) return productos
		const marcaIdNum = Number(marcaId)
		return productos.filter((p) => Number(p.marcaId) === marcaIdNum)
	}

	// BUSCADOR DE PRODUCTOS con autocompletado
	buscarInput.addEventListener('input', async (e) => {
		const texto = e.target.value.trim()

		// Limpiar timeout anterior
		if (searchTimeout) clearTimeout(searchTimeout)

		if (texto.length === 0) {
			ocultarDropdown()
			return
		}

		// Debounce: esperar 300ms antes de buscar
		searchTimeout = setTimeout(async () => {
			try {
				const productos = await window.api.producto.buscarProductos(texto)
				const productosFiltrados = filtrarPorMarca(productos)

				if (productosFiltrados.length === 0) {
					ocultarDropdown()
					return
				}

				productosSugeridos = productosFiltrados
				selectedIndex = -1
				mostrarDropdown()
			} catch (error) {
				console.error('Error buscando productos:', error)
				ocultarDropdown()
			}
		}, 300)
	})

	// Mostrar el botón de limpiar solo cuando hay texto
	buscarInput.addEventListener('input', () => {
		btnLimpiarBusqueda.classList.toggle('hidden', buscarInput.value === '')
	})
	btnLimpiarBusqueda.addEventListener('click', () => {
		buscarInput.value = ''
		btnLimpiarBusqueda.classList.add('hidden')
		ocultarDropdown()
		buscarInput.focus()
	})

	buscarInput.addEventListener('keydown', async (e) => {
		if (e.key === 'ArrowDown') {
			e.preventDefault()
			if (productosSugeridos.length > 0) {
				selectedIndex = Math.min(
					selectedIndex + 1,
					productosSugeridos.length - 1,
				)
				actualizarSeleccion()
			}
		} else if (e.key === 'ArrowUp') {
			e.preventDefault()
			if (productosSugeridos.length > 0) {
				selectedIndex = Math.max(selectedIndex - 1, -1)
				actualizarSeleccion()
			}
		} else if (e.key === 'Enter') {
			e.preventDefault()

			if (selectedIndex >= 0 && productosSugeridos[selectedIndex]) {
				// Agregar producto seleccionado del dropdown
				await agregarProducto(productosSugeridos[selectedIndex])
				buscarInput.value = ''
				ocultarDropdown()
			} else {
				// Buscar por número exacto (comportamiento legacy)
				const nroParte = buscarInput.value.trim()
				if (!nroParte) return

				const producto = await window.api.producto.buscarProducto(nroParte)

				if (!producto) {
					await showModalInfo('Producto no encontrado', 'Aviso')
					buscarInput.focus()
					return
				}

				const filtrados = filtrarPorMarca([producto])
				if (filtrados.length === 0) {
					await showModalInfo(
						'El producto no coincide con la marca filtrada',
						'Aviso',
					)
					buscarInput.focus()
					return
				}

				await agregarProducto(producto)
				buscarInput.value = ''
				ocultarDropdown()
			}
		} else if (e.key === 'Escape') {
			ocultarDropdown()
		}
	})

	// Cerrar dropdown al hacer clic fuera
	document.addEventListener('click', (e) => {
		if (
			!buscarInput.contains(e.target) &&
			!autocompleteDropdown.contains(e.target)
		) {
			ocultarDropdown()
		}
	})

	async function mostrarDropdown() {
		autocompleteDropdown.innerHTML = ''

		for (const producto of productosSugeridos) {
			const div = document.createElement('div')
			div.className =
				'px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 transition'
			div.dataset.productId = producto.id
			div.setAttribute('role', 'option')
			// Obtener número de parte principal
			const numerosParte = Array.isArray(producto.numerosParte)
				? producto.numerosParte
				: []
			const nroPartePrincipal =
				numerosParte.find((np) => np.esPrincipal)?.nroParte ||
				numerosParte[0]?.nroParte ||
				producto.NroParte ||
				'N/A'

			const stockColor =
				producto.Cantidad > 10
					? 'text-green-600'
					: producto.Cantidad > 0
						? 'text-yellow-600'
						: 'text-red-600'

			div.innerHTML = `
				<div class="flex items-center justify-between">
					<div class="flex-1">
						<span class="font-bold text-indigo-700">[${nroPartePrincipal}]</span>
						<span class="text-gray-800 ml-2">${
							producto.Descripcion || 'Sin descripción'
						}</span>
						<div class="text-xs text-gray-500 mt-1">${producto.marcaNombre || '—'}</div>
					</div>
					<div class="flex items-center gap-4">
						<span class="text-sm font-semibold ${stockColor}">Stock: ${
							producto.Cantidad
						}</span>
						<span class="text-sm font-bold text-gray-700">$${producto.Precio.toFixed(
							2,
						)}</span>
					</div>
				</div>
			`

			div.addEventListener('click', async () => {
				await agregarProducto(producto)
				buscarInput.value = ''
				ocultarDropdown()
			})

			autocompleteDropdown.appendChild(div)
		}

		autocompleteDropdown.classList.remove('hidden')
	}

	function ocultarDropdown() {
		autocompleteDropdown.classList.add('hidden')
		productosSugeridos = []
		selectedIndex = -1
	}

	function actualizarSeleccion() {
		const items = autocompleteDropdown.querySelectorAll('div[data-product-id]')
		items.forEach((item, index) => {
			if (index === selectedIndex) {
				item.classList.add('bg-indigo-100')
				item.classList.remove('hover:bg-indigo-50')
				item.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
			} else {
				item.classList.remove('bg-indigo-100')
				item.classList.add('hover:bg-indigo-50')
			}
		})
	}

	// AGREGAR PRODUCTO A LISTA
	async function agregarProducto(producto) {
		// Validar que haya stock disponible
		if (producto.Cantidad <= 0) {
			await showModalInfo(
				`El producto "${producto.NroParte}" no tiene stock disponible.`,
				'Sin stock',
				'warning',
			)
			return
		}

		const existente = productosVenta.find((p) => p.id === producto.id)

		if (existente) {
			// Validar que no exceda el stock
			if (existente.cantidad >= producto.Cantidad) {
				await showModalInfo(
					`Stock insuficiente. Solo hay ${producto.Cantidad} unidades disponibles.`,
					'Stock insuficiente',
					'warning',
				)
				return
			}
			existente.cantidad++
		} else {
			// Obtener número de parte principal y foto principal
			const numerosParte = Array.isArray(producto.numerosParte)
				? producto.numerosParte
				: producto.NroParte
					? [producto.NroParte]
					: []
			const nroPartePrincipal =
				numerosParte.find((np) => np.esPrincipal)?.numero ||
				numerosParte[0]?.numero ||
				producto.NroParte ||
				'N/A'

			const fotos = Array.isArray(producto.fotos)
				? producto.fotos
				: producto.nombreImagen
					? [{ nombre: producto.nombreImagen, esPrincipal: true }]
					: []
			const fotoPrincipal =
				fotos.find((f) => f.esPrincipal)?.nombre ||
				fotos[0]?.nombre ||
				producto.nombreImagen ||
				null

			productosVenta.push({
				id: producto.id,
				NroParte: nroPartePrincipal,
				Descripcion: producto.Descripcion ?? 'Sin descripción',
				marcaNombre: producto.marcaNombre || '—',
				ubicacion: producto.ubicacion || '—',
				precio: producto.Precio,
				tasa: producto.Tasas,
				cantidad: 1,
				stockActual: producto.Cantidad,
				nombreImagen: fotoPrincipal,
				todasLasFotos: fotos,
			})
		}

		renderTabla()
		actualizarTotales()
	}

	// RENDER TABLA PRODUCTOS
	async function renderTabla() {
		tablaVenta.innerHTML = ''

		if (productosVenta.length === 0) {
			tablaVenta.innerHTML = `
				<tr>
					<td colspan="10" class="nueva-venta__empty">
						<i class="fas fa-cart-shopping mr-2" aria-hidden="true"></i>${window.i18n.t(
							'sales.new.table.noProducts',
						)}
					</td>
				</tr>`
			return
		}

		// Cargar todas las rutas de imágenes en paralelo
		const imagenesPromises = productosVenta.map((p) =>
			p.nombreImagen
				? window.api.producto.getImagenPath(p.nombreImagen)
				: Promise.resolve(null),
		)
		const rutasImagenes = await Promise.all(imagenesPromises)

		productosVenta.forEach((p, index) => {
			const tr = document.createElement('tr')
			tr.dataset.index = index
			const total = (p.precio * p.cantidad * (1 + tasaImpuesto)).toFixed(2)

			const imagePath = rutasImagenes[index]
			const imageUrl = imagePath?.ok ? imagePath.path : null
			const imagenHtml = imageUrl
				? `<img data-imagen="${p.nombreImagen}" src="${imageUrl}" alt="${p.NroParte}" class="producto-imagen nueva-venta__thumb" title="Click para ver" />`
				: '<span class="text-gray-400 text-xs">Sin imagen</span>'

			tr.innerHTML = `
				<td class="text-center">
					<div class="flex items-center justify-center">${imagenHtml}</div>
				</td>
				<td class="font-bold text-slate-900 whitespace-nowrap">${p.NroParte}</td>
				<td class="min-w-[14rem]">${p.Descripcion}</td>
				<td>${p.marcaNombre || '—'}</td>
				<td>${p.ubicacion || '—'}</td>
				<td class="text-center">
					<input type="number" min="1" value="${p.cantidad}"
						aria-label="${window.i18n.t('sales.new.table.quantity')}: ${p.NroParte}"
						class="cantidad-input nueva-venta__control nueva-venta__qty">
				</td>
				<td class="nueva-venta__num">${Number((tasaImpuesto * 100).toFixed(2))}%</td>
				<td class="nueva-venta__num">$${p.precio.toFixed(2)}</td>
				<td class="nueva-venta__num font-bold text-slate-900">$${total}</td>
				<td class="text-center">
					<button type="button" class="btn-eliminar nueva-venta__btn nueva-venta__btn--danger"
						aria-label="${window.i18n.t('sales.new.table.remove')}: ${p.NroParte}">
						<i class="fas fa-trash-can" aria-hidden="true"></i>
						<span>${window.i18n.t('sales.new.table.remove')}</span>
					</button>
				</td>
			`

			tablaVenta.appendChild(tr)
		})
	}

	// Delegación de eventos para la tabla (elimina memory leaks)
	tablaVenta.addEventListener('click', async (e) => {
		const target = e.target

		// Clic en imagen de producto
		if (target.classList.contains('producto-imagen')) {
			const nombreImagen = target.dataset.imagen
			if (nombreImagen) {
				await showImageModal(nombreImagen)
			}
			return
		}

		// Clic en botón eliminar
		if (
			target.classList.contains('btn-eliminar') ||
			target.closest('.btn-eliminar')
		) {
			const btn = target.closest('.btn-eliminar') || target
			const tr = btn.closest('tr')
			const index = parseInt(tr.dataset.index)
			productosVenta.splice(index, 1)
			await renderTabla()
			actualizarTotales()
			return
		}
	})

	// Delegación de eventos para inputs de cantidad
	tablaVenta.addEventListener('change', async (e) => {
		if (e.target.classList.contains('cantidad-input')) {
			const tr = e.target.closest('tr')
			const index = parseInt(tr.dataset.index)
			const p = productosVenta[index]
			const nuevaCantidad = parseInt(e.target.value)

			if (nuevaCantidad > p.stockActual) {
				await showModalInfo(
					`Stock insuficiente. Solo hay ${p.stockActual} unidades disponibles.`,
					'Stock insuficiente',
					'warning',
				)
				await renderTabla()
				return
			}

			productosVenta[index].cantidad = nuevaCantidad
			await renderTabla()
			actualizarTotales()
		}
	})

	// Importe opcional: vacío => 0; negativo o no numérico => error
	function leerMonto(input, nombre) {
		const raw = input.value.trim()
		if (input.validity?.badInput) {
			return { ok: false, error: `${nombre} no es un importe válido.` }
		}
		if (raw === '') return { ok: true, value: 0 }
		const n = Number(raw)
		if (!Number.isFinite(n)) {
			return { ok: false, error: `${nombre} no es un importe válido.` }
		}
		if (n < 0) {
			return { ok: false, error: `${nombre} no puede ser negativo.` }
		}
		return { ok: true, value: Math.round(n * 100) / 100 }
	}

	// Total = Subtotal + Labor + Tax - Descuento; Tax = redondear((Subtotal + Labor) × tasa, 2)
	// (aritmética en céntimos; misma fórmula que backend/services/money-utils.js)
	function calcularImportes() {
		const subtotalC = Math.round(
			productosVenta.reduce((acc, p) => acc + p.precio * p.cantidad, 0) * 100,
		)
		const labor = leerMonto(laborInput, 'Labor')
		const descuento = leerMonto(descuentoInput, 'El descuento')
		const laborC = labor.ok ? Math.round(labor.value * 100) : 0
		const descuentoC = descuento.ok ? Math.round(descuento.value * 100) : 0
		const impuestosC = Math.round(
			((subtotalC + laborC) * Math.round(tasaImpuesto * 1e6)) / 1e6,
		)
		const totalC = subtotalC + laborC + impuestosC - descuentoC
		return {
			labor,
			descuento,
			subtotal: subtotalC / 100,
			impuestos: impuestosC / 100,
			totalSinNegativo: Math.max(0, totalC) / 100,
			totalNegativo: totalC < 0,
		}
	}

	// La tasa viene de Configuración (fracción: 0.1 = 10 %); no hay otra fuente
	async function cargarTasaImpuesto() {
		const res = await window.api.config.get()
		const tasa = Number(res?.data?.ivaPredeterminado)
		if (!res?.ok || !Number.isFinite(tasa) || tasa < 0 || tasa > 1) {
			throw new Error('No se pudo leer la tasa de impuestos de Configuración.')
		}
		tasaImpuesto = tasa
		taxRateLabel.textContent = `(${Number((tasa * 100).toFixed(2))}%)`
	}

	// CALCULAR TOTALES
	function actualizarTotales() {
		const r = calcularImportes()
		subtotalInput.value = r.subtotal.toFixed(2)
		impuestosInput.value = r.impuestos.toFixed(2)
		totalInput.value = r.totalSinNegativo.toFixed(2)
		const laborValor = r.labor.ok ? r.labor.value : 0
		laborResumen.classList.toggle('hidden', !(laborValor > 0))
		laborResumenValor.value = laborValor.toFixed(2)
		laborWrapper.classList.toggle('nueva-venta__group--error', !r.labor.ok)
		laborInput.setAttribute('aria-invalid', String(!r.labor.ok))
		laborError.textContent = r.labor.ok ? '' : r.labor.error
		laborError.classList.toggle('hidden', r.labor.ok)
	}

	// FINALIZAR VENTA
	btnFinalizarVenta.addEventListener('click', async () => {
		if (productosVenta.length === 0) {
			await showModalInfo('Agregue productos a la venta.', 'Aviso')
			return
		}

		// Releer la tasa: si cambió en Configuración, mostrar los nuevos importes antes de guardar
		const tasaAnterior = tasaImpuesto
		try {
			await cargarTasaImpuesto()
		} catch (error) {
			await showModalInfo(error.message, 'Error', 'error')
			return
		}
		if (tasaImpuesto !== tasaAnterior) {
			await renderTabla()
			actualizarTotales()
			await showModalInfo(
				'La tasa de impuestos de Configuración cambió. Revise los importes actualizados.',
				'Aviso',
				'warning',
			)
			return
		}

		// Validar importes antes de crear cliente o venta
		const importes = calcularImportes()
		const errorImporte = !importes.labor.ok
			? importes.labor.error
			: !importes.descuento.ok
				? importes.descuento.error
				: importes.totalNegativo
					? 'El descuento no puede superar el total de la venta.'
					: null
		if (errorImporte) {
			await showModalInfo(errorImporte, 'Aviso', 'warning')
			return
		}

		let idCliente = clienteSelect.value

		// Crear cliente solo si NO hay uno seleccionado Y hay datos de nuevo cliente
		if (!idCliente && clienteNombre.value.trim()) {
			const nuevoCliente = await window.api.cliente.create({
				nombre: clienteNombre.value.trim(),
				telefono: clienteTelefono.value.trim(),
				email: clienteEmail.value.trim(),
				direccion: clienteDireccion.value.trim(),
			})
			idCliente = nuevoCliente.id || nuevoCliente
		}

		if (!idCliente) {
			await showModalInfo('Debe seleccionar o crear un cliente.', 'Aviso')
			return
		}

		// Confirmación antes de generar factura
		const confirmar = await showModalConfirm(
			'¿Deseas generar la factura con los datos ingresados?',
			'Confirmar acción',
		)
		if (!confirmar) return

		// Deshabilitar botón para evitar doble clic
		btnFinalizarVenta.disabled = true
		btnFinalizarVenta.textContent = '⏳ Procesando...'

		// Crear venta con detalles y actualizar stock (backend)
		const subtotal = importes.subtotal
		const impuestos = importes.impuestos
		const descuento = importes.descuento.value
		const labor = importes.labor.value
		const motivoDescuento = motivoDescuentoInput.value.trim()
		const total = importes.totalSinNegativo

		const ventaRes = await window.api.venta.createWithDetails({
			idCliente,
			subtotal: subtotal,
			impuestos,
			total,
			descuento,
			motivoDescuento,
			labor,
			tasaImpuesto,
			detalles: productosVenta.map((p) => ({
				idProducto: p.id,
				cantidad: p.cantidad,
				precioUnitario: p.precio,
				tasaAplicada: tasaImpuesto,
				totalLinea:
					Math.round(p.cantidad * p.precio * (1 + tasaImpuesto) * 100) / 100,
			})),
		})
		if (!ventaRes?.ok) {
			await showModalInfo(
				ventaRes?.error || 'No se pudo completar la venta.',
				'Error',
				'error',
			)
			btnFinalizarVenta.disabled = false
			btnFinalizarVenta.innerHTML = htmlFinalizarOriginal
			return
		}

		// Crear factura
		const facturaRes = await window.api.factura.create({
			idVenta: ventaRes.id,
			numeroFactura: numeroFactura.value.trim(),
			subtotal,
			impuestos,
			total,
			metodoPago: metodoPago.value,
			observaciones: observaciones.value.trim(),
		})

		// Obtener datos reales del cliente del backend
		const clienteRes = await window.api.cliente.getById(idCliente)
		const clienteData = clienteRes.ok
			? clienteRes.cliente
			: {
					nombre: clienteNombre.value.trim(),
					telefono: clienteTelefono.value.trim(),
					email: clienteEmail.value.trim(),
					direccion: clienteDireccion.value.trim(),
				}

		// Almacenar datos de la venta actual para generar PDF
		ventaActual = {
			factura: {
				numeroFactura: numeroFactura.value.trim(),
				fechaEmision: new Date().toISOString(),
				subtotal,
				impuestos,
				descuento,
				labor,
				tasaImpuesto,
				total,
				metodoPago: metodoPago.value,
				observaciones: observaciones.value.trim(),
			},
			cliente: clienteData,
			detalles: productosVenta.map((p) => ({
				nroParte: p.NroParte,
				descripcion: p.Descripcion,
				cantidad: p.cantidad,
				precioUnitario: p.precio,
				tasaAplicada: tasaImpuesto,
			})),
		}

		console.log(idCliente, ' ', ventaRes)
		await showModalInfo(
			'Venta y factura registradas correctamente. Ya puedes descargar el PDF.',
			'Éxito',
			'success',
		)

		// Mostrar botón de descargar PDF
		descargaPDF.setVenta(ventaActual)

		// Limpiar pantalla para nueva venta (excepto factura)
		productosVenta = []
		renderTabla()
		actualizarTotales()
		clienteSelect.value = ''
		clienteNombre.value = ''
		clienteTelefono.value = ''
		clienteEmail.value = ''
		clienteDireccion.value = ''
		descuentoInput.value = ''
		laborInput.value = ''
		motivoDescuentoInput.value = ''
		observaciones.value = ''
		actualizarTotales()
		// Generar nuevo número de factura para siguiente venta
		await cargarNumeroFactura()

		// Rehabilitar botón
		btnFinalizarVenta.disabled = false
		btnFinalizarVenta.innerHTML = htmlFinalizarOriginal
	})

	// ** Agregar evento change al serector
	clienteSelect.addEventListener('change', async () => {
		const idCliente = clienteSelect.value
		if (!idCliente) {
			// Si no hay cliente seleccionado, limpiar campos
			clienteNombre.value = ''
			clienteTelefono.value = ''
			clienteEmail.value = ''
			clienteDireccion.value = ''
			return
		}

		// Obtener cliente por ID
		const res = await window.api.cliente.getById(idCliente)
		if (res.ok) {
			const c = res.cliente
			clienteNombre.value = c.nombre
			clienteTelefono.value = c.telefono || ''
			clienteEmail.value = c.email || ''
			clienteDireccion.value = c.direccion || ''
		}
	})

	// ** Descargar PDF de factura
	btnDescargarPDF.addEventListener('click', () => descargaPDF.descargar())
}
