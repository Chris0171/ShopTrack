export function initUpdateProducto(productId = null) {
	console.log('Estoy en la vista')
	const inputBuscar = document.getElementById('buscarNroParte')
	const btnBuscar = document.getElementById('btnBuscar')
	const form = document.getElementById('formUpdate')

	// Campos del formulario
	const NroParte = document.getElementById('NroParte')
	const Descripcion = document.getElementById('Descripcion')
	const Cantidad = document.getElementById('Cantidad')
	const Precio = document.getElementById('Precio')
	const Tasas = document.getElementById('Tasas')

	let currentProductId = productId

	// 🔥 Cargar datos si se pasa un ID desde otra vista
	if (currentProductId) {
		cargarProductoPorID(currentProductId)
	}

	// ------------------------------------------------
	// 🔍 Buscar por Nro de Parte
	// ------------------------------------------------
	btnBuscar.addEventListener('click', async () => {
		const nro = inputBuscar.value.trim()
		if (!nro) return alert('Escribe un número de parte')

		const producto = await window.api.producto.buscarProducto(nro)

		if (!producto) return alert('No se encontró ningún producto')

		currentProductId = producto.id
		rellenarFormulario(producto)
	})

	// ------------------------------------------------
	// 📝 Guardar cambios
	// ------------------------------------------------
	form.addEventListener('submit', async (e) => {
		e.preventDefault()

		if (!currentProductId) {
			return alert('Debes buscar un producto primero')
		}

		const data = {
			NroParte: NroParte.value,
			Descripcion: Descripcion.value,
			Cantidad: Cantidad.value,
			Precio: Precio.value,
			Tasas: Tasas.value,
		}

		const result = await window.api.producto.update(currentProductId, data)

		alert('Producto actualizado correctamente')
	})

	// ------------------------------------------------
	// FUNCIONES INTERNAS
	// ------------------------------------------------

	async function cargarProductoPorID(id) {
		const todos = await window.api.producto.getAll()
		const prod = todos.find((p) => p.id === id)

		if (prod) rellenarFormulario(prod)
	}

	function rellenarFormulario(prod) {
		NroParte.value = prod.NroParte
		Descripcion.value = prod.Descripcion
		Cantidad.value = prod.Cantidad
		Precio.value = prod.Precio
		Tasas.value = prod.Tasas
	}
}
