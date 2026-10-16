// backend/db/initDatabase.js
const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const fs = require('fs')
const pathService = require('../services/path-service')

// Usar la ruta de la base de datos desde el servicio
const dbPath = pathService.getDatabasePath()
const sqlPath = path.join(__dirname, 'database.sql')

// Asegurar que el directorio de datos existe
pathService.ensureDir(path.dirname(dbPath))

// Crear directorios necesarios para la aplicación
pathService.getProductImagesPath()
pathService.getInvoicesPath()
pathService.getBackupsPath()

const db = new sqlite3.Database(dbPath, (err) => {
	if (err) console.error('Error al conectar:', err.message)
	else console.log('✔ SQLite conectado en:', dbPath)
})

const { aplicarEsquema, migrarVenta } = require('./schema-init')

async function inicializar() {
	await new Promise((resolve) =>
		db.run('PRAGMA foreign_keys = ON;', (err) => {
			if (err)
				console.error('⚠ No se pudieron activar las foreign keys:', err.message)
			else console.log('✔ Foreign keys activadas')
			resolve()
		}),
	)

	if (fs.existsSync(sqlPath)) {
		try {
			await aplicarEsquema(db, fs.readFileSync(sqlPath, 'utf8'))
			console.log('✔ Esquema y datos iniciales aplicados desde database.sql')
		} catch (error) {
			console.error('Error exec SQL:', error.message)
		}
	} else {
		console.warn('⚠ database.sql no encontrado')
	}

	try {
		await migrarVenta(db)
	} catch (error) {
		console.error('Error migrando Venta:', error.message)
	}
}

const readyPromise = inicializar()

module.exports = db
module.exports.ready = readyPromise
