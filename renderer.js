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

	// Mostrar versión en el header
	if (window.api && window.api.getAppVersion) {
		const version = await window.api.getAppVersion()
		const versionDiv = document.getElementById('app-version')
		if (versionDiv) {
			versionDiv.innerHTML = `
				<i class='fas fa-info-circle text-indigo-400 text-xl'></i>
				<span class='font-extrabold text-white'>ShopTrack</span>
				<span class='font-mono font-bold text-gray-300'>v${version}</span>
			`
		}
	}

	// Notificación de actualización automática
	if (window.api && window.api.onUpdateAvailable) {
		window.api.onUpdateAvailable(() => {
			mostrarNotificacionActualizacion()
		})
	}
})

function mostrarNotificacionActualizacion() {
	// Notificación con clases Tailwind y coherencia visual
	const noti = document.createElement('div')
	noti.id = 'update-notification'
	noti.className = [
		'fixed',
		'bottom-8',
		'right-8',
		'bg-indigo-700',
		'text-white',
		'px-6',
		'py-4',
		'rounded-xl',
		'shadow-2xl',
		'z-50',
		'text-lg',
		'font-semibold',
		'flex',
		'items-center',
		'gap-3',
		'border-2',
		'border-indigo-300',
		'animate-fade-in-down',
	].join(' ')
	noti.innerHTML = `
		<i class="fas fa-circle-exclamation text-yellow-300 text-2xl shrink-0"></i>
		<span>¡Hay una nueva actualización disponible! Se descargará e instalará al reiniciar.</span>
	`
	document.body.appendChild(noti)
	setTimeout(() => {
		noti.remove()
	}, 12000)
}

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
