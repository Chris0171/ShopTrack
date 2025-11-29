export function initNuevaVenta() {
	// Lista temporal de productos agregados a la venta
	let productosVenta = []

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

	const metodoPago = document.getElementById('metodoPago')
	const numeroFactura = document.getElementById('numeroFactura')
	const observaciones = document.getElementById('observaciones')

	const btnFinalizarVenta = document.getElementById('btnFinalizarVenta')

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
	// ** Mensaje de error
	function showFieldError(id, msg, elem) {
		const div = document.getElementById(id)
		if (!div) return

		div.textContent = msg
		div.classList.remove('opacity-0')

		// Ocultar automáticamente
		setTimeout(() => {
			div.classList.add('opacity-0')
			setTimeout(() => {
				div.textContent = ''
				div.classList.remove('opacity-0')
			}, 300)
		}, 2500)

		// Esperar a que el DOM renderice los cambios antes de hacer scroll
		requestAnimationFrame(() => {
			document.getElementById(elem).scrollIntoView({
				behavior: 'smooth',
				block: 'start',
			})
		})
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

	// BUSCADOR DE PRODUCTOS
	buscarInput.addEventListener('keydown', async (e) => {
		if (e.key === 'Enter') {
			const nroParte = buscarInput.value.trim()
			if (!nroParte) return

			const producto = await window.api.producto.buscarProducto(nroParte)

			if (!producto) {
				showFieldError('mensajeError', 'Producto no encontrado', 'buscador')
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
		const total = subtotal + impuestos

		subtotalInput.value = subtotal.toFixed(2)
		impuestosInput.value = impuestos.toFixed(2)
		totalInput.value = total.toFixed(2)
	}

	// FINALIZAR VENTA
	btnFinalizarVenta.addEventListener('click', async () => {
		if (productosVenta.length === 0) {
			showFieldError('errorVenta', 'Agregue productos a la venta.', 'btnVenta')
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
			showFieldError(
				'errorCliente',
				'Debe seleccionar o crear un cliente.',
				'clienteForm'
			)
			return
		}

		if (!numeroFactura.value.trim()) {
			showFieldError(
				'errorFactura',
				'Debe ingresar un número de factura.',
				'facturaForm'
			)
			return
		}

		// Crear venta
		const subtotal = parseFloat(subtotalInput.value)
		const impuestos = parseFloat(impuestosInput.value)
		const total = parseFloat(totalInput.value)

		const idVenta = await window.api.venta.create({
			idCliente,
			subtotal: subtotal,
			impuestos,
			total,
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
		await window.api.factura.create({
			idVenta: idVenta.id,
			numeroFactura: numeroFactura.value.trim(),
			subtotal,
			impuestos,
			total,
			metodoPago: metodoPago.value,
			observaciones: observaciones.value.trim(),
		})

		console.log(idCliente, ' ', idVenta)
		showFieldError(
			'errorVenta',
			'Venta y factura registradas correctamente.',
			'btnVenta'
		)

		// Limpiar pantalla para nueva venta
		productosVenta = []
		renderTabla()
		actualizarTotales()
		clienteSelect.value = ''
		clienteNombre.value = ''
		clienteTelefono.value = ''
		clienteEmail.value = ''
		clienteDireccion.value = ''
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
}
