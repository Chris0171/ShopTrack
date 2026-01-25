export function initAyuda() {
	// Buscador de ayuda (filtro simple)
	const searchInput = document.getElementById('helpSearchInput')
	const sections = document.querySelectorAll('.bg-white.rounded-xl')

	searchInput?.addEventListener('input', function () {
		const query = this.value.toLowerCase()
		sections.forEach((section) => {
			const text = section.textContent.toLowerCase()
			section.style.display = text.includes(query) ? '' : 'none'
		})
	})

	// Mostrar versión de la app dinámicamente si está disponible
	if (window.api?.general?.getAppVersion) {
		window.api.general.getAppVersion().then((ver) => {
			document.getElementById('appVersion').textContent = ver
		})
	}
}
