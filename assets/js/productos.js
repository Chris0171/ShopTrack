async function cargarProductos() {
	try {
		const productos = await window.api.producto.getAll()
		console.log(productos)
		// renderiza la tabla con productos
	} catch (err) {
		console.error('Error al cargar productos:', err)
	}
}

async function crearProducto() {
	const data = {
		NroParte: document.getElementById('nroParte').value,
		Cantidad: Number(document.getElementById('cantidad').value),
		Precio: Number(document.getElementById('precio').value),
		Tasas: Number(document.getElementById('tasas').value),
	}

	try {
		const res = await window.api.producto.create(data)
		console.log('Producto creado:', res)
		cargarProductos()
	} catch (err) {
		console.error('Error crear producto:', err)
	}
}

// Llama cargarProductos() al iniciar
window.addEventListener('DOMContentLoaded', cargarProductos)
