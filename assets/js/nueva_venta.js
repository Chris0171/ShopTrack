export function initNuevaVenta() {
	// Lista temporal de productos agregados a la venta
	let productosVenta = []
	let ventaActual = null // Almacenar datos de la venta actual

	const buscarInput = document.getElementById('buscarInput')
	const tablaVenta = document.getElementById('tablaVenta')

	const clienteSelect = document.getElementById('clienteSelect')
	const clienteNombre = document.getElementById('clienteNombre')
	const clienteTelefono = document.getElementById('clienteTelefono')
	const clienteEmail = document.getElementById('clienteEmail')
	const clienteDireccion = document.getElementById('clienteDireccion')

	const subtotalInput = document.getElementById('subtotalVenta')
	const impuestosInput = document.getElementById('impuestosVenta')
	const totalInput = document.getElementById('totalVenta')
	const descuentoInput = document.getElementById('descuentoVenta')
	const motivoDescuentoInput = document.getElementById('motivoDescuento')

	const metodoPago = document.getElementById('metodoPago')
	const numeroFactura = document.getElementById('numeroFactura')
	const observaciones = document.getElementById('observaciones')

	const btnFinalizarVenta = document.getElementById('btnFinalizarVenta')
	const btnDescargarPDF = document.getElementById('btnDescargarPDF')

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

	function showImageModal(nombreImagen) {
		if (!nombreImagen) return
		modalImage.src = `./assets/images/productos/${nombreImagen}`
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
		variant = 'confirm'
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

	// Event listener para descuento
	descuentoInput.addEventListener('change', () => {
		actualizarTotales()
	})

	// BUSCADOR DE PRODUCTOS
	buscarInput.addEventListener('keydown', async (e) => {
		if (e.key === 'Enter') {
			const nroParte = buscarInput.value.trim()
			if (!nroParte) return

			const producto = await window.api.producto.buscarProducto(nroParte)

			if (!producto) {
				await showModalInfo('Producto no encontrado', 'Aviso')
				buscarInput.focus()
				return
			}

			await agregarProducto(producto)
			buscarInput.value = ''
		}
	})

	// AGREGAR PRODUCTO A LISTA
	async function agregarProducto(producto) {
		// Validar que haya stock disponible
		if (producto.Cantidad <= 0) {
			await showModalInfo(
				`El producto "${producto.NroParte}" no tiene stock disponible.`,
				'Sin stock',
				'warning'
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
					'warning'
				)
				return
			}
			existente.cantidad++
		} else {
			productosVenta.push({
				id: producto.id,
				NroParte: producto.NroParte,
				Descripcion: producto.Descripcion ?? 'Sin descripción',
				precio: producto.Precio,
				tasa: producto.Tasas,
				cantidad: 1,
				stockActual: producto.Cantidad,
				nombreImagen: producto.nombreImagen || null,
			})
		}

		renderTabla()
		actualizarTotales()
	}

	// RENDER TABLA PRODUCTOS
	function renderTabla() {
		tablaVenta.innerHTML = ''

		if (productosVenta.length === 0) {
			tablaVenta.innerHTML = `
				<tr>
					<td colspan="8" class="text-center py-8 text-gray-500 font-semibold">
						🛒 No hay productos agregados. Busca y agrega productos a la venta.
					</td>
				</tr>`
			return
		}

		productosVenta.forEach((p, index) => {
			const tr = document.createElement('tr')
			tr.className = 'hover:bg-gray-50'
			const total = (p.precio * p.cantidad * (1 + p.tasa)).toFixed(2)

			const imagePath = p.nombreImagen
				? `./assets/images/productos/${p.nombreImagen}`
				: null
			const imagenHtml = imagePath
				? `<img id="venta_img_${p.id}" src="${imagePath}" alt="${p.NroParte}" class="w-12 h-12 object-cover rounded border border-gray-300 cursor-pointer hover:border-indigo-500 hover:shadow-lg transition" title="Click para ver" />`
				: '<span class="text-gray-400 text-xs">Sin imagen</span>'

			tr.innerHTML = `
				<td class="py-3 px-4 text-center">
					<div class="flex items-center justify-center">${imagenHtml}</div>
				</td>
				<td class="py-3 px-4 text-sm font-bold text-gray-800">${p.NroParte}</td>
				<td class="py-3 px-4 text-sm text-gray-700">${p.Descripcion}</td>
				<td class="py-3 px-4 text-right">
					<input type="number" min="1" value="${p.cantidad}" 
						class="cantidad-input w-20 p-2 text-center border-2 border-indigo-300 rounded-lg focus:border-indigo-600 outline-none font-semibold">
				</td>
				<td class="py-3 px-4 text-sm text-right text-gray-700">${(p.tasa * 100).toFixed(
					0
				)}%</td>
				<td class="py-3 px-4 text-sm text-right text-gray-800 font-semibold">$${p.precio.toFixed(
					2
				)}</td>
				<td class="py-3 px-4 text-sm text-right font-bold text-indigo-700">$${total}</td>
				<td class="py-3 px-4 text-center">
					<button class="btn-eliminar bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-semibold shadow transition transform hover:scale-105">
						🗑️ Eliminar
					</button>
				</td>
			`

			const thumbImg = tr.querySelector(`#venta_img_${p.id}`)
			if (thumbImg && p.nombreImagen) {
				thumbImg.addEventListener('click', () => {
					showImageModal(p.nombreImagen)
				})
			}

			// Event listeners seguros
			tr.querySelector('.btn-eliminar').addEventListener('click', () => {
				productosVenta.splice(index, 1)
				renderTabla()
				actualizarTotales()
			})

			tr.querySelector('.cantidad-input').addEventListener(
				'change',
				async (e) => {
					const nuevaCantidad = parseInt(e.target.value)
					if (nuevaCantidad > p.stockActual) {
						await showModalInfo(
							`Stock insuficiente. Solo hay ${p.stockActual} unidades disponibles.`,
							'Stock insuficiente',
							'warning'
						)
						renderTabla()
						return
					}
					productosVenta[index].cantidad = nuevaCantidad
					renderTabla()
					actualizarTotales()
				}
			)

			tablaVenta.appendChild(tr)
		})
	}

	// CALCULAR TOTALES
	function actualizarTotales() {
		const subtotal = productosVenta.reduce(
			(acc, p) => acc + p.precio * p.cantidad,
			0
		)
		const impuestos = productosVenta.reduce(
			(acc, p) => acc + p.precio * p.cantidad * p.tasa,
			0
		)
		const descuento = parseFloat(descuentoInput.value) || 0
		const total = subtotal + impuestos - descuento

		subtotalInput.value = subtotal.toFixed(2)
		impuestosInput.value = impuestos.toFixed(2)
		totalInput.value = total.toFixed(2)
	}

	// FINALIZAR VENTA
	btnFinalizarVenta.addEventListener('click', async () => {
		if (productosVenta.length === 0) {
			await showModalInfo('Agregue productos a la venta.', 'Aviso')
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

		if (!numeroFactura.value.trim()) {
			await showModalInfo('Debe ingresar un número de factura.', 'Aviso')
			return
		}

		// Confirmación antes de generar factura
		const confirmar = await showModalConfirm(
			'¿Deseas generar la factura con los datos ingresados?',
			'Confirmar acción'
		)
		if (!confirmar) return

		// Deshabilitar botón para evitar doble clic
		btnFinalizarVenta.disabled = true
		btnFinalizarVenta.textContent = '⏳ Procesando...'

		// Crear venta
		const subtotal = parseFloat(subtotalInput.value)
		const impuestos = parseFloat(impuestosInput.value)
		const descuento = parseFloat(descuentoInput.value) || 0
		const motivoDescuento = motivoDescuentoInput.value.trim()
		const total = parseFloat(totalInput.value)

		const idVenta = await window.api.venta.create({
			idCliente,
			subtotal: subtotal,
			impuestos,
			total,
			descuento,
			motivoDescuento,
		})

		// Crear detalles de venta y actualizar stock
		for (const p of productosVenta) {
			await window.api.detalleVenta.create({
				idVenta: idVenta.id,
				idProducto: p.id,
				cantidad: p.cantidad,
				precioUnitario: p.precio,
				tasaAplicada: p.tasa,
				totalLinea: p.cantidad * p.precio * (1 + p.tasa),
			})
			// Reducir stock
			const nuevoStock = Math.max(0, p.stockActual - p.cantidad)
			await window.api.producto.actualizarStock(p.id, nuevoStock)
		}

		// Crear factura
		const facturaRes = await window.api.factura.create({
			idVenta: idVenta.id,
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
				tasaAplicada: p.tasa,
			})),
		}

		console.log(idCliente, ' ', idVenta)
		await showModalInfo(
			'Venta y factura registradas correctamente. Ya puedes descargar el PDF.',
			'Éxito',
			'success'
		)

		// Mostrar botón de descargar PDF
		btnDescargarPDF.classList.remove('hidden')

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
		motivoDescuentoInput.value = ''
		numeroFactura.value = ''
		observaciones.value = ''

		// Rehabilitar botón
		btnFinalizarVenta.disabled = false
		btnFinalizarVenta.textContent = 'Generar Factura'
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
	btnDescargarPDF.addEventListener('click', async () => {
		if (!ventaActual) {
			await showModalInfo('No hay factura para descargar.', 'Aviso')
			return
		}

		btnDescargarPDF.disabled = true
		btnDescargarPDF.textContent = '⏳ Generando PDF...'

		try {
			const resultado = await window.api.factura.generarPDF(ventaActual)

			if (resultado.ok) {
				await showModalInfo('PDF generado exitosamente.', 'Éxito', 'success')
				// Abrir archivo en explorador
				await window.api.general.abrirArchivo(resultado.ruta)
			} else {
				await showModalInfo(`Error: ${resultado.error}`, 'Error', 'error')
			}
		} catch (error) {
			await showModalInfo(
				`Error al generar PDF: ${error.message}`,
				'Error',
				'error'
			)
		} finally {
			btnDescargarPDF.disabled = false
			btnDescargarPDF.textContent = '📄 Descargar Factura PDF'
		}
	})
}
