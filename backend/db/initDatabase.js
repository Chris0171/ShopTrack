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

let resolveReady
const readyPromise = new Promise((resolve) => {
	resolveReady = resolve
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

	// Migración: columnas añadidas a Venta en bases existentes.
	// labor: ventas antiguas => 0. tasaImpuesto: ventas antiguas => NULL (tasa no registrada).
	const columnasVenta = [
		['labor', 'REAL NOT NULL DEFAULT 0'],
		['tasaImpuesto', 'REAL'],
	]
	db.all('PRAGMA table_info(Venta)', (err, cols) => {
		if (err) {
			console.error('Error leyendo esquema de Venta:', err.message)
			return resolveReady()
		}
		const pendientes = columnasVenta.filter(
			([nombre]) => !cols.some((c) => c.name === nombre),
		)
		const siguiente = () => {
			const p = pendientes.shift()
			if (!p) return resolveReady()
			db.run(`ALTER TABLE Venta ADD COLUMN ${p[0]} ${p[1]}`, (alterErr) => {
				if (alterErr)
					console.error(`Error migrando columna ${p[0]}:`, alterErr.message)
				else console.log(`✔ Columna Venta.${p[0]} añadida`)
				siguiente()
			})
		}
		siguiente()
	})
})

module.exports = db
module.exports.ready = readyPromise
