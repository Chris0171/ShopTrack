export function initHistorialVenta() {
	console.log('scripts cargado')
	const ventasList = document.getElementById('ventasList')
	const loadingDiv = document.getElementById('loading')

	let limit = 10
	let offset = 0
	let cargando = false
	let noHayMas = false

	// Cargar primera tanda
	cargarVentas()

	// ==== Cargar lista de ventas paginadas =====
	async function cargarVentas() {
		if (cargando || noHayMas) return
		cargando = true

		loadingDiv.classList.remove('hidden')

		const res = await window.api.detalleVenta.getPaginated(limit, offset)

		if (!res.ok) {
			console.error('Error cargando ventas', res.error)
			return
		}

		const ventas = res.ventas

		if (ventas.length < limit) noHayMas = true

		offset += limit

		for (const v of ventas) {
			const card = await crearCardVenta(v)
			ventasList.appendChild(card)
		}

		loadingDiv.classList.add('hidden')
		cargando = false
	}

	// ==== Crear tarjeta profesional de venta =====
	async function crearCardVenta(v) {
		const detalles = await window.api.detalleVenta.getByVentaId(v.idVenta)
		const d = detalles.detalles

		const wrapper = document.createElement('div')
		wrapper.className = 'bg-white rounded-xl shadow p-4 border border-gray-200'

		wrapper.innerHTML = `
		<div class="flex justify-between items-center">
			<h2 class="text-xl font-bold text-gray-700">Venta #${v.idVenta}</h2>
			<span class="text-sm text-gray-500">${v.fecha}</span>
		</div>

		<div class="mt-2 text-gray-700">
			<p><span class="font-semibold">Cliente:</span> ${v.clienteNombre}</p>
			<p><span class="font-semibold">Tel:</span> ${v.clienteTelefono || '—'}</p>
			<p><span class="font-semibold">Email:</span> ${v.clienteEmail || '—'}</p>
		</div>

		<hr class="my-3">

		<div class="space-y-2">
			<p class="font-semibold text-gray-600">Detalles:</p>
			${d
				.map(
					(item) => `
				<div class="text-sm text-gray-700 border-b py-1 flex justify-between">
					<span>${item.productoDescripcion} × ${item.cantidad}</span>
					<span>${item.totalLinea.toFixed(2)}€</span>
				</div>
			`
				)
				.join('')}
		</div>

		<hr class="my-3">

		<div class="text-gray-800">
			<p><strong>Subtotal:</strong> ${v.subtotal} €</p>
			<p><strong>Impuestos:</strong> ${v.impuestos} €</p>
			<p class="text-lg font-bold"><strong>Total:</strong> ${v.total} €</p>
		</div>

		<hr class="my-3">

		<div class="text-gray-600">
			<p><strong>Factura:</strong> ${v.numeroFactura || '—'}</p>
			<p><strong>Método pago:</strong> ${v.metodoPago || '—'}</p>
			<p><strong>Estado:</strong> ${v.estado || '—'}</p>
		</div>
	`

		return wrapper
	}

	// ==== Scroll infinito ====
	window.addEventListener('scroll', () => {
		const scrollTop = window.scrollY
		const viewport = window.innerHeight
		const fullHeight = document.body.scrollHeight

		if (scrollTop + viewport >= fullHeight - 200) {
			cargarVentas()
		}
	})
}
