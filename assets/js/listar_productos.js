export function initProductList() {
	const tablaBody = document.getElementById('tablaProductosBody')
	const filtroNroParte = document.getElementById('filtroNroParte')
	const filtroDescripcion = document.getElementById('filtroDescripcion')

	const prevPageBtn = document.getElementById('prevPage')
	const nextPageBtn = document.getElementById('nextPage')
	const paginaActualSpan = document.getElementById('paginaActual')

	let pagina = 1
	let limite = 10 // Puedes cambiar este valor dinámicamente

	async function cargarProductos() {
		const filtros = {
			NroParte: filtroNroParte.value.trim(),
			Descripcion: filtroDescripcion.value.trim(),
			pagina,
			limite,
		}

		// Llamada a IPC preload
		const result = await window.api.producto.getPaginated(filtros)
		const { productos, totalPaginas } = result

		// Limpiar tabla
		tablaBody.innerHTML = ''

		productos.forEach((p) => {
			const tr = document.createElement('tr')
			tr.className = 'border-b hover:bg-gray-100'

			tr.innerHTML = `
        <td class="py-2 px-4 border">${p.NroParte}</td>
        <td class="py-2 px-4 border">${p.Descripcion}</td>
        <td class="py-2 px-4 border">${p.Cantidad}</td>
        <td class="py-2 px-4 border">${p.Precio.toFixed(2)}</td>
        <td class="py-2 px-4 border">${p.Tasas.toFixed(2)}</td>
        <td class="py-2 px-4 border text-center">
          <button class="bg-yellow-400 px-2 py-1 rounded hover:bg-yellow-500" disabled>Actualizar</button>
        </td>
        <td class="py-2 px-4 border text-center">
          <button id="btn_${p.id}" class="bg-red-500 
					text-white px-2 py-1 rounded hover:bg-red-600">Eliminar</button>
        </td>
      `

			tablaBody.appendChild(tr)

			document
				.getElementById(`btn_${p.id}`)
				.addEventListener('click', async (e) => {
					if (confirm('¿Desea eliminar este producto?')) {
						window.api.producto
							.delete(p.id)
							.then(() => cargarProductos())
							.catch((err) => console.log('Error al eliminar: ' + err.message))
					}
				})
		})

		// Actualizar número de página
		paginaActualSpan.textContent = `Página ${pagina} de ${totalPaginas}`

		// Mostrar u ocultar botones de paginación
		prevPageBtn.style.display = pagina > 1 ? 'inline-block' : 'none'
		nextPageBtn.style.display = pagina < totalPaginas ? 'inline-block' : 'none'
	}
	// Filtrar automáticamente al escribir
	filtroNroParte.addEventListener('input', () => {
		pagina = 1
		cargarProductos()
	})

	filtroDescripcion.addEventListener('input', () => {
		pagina = 1
		cargarProductos()
	})

	// Paginación
	prevPageBtn.addEventListener('click', () => {
		if (pagina > 1) {
			pagina--
			cargarProductos()
		}
	})

	nextPageBtn.addEventListener('click', () => {
		pagina++
		cargarProductos()
	})

	// Inicializar tabla
	cargarProductos()
}
