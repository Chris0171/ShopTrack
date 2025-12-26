export function initClientsList() {
	let clientesActuales = [] // Cache de clientes para ordenamiento
	let filtroActivo = '' // Para mantener filtro al ordenar

	// Normaliza números incluso si vienen con símbolos, comas o formato local
	const toNumber = (value) => {
		if (value === null || value === undefined) return 0
		if (typeof value === 'number') return Number.isFinite(value) ? value : 0

		// Ejemplos válidos: "$1,234.56", "1.234,56", "1 234,56", "1234"
		let cleaned = String(value).trim()
		// Quitar espacios y símbolos de moneda
		cleaned = cleaned.replace(/[^0-9,.-]/g, '')

		// Si tiene coma y no tiene punto, asumimos coma como decimal
		if (cleaned.includes(',') && !cleaned.includes('.')) {
			cleaned = cleaned.replace(/\./g, '') // miles con punto
			cleaned = cleaned.replace(',', '.')
		} else {
			// Quitar separadores de miles con coma
			cleaned = cleaned.replace(/,/g, '')
		}

		const num = Number(cleaned)
		return Number.isFinite(num) ? num : 0
	}

	// Convierte fecha a timestamp seguro
	const toTimestamp = (value) => {
		if (!value) return 0
		const t = new Date(value).getTime()
		return Number.isFinite(t) ? t : 0
	}

	// Buscador en vivo
	document.getElementById('searchInput').addEventListener('input', function () {
		filtroActivo = this.value.toLowerCase()
		renderizarTabla(clientesActuales)
	})

	// Ordenamiento de columnas (solo las columnas marcadas como sortable)
	const columnasSortable = [
		'id',
		'nombre',
		'telefono',
		'totalVentas',
		'totalArticulos',
		'totalGastado',
		'ultimaCompra',
	]

	document.querySelectorAll('th.sortable').forEach((th, idx) => {
		let asc = true
		th.addEventListener('click', () => {
			// Mapear índice visible (solo sortables) a propiedad
			const prop = columnasSortable[idx]

				// Ordenar array de datos
				clientesActuales.sort((a, b) => {
				let A = a[prop]
				let B = b[prop]

				// Manejar valores nulos o undefined
				if (A === null || A === undefined) A = 0
				if (B === null || B === undefined) B = 0

				// Columnas numéricas: id, totalVentas, totalArticulos, totalGastado
				if (['id', 'totalVentas', 'totalArticulos', 'totalGastado'].includes(prop)) {
					const numA = toNumber(A)
					const numB = toNumber(B)
					return asc ? numA - numB : numB - numA
				}

				// Columna de fecha
				if (prop === 'ultimaCompra') {
					const dateA = toTimestamp(A)
					const dateB = toTimestamp(B)
					return asc ? dateA - dateB : dateB - dateA
				}

				// Ordenar alfabéticamente si es string
				return asc ? String(A).localeCompare(String(B)) : String(B).localeCompare(String(A))
			})

			asc = !asc

			// Actualizar indicador visual
			document.querySelectorAll('th.sortable').forEach((header) => {
				header.classList.remove('sort-asc', 'sort-desc')
			})
			th.classList.add(asc ? 'sort-desc' : 'sort-asc')

			renderizarTabla(clientesActuales)
		})
	})

	cargarClientes((clientes) => {
		// Normalizar tipos para ordenar correctamente (números y fechas)
		clientesActuales = clientes.map((c) => ({
			...c,
			id: toNumber(c.id),
			totalVentas: toNumber(c.totalVentas),
			totalArticulos: toNumber(c.totalArticulos),
			totalGastado: toNumber(c.totalGastado),
			ultimaCompra: c.ultimaCompra || '',
		}))
		renderizarTabla(clientesActuales)
	})
}

function renderizarTabla(clientes) {
	const tbody = document.getElementById('tbodyClientes')
	const filtro = document.getElementById('searchInput').value.toLowerCase()

	// Filtrar clientes según búsqueda
	const clientesFiltrados = clientes.filter((c) => c.nombre.toLowerCase().includes(filtro))

	if (clientesFiltrados.length === 0) {
		tbody.innerHTML = `
			<tr>
				<td colspan="9" class="text-center py-6 text-gray-500 text-lg">
					${filtro ? '🔍 Sin resultados' : '📋 No hay clientes registrados'}
				</td>
			</tr>`
		return
	}

	tbody.innerHTML = clientesFiltrados
		.map(
			(c) => `
			<tr class="hover:bg-gray-100 transition">
				<td class="px-4 py-3 font-bold text-indigo-700">${c.id}</td>
				<td class="px-4 py-3 font-semibold text-gray-800">${c.nombre}</td>
				<td class="px-4 py-3 text-gray-600">${c.telefono || '—'}</td>
				<td class="px-4 py-3 text-gray-600">${c.email || '—'}</td>
				<td class="px-4 py-3 text-gray-600">${c.direccion || '—'}</td>
				<td class="px-4 py-3 text-right font-medium text-gray-700">${c.totalVentas}</td>
				<td class="px-4 py-3 text-right font-medium text-gray-700">${c.totalArticulos}</td>
				<td class="px-4 py-3 text-right font-bold text-green-600">$${c.totalGastado.toFixed(2)}</td>
				<td class="px-4 py-3 text-gray-600">${formatoFecha(c.ultimaCompra)}</td>
			</tr>
		`
		)
		.join('')
}

function formatoFecha(fecha) {
	if (!fecha) return '—'
	const fechaObj = new Date(fecha)
	return fechaObj.toLocaleDateString('en-US', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	})
}

async function cargarClientes(callback) {
	const resp = await window.api.cliente.getAllWithStats()
	const tbody = document.getElementById('tbodyClientes')

	if (!resp.ok) {
		tbody.innerHTML = `
			<tr>
				<td colspan="9" class="text-center py-6 text-gray-500 text-lg">
					❌ Error cargando datos
				</td>
			</tr>`
		return
	}

	const clientes = resp.clientes

	if (clientes.length === 0) {
		tbody.innerHTML = `
			<tr>
				<td colspan="9" class="text-center py-6 text-gray-500 text-lg">
					📋 No hay clientes registrados
				</td>
			</tr>`
		return
	}

	if (callback) callback(clientes)
}
