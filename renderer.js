window.addEventListener('DOMContentLoaded', async () => {
	const content = document.getElementById('mainContent')

	// cargar vista inicial
	content.innerHTML = await window.api.loadView('dashboard.html')

	// Delegación de evento para cualquier <data-view="">
	document.querySelectorAll('[data-view]').forEach((item) => {
		item.addEventListener('click', async () => {
			const view = item.getAttribute('data-view')
			content.innerHTML = await window.api.loadView(view)
		})
	})
})
