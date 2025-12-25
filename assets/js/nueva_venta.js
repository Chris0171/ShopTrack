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
				modal.classList.remove('show')
			}
			modalOk.addEventListener('click', onOk)
			modalCancel.addEventListener('click', onCancel)
			modal.classList.add('show')
		})
	}

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

			agregarProducto(producto)
			buscarInput.value = ''
		}
	})

	// AGREGAR PRODUCTO A LISTA
	function agregarProducto(producto) {
		const existente = productosVenta.find((p) => p.id === producto.id)

		if (existente) {
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
			})
		}

		renderTabla()
		actualizarTotales()
	}

	// RENDER TABLA PRODUCTOS
	function renderTabla() {
		tablaVenta.innerHTML = ''

		productosVenta.forEach((p, index) => {
			const tr = document.createElement('tr')
			const total = (p.precio * p.cantidad * (1 + p.tasa)).toFixed(2)

			tr.innerHTML = `
            <td class="p-1 pl-6">${p.NroParte}</td>
            <td class="p-1 pl-6">${p.Descripcion}</td>
            <td class="p-1 pl-6">
                <input type="number" min="1" value="${
									p.cantidad
								}" class="w-16 p-1 pl-6 cantidad-input rounded-xl">
            </td>
            <td class="p-1 pl-6">${(p.tasa * 100).toFixed(0)}%</td>
            <td class="p-1 pl-6">${p.precio.toFixed(2)} €</td>
            <td class="p-1 pl-6 font-semibold">${total} €</td>
            <td class="p-1 pl-6 text-center">
                <button class="btn-eliminar bg-red-600 text-white px-3
								py-2 rounded-lg hover:bg-red-700 hover:scale-110
								active:scale-100 transition duration-300 ease-in-out"><i class="fas fa-trash"></i><b>ELIMINAR</b></button>
            </td>
        `

			// Event listeners seguros
			tr.querySelector('.btn-eliminar').addEventListener('click', () => {
				productosVenta.splice(index, 1)
				renderTabla()
				actualizarTotales()
			})

			tr.querySelector('.cantidad-input').addEventListener('change', (e) => {
				productosVenta[index].cantidad = parseInt(e.target.value)
				renderTabla()
				actualizarTotales()
			})

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

		// Crear cliente si es nuevo
		if (!idCliente && clienteNombre.value.trim()) {
			idCliente = await window.api.cliente.create({
				nombre: clienteNombre.value.trim(),
				telefono: clienteTelefono.value.trim(),
				email: clienteEmail.value.trim(),
				direccion: clienteDireccion.value.trim(),
			})
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
			cliente: {
				nombre: clienteNombre.value,
				telefono: clienteTelefono.value,
				email: clienteEmail.value,
				direccion: clienteDireccion.value,
			},
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
