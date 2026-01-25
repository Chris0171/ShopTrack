import { initAyuda } from './assets/js/ayuda.js'

window.addEventListener('DOMContentLoaded', () => {
	if (window.location.pathname.endsWith('ayuda.html')) {
		initAyuda()
	}
})
