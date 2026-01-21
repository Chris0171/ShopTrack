const fs = require('fs')
const path = require('path')
const sqlite3 = require('sqlite3').verbose()
const pathService = require('./path-service')

/**
 * Elimina todas las tablas de la base de datos y ejecuta el script inicial
 * Hace backup del archivo actual antes de resetear
 * @returns {object} Resultado del reseteo
 */
function resetDatabaseWithSQL() {
	try {
		const dbPath = pathService.getDatabasePath()
		const backupsDir = pathService.getBackupsPath()
		// Backup actual
		if (fs.existsSync(dbPath)) {
			const now = new Date()
			const timestamp = now
				.toISOString()
				.replace(/[:.]/g, '-')
				.replace('T', '_')
				.split('Z')[0]
			const dbBackupName = `db-before-reset-${timestamp}.bak`
			const dbBackupPath = path.join(backupsDir, dbBackupName)
			fs.copyFileSync(dbPath, dbBackupPath)
		}
		// Abrir conexión
		const db = new sqlite3.Database(dbPath)
		// Obtener todas las tablas
		db.serialize(() => {
			db.all(
				"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';",
				(err, tables) => {
					if (err) throw err
					// Drop todas las tablas
					tables.forEach((t) => {
						db.run(`DROP TABLE IF EXISTS ${t.name};`)
					})
					// Leer y ejecutar el script inicial
					const sqlScript = fs.readFileSync(
						path.join(__dirname, '../db/database.sql'),
						'utf8',
					)
					db.exec(sqlScript, (err) => {
						db.close()
						if (err) throw err
					})
				},
			)
		})
		return { ok: true }
	} catch (error) {
		return { ok: false, error: error.message }
	}
}

module.exports = {
	resetDatabaseWithSQL,
}
