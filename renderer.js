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

	// Cargar JS asociado a la vista
	loadViewScript(viewName)
}

function loadViewScript(viewName) {
	// Extrae nombre sin extensión => nuevaVenta
	const baseName = viewName.split('.')[0]

	const scriptPath = `./assets/js/${baseName}.js`

	// Cargar dinámicamente el script
	const script = document.createElement('script')
	script.src = scriptPath
	script.type = 'module'
	document.body.appendChild(script)

	console.log('→ Script cargado:', scriptPath)
}
