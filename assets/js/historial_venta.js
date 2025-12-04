export function initHistorialVenta() {
	const tablaBody = document.getElementById('tablaVentasBody')
	const loadingDiv = document.getElementById('loading')

	const inputFactura = document.getElementById('filtroFactura')
	const inputCliente = document.getElementById('filtroCliente')
	const selectMetodo = document.getElementById('filtroMetodo')

	let limit = 20
	let offset = 0
	let cargando = false
	let noHayMas = false

	let ventasCache = []

	cargarVentas()

	//  CARGAR PAGINADO
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
		ventasCache.push(...ventas)

		renderTabla()

		loadingDiv.classList.add('hidden')
		cargando = false
	}

	//  RENDER TABLA PRINCIPAL
	function renderTabla() {
		const factura = inputFactura.value.toLowerCase()
		const cliente = inputCliente.value.toLowerCase()
		const metodo = selectMetodo.value.toLowerCase()

		tablaBody.innerHTML = ''

		for (const v of ventasCache) {
			if (
				!(v.numeroFactura || '').toLowerCase().includes(factura) ||
				!(v.clienteNombre || '').toLowerCase().includes(cliente) ||
				!(v.metodoPago || '').toLowerCase().includes(metodo)
			)
				continue

			const tr = document.createElement('tr')
			tr.className = 'border-b hover:bg-gray-50 transition'

			tr.innerHTML = `
				<td class="px-4 py-2 font-semibold">${v.numeroFactura || '—'}</td>
				<td class="px-4 py-2">${v.clienteNombre}</td>
				<td class="px-4 py-2">${v.metodoPago || '—'}</td>
				<td class="px-4 py-2">${v.subtotal} €</td>
				<td class="px-4 py-2">${v.impuestos} €</td>
				<td class="px-4 py-2 font-bold">${v.total} €</td>
				<td class="px-4 py-2">${v.fecha}</td>
				<td class="px-4 py-2">
					<button class="px-3 py-1 bg-blue-600 text-white rounded detail-btn"
							data-id="${v.idVenta}" data-fact="${v.numeroFactura}">
						Ver
					</button>
				</td>
				<td class="px-4 py-2">
					<button class="px-3 py-1 bg-gray-700 text-white rounded">
						Descargar
					</button>
				</td>
			`

			tablaBody.appendChild(tr)

			// Evento abrir modal
			tr.querySelector('.detail-btn').addEventListener('click', (e) => {
				const id = e.target.dataset.id
				const factura = e.target.dataset.fact || '—'
				abrirModal(id, factura)
			})
		}
	}

	//  FUNCIÓN → MODAL DE DETALLES
	async function abrirModal(idVenta, factura) {
		const modalContainer = document.getElementById('modalContainer')

		const res = await window.api.detalleVenta.getByVentaId(idVenta)
		const detalles = res.detalles
		console.log(detalles)

		const modal = document.createElement('div')
		modal.className =
			'fixed inset-0 bg-black/50 flex items-center justify-center z-50'

		modal.innerHTML = `
		<div class="bg-white w-full max-w-2xl rounded-xl shadow-xl p-6 relative animate-fade-in">
		
			<button class="absolute top-3 right-3 text-gray-600 hover:text-black text-xl font-bold closeModal">
				×
			</button>

			<h2 class="text-xl font-bold text-gray-800 mb-4">
				Detalles de venta con factura Nº ${factura}
			</h2>

			<div class="max-h-96 overflow-y-auto border rounded-lg">
				<table class="w-full text-left text-gray-700">
					<thead class="bg-gray-100 border-b sticky top-0 z-10">
						<tr>
							<th class="p-2">Producto</th>
							<th class="p-2">Cantidad</th>
							<th class="p-2">Precio</th>
							<th class="p-2 pr-6 text-right">Total</th>
						</tr>
					</thead>
					<tbody>
						${detalles
							.map(
								(d) => `
								<tr class="border-b">
									<td class="p-2">${d.productoDescripcion}</td>
									<td class="p-2 pl-8">${d.cantidad}</td>
									<td class="p-2">${(Number(d.precioUnitario) || 0).toFixed(2)} €</td>
									<td class="p-2 text-right">${(Number(d.totalLinea) || 0).toFixed(2)} €</td>
								</tr>
							`
							)
							.join('')}
					</tbody>
				</table>
			</div>

			<div class="flex justify-end mt-5">
				<button class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 closeModal">
					Cerrar
				</button>
			</div>
		</div>
	`

		modalContainer.appendChild(modal)

		// Eventos para cerrar
		modal.querySelectorAll('.closeModal').forEach((btn) => {
			btn.addEventListener('click', () => modal.remove())
		})
	}

	//  EVENTOS FILTROS
	inputFactura.addEventListener('input', renderTabla)
	inputCliente.addEventListener('input', renderTabla)
	selectMetodo.addEventListener('change', renderTabla)

	//  SCROLL INFINITO
	window.addEventListener('scroll', () => {
		const scrollTop = window.scrollY
		const viewport = window.innerHeight
		const fullHeight = document.body.scrollHeight

		if (scrollTop + viewport >= fullHeight - 200) {
			cargarVentas()
		}
	})
}
