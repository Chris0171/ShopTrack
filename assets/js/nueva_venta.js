// LISTA TEMPORAL DE PRODUCTOS AGREGADOS A LA VENTA
let productosVenta = []

const buscarInput = document.getElementById('buscarInput')
const tablaVenta = document.getElementById('tablaVenta')

console.log('Nueva venta cargada 👍')

// CUANDO EL USUARIO PRESIONA ENTER EN EL BUSCADOR
buscarInput.addEventListener('keydown', async (e) => {
	if (e.key === 'Enter') {
		const nroParte = buscarInput.value.trim()
		if (!nroParte) return

		// Buscar en BD mediante main
		const producto = await window.api.buscarProducto(nroParte)

		if (!producto) {
			mensajeError.textContent = 'Producto no encontrado'
			buscarInput.focus()
			return
		} else {
			mensajeError.textContent = '' // limpiar mensaje
		}

		agregarProducto(producto)
		buscarInput.value = ''
	}
})

// AGREGAR O AUMENTAR CANTIDAD
function agregarProducto(producto) {
	const existente = productosVenta.find((p) => p.id === producto.id)

	if (existente) {
		existente.cantidad++
	} else {
		productosVenta.push({
			id: producto.id,
			NroParte: producto.NroParte,
			descripcion: producto.descripcion ?? 'Sin descripción',
			precio: producto.Precio,
			tasa: producto.Tasas,
			cantidad: 1,
		})
	}

	renderTabla()
}

// RENDERIZAR TABLA SIN INLINE EVENTS
function renderTabla() {
	tablaVenta.innerHTML = ''

	productosVenta.forEach((p, index) => {
		const tr = document.createElement('tr')
		const total = (p.precio * p.cantidad * (1 + p.tasa)).toFixed(2)

		tr.innerHTML = `
            <td class="p-2 border">${p.NroParte}</td>
            <td class="p-2 border">${p.descripcion}</td>

            <td class="p-2 border">
                <input type="number" 
                       min="1" 
                       value="${p.cantidad}"
                       class="w-16 p-1 border rounded cantidad-input">
            </td>

            <td class="p-2 border">${(p.tasa * 100).toFixed(0)}%</td>
            <td class="p-2 border">${p.precio.toFixed(2)} €</td>
            <td class="p-2 border font-semibold">${total} €</td>

            <td class="p-2 border text-center">
                <button class="btn-eliminar bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">
                    X
                </button>
            </td>
        `
		// BOTÓN ELIMINAR (event listener seguro)
		tr.querySelector('.btn-eliminar').addEventListener('click', () => {
			productosVenta.splice(index, 1)
			renderTabla()
		})

		// CAMBIAR CANTIDAD (event listener seguro)
		tr.querySelector('.cantidad-input').addEventListener('change', (e) => {
			productosVenta[index].cantidad = parseInt(e.target.value)
			renderTabla()
		})

		tablaVenta.appendChild(tr)
	})
}
