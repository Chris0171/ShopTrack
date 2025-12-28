/**
 * config-service.js - Servicio de configuración centralizado
 * Persiste la configuración de la aplicación en archivo JSON
 */

const fs = require('fs')
const path = require('path')

// Ruta del archivo de configuración
const CONFIG_PATH = path.join(__dirname, '../../data/config.json')

// Configuración por defecto
const DEFAULT_CONFIG = {
	idioma: 'es',
	idiomaFactura: 'es',
	moneda: '$',
	zonaHoraria: 'America/Mexico_City',
	formatoFecha: 'DD/MM/YYYY',

	// Configuración de facturas
	prefijoFactura: 'FAC',
	numeroInicial: 1000,
	ivaPredeterminado: 0.21,
	incluirLogo: true,

	// Información de la empresa
	nombre: 'Mi Empresa',
	rfc: '',
	telefono: '',
	email: '',
	direccion: '',
}

/**
 * Asegura que el directorio de datos existe
 */
function ensureDataDirectory() {
	const dataDir = path.dirname(CONFIG_PATH)
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true })
		console.log(`📁 Directorio de datos creado: ${dataDir}`)
	}
}

/**
 * Carga la configuración del archivo o devuelve la por defecto
 * @returns {object}
 */
function loadConfig() {
	ensureDataDirectory()

	try {
		if (fs.existsSync(CONFIG_PATH)) {
			const data = fs.readFileSync(CONFIG_PATH, 'utf-8')
			const config = JSON.parse(data)
			console.log('✓ Configuración cargada desde archivo')

			// Fusionar con defaults para asegurar que existan todas las keys
			return { ...DEFAULT_CONFIG, ...config }
		}
	} catch (error) {
		console.error('Error al cargar configuración:', error.message)
	}

	console.log('✓ Usando configuración por defecto')
	return { ...DEFAULT_CONFIG }
}

/**
 * Guarda la configuración en el archivo
 * @param {object} config - Configuración a guardar
 * @returns {boolean}
 */
function saveConfig(config) {
	try {
		ensureDataDirectory()
		fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
		console.log('✓ Configuración guardada')
		return true
	} catch (error) {
		console.error('Error al guardar configuración:', error.message)
		return false
	}
}

/**
 * Obtiene un valor específico de configuración
 * @param {string} key - Clave de configuración
 * @param {*} defaultValue - Valor por defecto si no existe
 * @returns {*}
 */
function getConfigValue(key, defaultValue = null) {
	const config = loadConfig()
	return config[key] !== undefined ? config[key] : defaultValue
}

/**
 * Establece un valor de configuración
 * @param {string} key - Clave de configuración
 * @param {*} value - Nuevo valor
 * @returns {boolean}
 */
function setConfigValue(key, value) {
	const config = loadConfig()
	config[key] = value
	return saveConfig(config)
}

/**
 * Actualiza múltiples valores de configuración
 * @param {object} updates - Objeto con valores a actualizar
 * @returns {object} - Configuración actualizada
 */
function updateConfig(updates) {
	const config = loadConfig()
	const updated = { ...config, ...updates }

	if (saveConfig(updated)) {
		return updated
	}

	throw new Error('Error al actualizar configuración')
}

/**
 * Resetea la configuración a valores por defecto
 * @returns {object}
 */
function resetConfig() {
	const config = { ...DEFAULT_CONFIG }
	if (saveConfig(config)) {
		console.log('✓ Configuración reseteada')
		return config
	}

	throw new Error('Error al resetear configuración')
}

/**
 * Obtiene toda la configuración
 * @returns {object}
 */
function getConfig() {
	return loadConfig()
}

module.exports = {
	loadConfig,
	saveConfig,
	getConfig,
	getConfigValue,
	setConfigValue,
	updateConfig,
	resetConfig,
	CONFIG_PATH,
	DEFAULT_CONFIG,
}
