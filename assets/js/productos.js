async function cargarProductos() {
	try {
		const productos = await window.api.producto.getAll()
		console.log('Productos cargados:', productos)

		// Aquí renderizas la tabla con los productos
		// renderizarTabla(productos);
	} catch (err) {
		console.error('Error al cargar productos:', err)
	}
}

async function crearProducto() {
	const nroParte = document.getElementById('nroParte').value.trim()
	const descripcion = document.getElementById('descripcion').value.trim() // ← NUEVO CAMPO
	const cantidad = Number(document.getElementById('cantidad').value)
	const precio = Number(document.getElementById('precio').value)
	const tasas = Number(document.getElementById('tasas').value)

	// Validación básica
	if (!nroParte || !descripcion) {
		alert('Nro de Parte y Descripción son obligatorios.')
		return
	}

	const data = {
		NroParte: nroParte,
		Descripcion: descripcion, // ← NUEVO CAMPO
		Cantidad: cantidad,
		Precio: precio,
		Tasas: tasas,
	}

	try {
		const res = await window.api.producto.create(data)
		console.log('Producto creado:', res)

		// Limpia el formulario si quieres
		// document.getElementById("formProducto").reset();

		// Recarga la tabla
		cargarProductos()
	} catch (err) {
		console.error('Error al crear producto:', err)
	}
}

// Llama cargarProductos() al iniciar
window.addEventListener('DOMContentLoaded', cargarProductos)
