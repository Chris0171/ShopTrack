/**
 * i18n.js - Sistema de internacionalización
 * Maneja traducción y formatos locales para la aplicación
 */

let currentLanguage = 'es'
let translations = {}
let config = {}

/**
 * Carga las traducciones para un idioma específico
 * @param {string} language - Código del idioma (es, en, pt)
 * @returns {Promise<boolean>}
 */
async function loadLanguage(language = 'es') {
	try {
		const response = await fetch(`./assets/locales/${language}.json`)
		if (!response.ok) {
			console.warn(`No se encontró idioma ${language}, usando es`)
			return await loadLanguage('es')
		}

		translations = await response.json()
		currentLanguage = language
		document.documentElement.lang = language

		console.log(`✓ Idioma cargado: ${language}`)
		return true
	} catch (error) {
		console.error(`Error al cargar idioma ${language}:`, error)
		return false
	}
}

/**
 * Obtiene una traducción usando notación de puntos
 * @param {string} key - Clave de traducción (ej: 'products.list.title')
 * @param {object} defaults - Valores por defecto
 * @returns {string}
 */
function t(key, defaults = {}) {
	const keys = key.split('.')
	let value = translations

	for (const k of keys) {
		value = value?.[k]
	}

	if (value === undefined) {
		console.warn(`Clave de traducción no encontrada: ${key}`)
		return defaults.fallback || key
	}

	return value
}

/**
 * Aplica traducciones a los elementos del DOM
 * Busca elementos con atributo data-i18n
 * Soporta dos formatos:
 * - data-i18n="clave" -> traduce textContent
 * - data-i18n="[atributo]clave" -> traduce atributo especificado
 * @param {HTMLElement} root - Elemento raíz (por defecto document)
 */
function applyTranslations(root = document) {
	const elements = root.querySelectorAll('[data-i18n]')

	elements.forEach((el) => {
		const i18nValue = el.getAttribute('data-i18n')

		// Detectar formato [atributo]clave
		const attributeMatch = i18nValue.match(/^\[([^\]]+)\](.+)$/)

		if (attributeMatch) {
			// Formato: [atributo]clave
			const [, attribute, key] = attributeMatch
			const translation = t(key)

			// Aplicar traducción al atributo especificado
			switch (attribute.toLowerCase()) {
				case 'placeholder':
					el.placeholder = translation
					break
				case 'title':
					el.title = translation
					break
				case 'value':
					el.value = translation
					break
				case 'aria-label':
					el.setAttribute('aria-label', translation)
					break
				case 'alt':
					el.alt = translation
					break
				default:
					el.setAttribute(attribute, translation)
			}
		} else {
			// Formato estándar: traducir textContent
			// Solo reemplazar texto si el elemento no tiene hijos (evitar borrar submenús)
			if (
				i18nValue &&
				!el.tagName.match(/INPUT|TEXTAREA|SELECT/) &&
				el.childElementCount === 0
			) {
				el.textContent = t(i18nValue)
			}
		}

		// Soporte legacy para atributos separados
		const placeholder = el.getAttribute('data-i18n-placeholder')
		const title = el.getAttribute('data-i18n-title')
		const value = el.getAttribute('data-i18n-value')

		if (placeholder) {
			el.placeholder = t(placeholder)
		}

		if (title) {
			el.title = t(title)
		}

		if (value) {
			el.value = t(value)
		}
	})
}

/**
 * Formatea una cantidad según la moneda configurada
 * @param {number} amount - Cantidad a formatear
 * @param {string} currency - Código de moneda (USD, EUR, MXN, BRL, etc)
 * @returns {string}
 */
function formatCurrency(amount, currency = '$') {
	// Por ahora simple, puede expandirse
	const formatted = Number(amount).toFixed(2)
	return `${currency} ${formatted}`
}

/**
 * Formatea una fecha según el idioma y formato configurado
 * @param {Date|string} date - Fecha a formatear
 * @param {string} format - Formato deseado (short, long)
 * @returns {string}
 */
function formatDate(date, format = 'short') {
	const dateObj = typeof date === 'string' ? new Date(date) : date
	const locale =
		{
			es: 'es-ES',
			en: 'en-US',
			pt: 'pt-BR',
		}[currentLanguage] || 'es-ES'

	const options = {
		short: { year: 'numeric', month: '2-digit', day: '2-digit' },
		long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
		time: { hour: '2-digit', minute: '2-digit', second: '2-digit' },
	}[format] || { year: 'numeric', month: '2-digit', day: '2-digit' }

	return dateObj.toLocaleDateString(locale, options)
}

/**
 * Obtiene el idioma actual
 * @returns {string}
 */
function getCurrentLanguage() {
	return currentLanguage
}

/**
 * Cambia el idioma actual y aplica traducciones
 * Emite evento para sincronizar toda la app
 * @param {string} language - Nuevo idioma
 */
async function setLanguage(language) {
	const loaded = await loadLanguage(language)
	if (loaded) {
		applyTranslations()

		// Emitir evento para que otras partes de la app se actualicen
		window.dispatchEvent(
			new CustomEvent('i18n:changed', {
				detail: { language },
			})
		)
	}
	return loaded
}

/**
 * Inicializa el sistema i18n
 * Carga idioma desde config o localStorage
 * @returns {Promise<void>}
 */
async function initI18n() {
	try {
		// Intentar obtener config del backend/IPC
		if (window.api?.config?.get) {
			const res = await window.api.config.get()
			const appConfig = res && res.ok ? res.data || {} : {}
			currentLanguage = appConfig.idioma || 'es'
			config = appConfig
		} else {
			// Fallback a localStorage
			const storedConfig = JSON.parse(localStorage.getItem('appConfig') || '{}')
			currentLanguage = storedConfig.idioma || 'es'
		}

		await loadLanguage(currentLanguage)
		applyTranslations()

		console.log(`✓ i18n inicializado: ${currentLanguage}`)
	} catch (error) {
		console.error('Error al inicializar i18n:', error)
		await loadLanguage('es')
	}
}

/**
 * Escucha cambios de idioma desde la configuración
 * Para sincronización entre ventanas/componentes
 */
function watchLanguageChanges() {
	if (window.api?.config?.onChanged) {
		window.api.config.onChanged((newConfig) => {
			if (newConfig.idioma && newConfig.idioma !== currentLanguage) {
				setLanguage(newConfig.idioma)
			}
		})
	}

	// También escuchar evento de i18n:changed
	window.addEventListener('i18n:changed', (event) => {
		applyTranslations()
	})
}

// Exportar funciones
window.i18n = {
	t,
	setLanguage,
	getCurrentLanguage,
	applyTranslations,
	formatCurrency,
	formatDate,
	initI18n,
	watchLanguageChanges,
	loadLanguage,
}

console.log('✓ i18n.js cargado')
