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
	if (window.api?.getAppVersion) {
		window.api.getAppVersion().then((ver) => {
			const versionEl = document.getElementById('appVersion')
			if (versionEl && ver) versionEl.textContent = ver
		})
	}

	// Rellenar datos de contacto desde la configuración si existen
	if (window.api?.config?.get) {
		window.api.config.get().then((resp) => {
			const cfg = resp?.data || {}
			const emailEl = document.getElementById('helpSupportEmail')
			const waEl = document.getElementById('helpSupportWhatsapp')
			if (emailEl && cfg.email) {
				emailEl.textContent = cfg.email
				emailEl.href = `mailto:${cfg.email}`
			}
			if (waEl && cfg.telefono) {
				const digits = String(cfg.telefono).replace(/[^0-9+]/g, '')
				waEl.textContent = digits
				waEl.href = `https://wa.me/${digits.replace(/^\+/, '')}`
			}
			const authorEl = document.getElementById('helpAuthor')
			if (authorEl && cfg.nombre) authorEl.textContent = cfg.nombre
		})
	}
}
