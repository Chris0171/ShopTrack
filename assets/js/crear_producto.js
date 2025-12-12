export function initCreateProducto() {
	const form = document.getElementById('form-crear-producto')
	const mensaje = document.getElementById('mensaje')

	document.getElementById('btn-guardar').addEventListener('click', async () => {
		const data = {
			NroParte: document.getElementById('NroParte').value.trim(),
			Descripcion: document.getElementById('Descripcion').value.trim(),
			Cantidad: parseInt(document.getElementById('Cantidad').value) || 0,
			Precio: parseFloat(document.getElementById('Precio').value) || 0,
			Tasas: parseFloat(document.getElementById('Tasas').value) || 0,
		}

		if (!data.NroParte || !data.Descripcion) {
			mensaje.textContent = 'NroParte y Descripción son obligatorios.'
			mensaje.className = 'text-red-600'
			return
		}

		try {
			const result = await window.api.producto.create(data)

			mensaje.textContent = 'Producto creado correctamente.'
			mensaje.className = 'text-green-600'

			form.reset()
		} catch (err) {
			mensaje.textContent = 'Error al crear el producto: ' + err
			mensaje.className = 'text-red-600'
			console.error(err)
		}
	})
}
