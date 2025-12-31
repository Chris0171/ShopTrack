const path = require('path')
const { app } = require('electron')
const fs = require('fs')

/**
 * Servicio centralizado para el manejo de rutas de la aplicación
 * Maneja diferencias entre modo desarrollo, portable e instalador
 */

class PathService {
	constructor() {
		// Determinar si es portable o instalador
		this.isPortable = this.checkIfPortable()

		// Definir directorio base según el modo
		this.userDataPath = this.isPortable
			? path.join(process.cwd(), 'data')
			: app.getPath('userData')
	}

	/**
	 * Verifica si la aplicación se ejecuta en modo portable
	 * @returns {boolean}
	 */
	checkIfPortable() {
		// Si existe un archivo 'portable.txt' en el directorio raíz, es portable
		const portableMarker = path.join(process.cwd(), 'portable.txt')
		return fs.existsSync(portableMarker)
	}

	/**
	 * Obtiene la ruta base de datos de usuario
	 * @returns {string}
	 */
	getUserDataPath() {
		return this.userDataPath
	}

	/**
	 * Obtiene la ruta de la base de datos
	 * @returns {string}
	 */
	getDatabasePath() {
		return path.join(this.userDataPath, 'shoptrack.db')
	}

	/**
	 * Obtiene la ruta del archivo de configuración
	 * @returns {string}
	 */
	getConfigPath() {
		return path.join(this.userDataPath, 'config.json')
	}

	/**
	 * Obtiene la ruta base donde se guardan las imágenes de productos
	 * @returns {string}
	 */
	getProductImagesPath() {
		const imagesPath = path.join(this.userDataPath, 'images', 'productos')

		// Crear el directorio si no existe
		if (!fs.existsSync(imagesPath)) {
			fs.mkdirSync(imagesPath, { recursive: true })
		}

		return imagesPath
	}

	/**
	 * Obtiene la ruta completa de una imagen de producto
	 * @param {string} nombreImagen - Nombre del archivo de imagen
	 * @returns {string}
	 */
	getProductImagePath(nombreImagen) {
		if (!nombreImagen) return null
		return path.join(this.getProductImagesPath(), nombreImagen)
	}

	/**
	 * Obtiene la ruta donde se guardan las facturas PDF
	 * @returns {string}
	 */
	getInvoicesPath() {
		const invoicesPath = path.join(this.userDataPath, 'facturas')

		// Crear el directorio si no existe
		if (!fs.existsSync(invoicesPath)) {
			fs.mkdirSync(invoicesPath, { recursive: true })
		}

		return invoicesPath
	}

	/**
	 * Obtiene la ruta completa de una factura PDF
	 * @param {string} nombreFactura - Nombre del archivo PDF
	 * @returns {string}
	 */
	getInvoicePath(nombreFactura) {
		if (!nombreFactura) return null
		return path.join(this.getInvoicesPath(), nombreFactura)
	}

	/**
	 * Obtiene la ruta donde se guardan los backups
	 * @returns {string}
	 */
	getBackupsPath() {
		const backupsPath = path.join(this.userDataPath, 'backups')

		// Crear el directorio si no existe
		if (!fs.existsSync(backupsPath)) {
			fs.mkdirSync(backupsPath, { recursive: true })
		}

		return backupsPath
	}

	/**
	 * Verifica si un archivo existe
	 * @param {string} filePath - Ruta del archivo
	 * @returns {boolean}
	 */
	fileExists(filePath) {
		return fs.existsSync(filePath)
	}

	/**
	 * Crea un directorio si no existe
	 * @param {string} dirPath - Ruta del directorio
	 */
	ensureDir(dirPath) {
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath, { recursive: true })
		}
	}
}

// Exportar instancia única (singleton)
module.exports = new PathService()
