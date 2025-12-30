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
			tr.className = 'hover:bg-gray-100 transition'

			const descuento = v.descuento || 0
			const subtotal = parseFloat(v.subtotal) || 0
			const impuestos = parseFloat(v.impuestos) || 0
			const total = subtotal + impuestos - descuento

			// Formatear fecha a MM/DD/YYYY
			const fechaObj = new Date(v.fecha)
			const fechaFormato = fechaObj.toLocaleDateString('en-US', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
			})

			tr.innerHTML = `
		<td class="px-4 py-3 font-bold text-indigo-700">${v.numeroFactura || '—'}</td>
		<td class="px-4 py-3">${v.clienteNombre}</td>
		<td class="px-4 py-3 text-right">$${subtotal.toFixed(2)}</td>
		<td class="px-4 py-3 text-right">$${impuestos.toFixed(2)}</td>
		<td class="px-4 py-3 text-right">${
			descuento > 0
				? `<span class="text-red-600 font-medium">-$${descuento.toFixed(
						2
				  )}</span>`
				: '—'
		}</td>
		<td class="px-4 py-3 text-right font-bold text-green-600">$${total.toFixed(
			2
		)}</td>		<td class="px-4 py-3 text-center text-gray-600">${fechaFormato}</td>			<td class="px-4 py-3 text-center">
				<button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm detail-btn"
						data-id="${v.idVenta}" data-fact="${v.numeroFactura}" data-metodo="${
				v.metodoPago || 'N/A'
			}" data-desc="${descuento}" data-sub="${subtotal}" data-imp="${impuestos}" data-tot="${total}">
					<i class="fas fa-eye"></i> Ver
				</button>
			</td>
			<td class="px-4 py-3 text-center">
				<button class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm download-pdf-btn" data-fact="${
					v.numeroFactura
				}" data-id="${v.idVenta}">
					<i class="fas fa-download"></i> PDF
				</button>
			</td>
		`

			tablaBody.appendChild(tr)

			// Evento abrir modal
			tr.querySelector('.detail-btn').addEventListener('click', (e) => {
				const id = e.target.dataset.id
				const factura = e.target.dataset.fact || '—'
				const metodo = e.target.dataset.metodo || 'N/A'
				const descuento = parseFloat(e.target.dataset.desc) || 0
				const subtotal = parseFloat(e.target.dataset.sub) || 0
				const impuestos = parseFloat(e.target.dataset.imp) || 0
				const total = parseFloat(e.target.dataset.tot) || 0
				abrirModal(id, factura, metodo, descuento, subtotal, impuestos, total)
			})

			// Evento descargar PDF
			tr.querySelector('.download-pdf-btn').addEventListener(
				'click',
				async (e) => {
					const numeroFactura = e.currentTarget.dataset.fact
					const idVenta = e.currentTarget.dataset.id
					try {
						await window.api.factura.generatePDF(idVenta)
					} catch (error) {
						console.error('Error al descargar PDF:', error)
					}
				}
			)
		}
	}

	//  FUNCIÓN → MODAL DE DETALLES
	async function abrirModal(
		idVenta,
		factura,
		metodo,
		descuento,
		subtotal,
		impuestos,
		total
	) {
		const modalContainer = document.getElementById('modalContainer')

		const res = await window.api.detalleVenta.getByVentaId(idVenta)
		const detalles = res.detalles
		console.log(detalles)

		const modal = document.createElement('div')
		modal.className =
			'fixed inset-0 bg-black/50 flex items-center justify-center z-50'

		modal.innerHTML = `
		<div class="relative bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden">
		
			<!-- Modal Header -->
			<div class="bg-linear-to-r from-cyan-700 to-indigo-800 px-6 py-4 flex items-center justify-between">
				<h2 class="text-lg font-bold text-white flex items-center gap-2">
					<i class="fas fa-receipt"></i> Factura Nº <span class="text-cyan-300">${factura}</span>
				</h2>
				<button class="text-white hover:text-cyan-200 transition text-2xl closeModal">
					×
				</button>
			</div>

			<!-- Modal Body -->
			<div class="p-6">
				<!-- Detalles Table -->
				<div class="mb-6">
					<h3 class="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
						<i class="fas fa-box text-indigo-600"></i> Productos Detallados
					</h3>
					<div class="max-h-64 overflow-y-auto border border-gray-200 rounded-xl shadow-sm">
						<table class="w-full text-sm">
							<thead>
								<tr class="bg-linear-to-r from-slate-800 via-gray-800 to-gray-900 text-white sticky top-0 z-10">
									<th class="px-4 py-3 text-left font-semibold">Producto</th>
									<th class="px-4 py-3 text-center font-semibold w-20">Cantidad</th>
									<th class="px-4 py-3 text-right font-semibold w-24">Precio Unit.</th>
									<th class="px-4 py-3 text-right font-semibold w-24">Total</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-100">
								${detalles
									.map(
										(d) => `
									<tr class="hover:bg-gray-50 transition">
										<td class="px-4 py-3 text-gray-800">${d.productoDescripcion}</td>
										<td class="px-4 py-3 text-center text-gray-700">${d.cantidad}</td>
										<td class="px-4 py-3 text-right text-gray-700">$${(
											Number(d.precioUnitario) || 0
										).toFixed(2)}</td>
										<td class="px-4 py-3 text-right font-semibold text-green-600">$${(
											Number(d.totalLinea) || 0
										).toFixed(2)}</td>
									</tr>
									`
									)
									.join('')}
							</tbody>
						</table>
					</div>
				</div>

				<!-- Footer: Resumen -->
				<div class="grid grid-cols-2 gap-6 pt-4 border-t border-gray-200">
					<div class="space-y-2">
						<p class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
							<i class="fas fa-credit-card text-indigo-600 mr-2"></i>Método de Pago
						</p>
						<p class="text-lg font-bold text-gray-800 capitalize">${metodo}</p>
					</div>
					<div class="space-y-2 text-right">
						<div class="flex justify-end gap-4 text-sm">
							<span class="text-gray-600">Subtotal:</span>
							<span class="font-semibold text-gray-800 w-20">$${subtotal.toFixed(2)}</span>
						</div>
						<div class="flex justify-end gap-4 text-sm">
							<span class="text-gray-600">Impuestos:</span>
							<span class="font-semibold text-gray-800 w-20">$${impuestos.toFixed(2)}</span>
						</div>
						${
							descuento > 0
								? `<div class="flex justify-end gap-4 text-sm">
									<span class="text-gray-600">Descuento:</span>
									<span class="font-semibold text-red-600 w-20">-$${descuento.toFixed(2)}</span>
								</div>`
								: ''
						}
						<div class="flex justify-end gap-4 text-sm pt-2 border-t border-gray-300">
							<span class="text-gray-800 font-bold">Total:</span>
							<span class="font-bold text-green-600 text-lg w-20">$${total.toFixed(2)}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Modal Footer -->
			<div class="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
				<button class="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-900 text-white font-semibold transition transform hover:scale-105 closeModal">
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
