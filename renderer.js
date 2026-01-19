import { initDashboard } from './assets/js/dashboard.js'
import { initNuevaVenta } from './assets/js/nueva_venta.js'
import { initHistorialVenta } from './assets/js/historial_venta.js'
import { initClientsList } from './assets/js/clientes.js'
import { initProductList } from './assets/js/listar_productos.js'
import { initProductosCriticos } from './assets/js/productos_criticos.js'
import { initUpdateProducto } from './assets/js/actualizar_producto.js'
import { initCreateProducto } from './assets/js/crear_producto.js'
import { initConfiguracion } from './assets/js/configuracion.js'
import { initMarcas } from './assets/js/marcas.js'

window.addEventListener('DOMContentLoaded', async () => {
	const content = document.getElementById('mainContent')

	// Inicializar i18n
	await window.i18n.initI18n()
	window.i18n.watchLanguageChanges()

	// Cargar vista inicial
	await loadView('dashboard.html')

	// Delegación de clics para botones/menu
	document.querySelectorAll('[data-view]').forEach((item) => {
		item.addEventListener('click', async () => {
			const view = item.getAttribute('data-view')
			await loadView(view)
		})
	})
})

async function loadView(viewName) {
	const content = document.getElementById('mainContent')

	content.innerHTML = await window.api.loadView(viewName)

	// Esperar a que el DOM se haya actualizado
	await new Promise((r) => setTimeout(r, 0))

	// Aplicar traducciones a la nueva vista
	window.i18n.applyTranslations(content)

	loadInitFunctionView(viewName)
}

function loadInitFunctionView(viewName) {
	switch (viewName) {
		case 'dashboard.html':
			initDashboard()
			break
		case 'nueva_venta.html':
			initNuevaVenta()
			break
		case 'historial_ventas.html':
			initHistorialVenta()
			break
		case 'clientes.html':
			initClientsList()
			break
		case 'listar_productos.html':
			initProductList()
			break
		case 'productos_criticos.html':
			initProductosCriticos()
			break
		case 'actualizar_producto.html':
			// const urlParams = new URLSearchParams(window.location.search)
			// const id = urlParams.get('id')
			initUpdateProducto(null)
			break
		case 'crear_producto.html':
			initCreateProducto()
			break
		case 'configuracion.html':
			initConfiguracion()
			break
		case 'marcas.html':
			initMarcas()
			break
	}
}

export { loadView }
