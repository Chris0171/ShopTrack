// backend/db/initDatabase.js
const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const fs = require('fs')

const dbPath = path.join(__dirname, 'database.db')
const sqlPath = path.join(__dirname, 'database.sql')

const db = new sqlite3.Database(dbPath, (err) => {
	if (err) console.error('Error al conectar:', err.message)
	else console.log('✔ SQLite conectado')
})

db.serialize(() => {
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
