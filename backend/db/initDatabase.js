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

db.serialize(() => {
	db.run('PRAGMA foreign_keys = ON;', (err) => {
		if (err)
			console.error('⚠ No se pudieron activar las foreign keys:', err.message)
		else console.log('✔ Foreign keys activadas')
	})
	if (fs.existsSync(sqlPath)) {
		const sql = fs.readFileSync(sqlPath, 'utf8')
		db.exec(sql, (err) => {
			if (err) console.error('Error exec SQL:', err.message)
			else console.log('✔ Tablas creadas desde database.sql')
		})
	} else {
		console.warn('⚠ database.sql no encontrado')
	}
})

module.exports = db
