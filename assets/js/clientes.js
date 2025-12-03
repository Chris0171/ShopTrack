export function initClientsList() {
	// Buscador en vivo
	document.getElementById('searchInput').addEventListener('input', function () {
		const filtro = this.value.toLowerCase()
		const filas = document.querySelectorAll('#tbodyClientes tr')

		filas.forEach((fila) => {
			const nombre = fila.children[1].textContent.toLowerCase()
			fila.style.display = nombre.includes(filtro) ? '' : 'none'
		})
	})

	// Ordenamiento de columnas
	document.querySelectorAll('th.sortable').forEach((th, idx) => {
		let asc = true
		th.addEventListener('click', () => {
			const filas = Array.from(document.querySelectorAll('#tbodyClientes tr'))
			filas.sort((a, b) => {
				const A = a.children[idx].textContent.trim()
				const B = b.children[idx].textContent.trim()

				if (!isNaN(A) && !isNaN(B)) {
					return asc ? A - B : B - A
				}
				return asc ? A.localeCompare(B) : B.localeCompare(A)
			})

			asc = !asc

			const tbody = document.getElementById('tbodyClientes')
			tbody.innerHTML = ''
			filas.forEach((f) => tbody.appendChild(f))
		})
	})

	cargarClientes()
}
function formatoFecha(fecha) {
	if (!fecha) return '—'
	return new Date(fecha).toLocaleString('es-ES')
}
async function cargarClientes() {
	const resp = await window.api.cliente.getAllWithStats()
	const tbody = document.getElementById('tbodyClientes')

	if (!resp.ok) {
		tbody.innerHTML = `
                    <tr>
                        <td colspan="9" class="text-center py-6 text-gray-500 text-lg">
                            Error cargando datos
                        </td>
                    </tr>`
		return
	}

	const clientes = resp.clientes

	if (clientes.length === 0) {
		tbody.innerHTML = `
                    <tr>
                        <td colspan="9" class="text-center py-6 text-gray-500 text-lg">
                            No hay clientes registrados
                        </td>
                    </tr>`
		return
	}

	tbody.innerHTML = clientes
		.map(
			(c) => `
                <tr class="hover:bg-gray-400 transition">
                    <td class="pl-4">${c.id}</td>
                    <td class="pl-4 font-medium text-gray-800">${c.nombre}</td>
                    <td class="px-4 py-3">${c.telefono || '—'}</td>
                    <td class="pl-4">${c.email || '—'}</td>
                    <td class="pl-4">${c.direccion || '—'}</td>
                    <td class="pr-15 text-right">${c.totalVentas}</td>
                    <td class="pr-19 text-right">${c.totalArticulos}</td>
                    <td class="pr-19 text-right font-semibold text-gray-800">${c.totalGastado.toFixed(
											2
										)} $</td>
                    <td class="px-4 py-3">${formatoFecha(c.ultimaCompra)}</td>
                </tr>
            `
		)
		.join('')
}
