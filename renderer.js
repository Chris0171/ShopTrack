import { initDashboard } from './assets/js/dashboard.js'
import { initNuevaVenta } from './assets/js/nueva_venta.js'
import { initHistorialVenta } from './assets/js/historial_venta.js'
import { initClientsList } from './assets/js/clientes.js'

window.addEventListener('DOMContentLoaded', async () => {
	const content = document.getElementById('mainContent')

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
	}
}
