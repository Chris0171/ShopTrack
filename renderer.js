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

	// Delegación de clics para cualquier elemento con data-view (incluye vistas cargadas dinámicamente)
	document.addEventListener('click', async (event) => {
		const target = event.target.closest('[data-view]')
		if (!target) return
		event.preventDefault()
		const view = target.getAttribute('data-view')
		if (view) await loadView(view)
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

	// Barra de progreso de descarga de actualización
	if (window.api && window.api.onUpdateDownloadProgress) {
		window.api.onUpdateDownloadProgress((progressObj) => {
			mostrarModalProgresoActualizacion(progressObj)
		})
	}

	// Mensaje de error en actualización
	if (window.api && window.api.onUpdateError) {
		window.api.onUpdateError((errorMsg) => {
			mostrarModalErrorActualizacion(errorMsg)
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

// Modal de progreso de actualización
function mostrarModalProgresoActualizacion(progressObj) {
	let modal = document.getElementById('update-progress-modal')
	if (!modal) {
		modal = document.createElement('div')
		modal.id = 'update-progress-modal'
		modal.className = [
			'fixed',
			'inset-0',
			'flex',
			'items-center',
			'justify-center',
			'z-50',
			'bg-black',
			'bg-opacity-50',
		].join(' ')
		modal.innerHTML = `
			<div class="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md flex flex-col items-center border-2 border-indigo-300">
				<h2 class="text-xl font-bold text-indigo-700 mb-4 flex items-center gap-2">
					<i class="fas fa-download text-indigo-400 text-2xl"></i>
					Descargando actualización...
				</h2>
				<div class="w-full h-4 bg-gray-200 rounded-full overflow-hidden mb-2">
					<div id="update-progress-bar" class="h-4 bg-indigo-500 transition-all duration-300" style="width:0%"></div>
				</div>
				<div id="update-progress-text" class="text-gray-700 font-mono text-sm mb-2">0%</div>
				<p class="text-gray-500 text-xs">Por favor espera, la descarga puede tardar unos minutos.</p>
			</div>
		`
		document.body.appendChild(modal)
	}
	// Actualizar barra y texto
	const bar = document.getElementById('update-progress-bar')
	const text = document.getElementById('update-progress-text')
	if (bar && text && progressObj) {
		const percent = Math.floor(progressObj.percent)
		bar.style.width = percent + '%'
		const mbTransferred = (progressObj.transferred / 1024 / 1024).toFixed(1)
		const mbTotal = (progressObj.total / 1024 / 1024).toFixed(1)
		text.textContent = `${percent}% (${mbTransferred} MB / ${mbTotal} MB)`
	}
}

// Modal de error de actualización
function mostrarModalErrorActualizacion(errorMsg) {
	let modal = document.getElementById('update-progress-modal')
	if (!modal) {
		modal = document.createElement('div')
		modal.id = 'update-progress-modal'
		modal.className = [
			'fixed',
			'inset-0',
			'flex',
			'items-center',
			'justify-center',
			'z-50',
			'bg-black',
			'bg-opacity-50',
		].join(' ')
		document.body.appendChild(modal)
	}
	modal.innerHTML = `
		<div class="bg-red-50 rounded-xl shadow-2xl p-8 w-full max-w-md flex flex-col items-center border-2 border-red-300">
			<h2 class="text-xl font-bold text-red-700 mb-4 flex items-center gap-2">
				<i class="fas fa-exclamation-triangle text-red-400 text-2xl"></i>
				Error al descargar actualización
			</h2>
			<div class="text-red-700 font-mono text-sm mb-2">${errorMsg}</div>
			<button id="close-update-error" class="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition">Cerrar</button>
		</div>
	`
	document.getElementById('close-update-error').onclick = () => {
		modal.remove()
	}
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
		case 'ayuda.html':
			import('./assets/js/ayuda.js').then((mod) => mod.initAyuda())
			break
	}
}

export { loadView }
