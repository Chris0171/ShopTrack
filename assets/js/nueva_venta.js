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
	const clientes = await window.api.cliente.obtenerClientes()
	clientes.forEach((c) => {
		const opt = document.createElement('option')
		opt.value = c.id
		opt.textContent = `${c.nombre} (${c.telefono || 'sin teléfono'})`
		clienteSelect.appendChild(opt)
	})
}
// cargarClientes()

// BUSCADOR DE PRODUCTOS
buscarInput.addEventListener('keydown', async (e) => {
	if (e.key === 'Enter') {
		const nroParte = buscarInput.value.trim()
		if (!nroParte) return

		const producto = await window.api.producto.buscarProducto(nroParte)

		if (!producto) {
			alert('Producto no encontrado')
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
            <td class="p-2 border">${p.NroParte}</td>
            <td class="p-2 border">${p.Descripcion}</td>
            <td class="p-2 border">
                <input type="number" min="1" value="${
									p.cantidad
								}" class="w-16 p-1 border rounded cantidad-input">
            </td>
            <td class="p-2 border">${(p.tasa * 100).toFixed(0)}%</td>
            <td class="p-2 border">${p.precio.toFixed(2)} €</td>
            <td class="p-2 border font-semibold">${total} €</td>
            <td class="p-2 border text-center">
                <button class="btn-eliminar bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">X</button>
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
		alert('No hay productos en la venta.')
		return
	}

	let idCliente = clienteSelect.value

	// Crear cliente si es nuevo
	if (!idCliente && clienteNombre.value.trim()) {
		idCliente = await window.api.cliente.crearCliente({
			nombre: clienteNombre.value.trim(),
			telefono: clienteTelefono.value.trim(),
			email: clienteEmail.value.trim(),
			direccion: clienteDireccion.value.trim(),
		})
	}

	if (!idCliente) {
		alert('Debe seleccionar o crear un cliente.')
		return
	}

	// Crear venta
	const subtotal = parseFloat(subtotalInput.value)
	const impuestos = parseFloat(impuestosInput.value)
	const total = parseFloat(totalInput.value)

	const idVenta = await window.api.venta.crearVenta({
		idCliente,
		subtotal,
		impuestos,
		total,
	})

	// Crear detalles de venta y actualizar stock
	for (const p of productosVenta) {
		await window.api.detalleVenta.crearDetalle({
			idVenta,
			idProducto: p.id,
			cantidad: p.cantidad,
			precioUnitario: p.precio,
			tasaAplicada: p.tasa,
			totalLinea: p.cantidad * p.precio * (1 + p.tasa),
		})

		// Reducir stock
		const nuevoStock = Math.max(0, p.Cantidad - p.cantidad) // opcional
		await window.api.producto.actualizarStock(p.id, nuevoStock)
	}

	// Crear factura
	await window.api.factura.crearFactura({
		idVenta,
		numeroFactura: numeroFactura.value.trim(),
		subtotal,
		impuestos,
		total,
		metodoPago: metodoPago.value,
		observaciones: observaciones.value.trim(),
	})

	alert('Venta y factura registradas correctamente.')
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
