const db = require('../db/initDatabase')

module.exports = {
	// Obtener todas las marcas activas
	getAll: function (callback) {
		const sql = `SELECT * FROM Marca WHERE activo = 1 ORDER BY nombre ASC`
		db.all(sql, [], (err, rows) => {
			if (err) return callback(err)
			callback(null, rows)
		})
	},

	// Obtener todas las marcas (incluye inactivas)
	getAllWithInactive: function (callback) {
		const sql = `SELECT * FROM Marca ORDER BY nombre ASC`
		db.all(sql, [], (err, rows) => {
			if (err) return callback(err)
			callback(null, rows)
		})
	},

	// Crear marca
	create: function ({ nombre }, callback) {
		if (!nombre || !String(nombre).trim()) {
			return callback(new Error('El nombre es obligatorio'))
		}

		const sql = `INSERT INTO Marca (nombre) VALUES (?)`
		const stmt = db.prepare(sql)
		stmt.run([String(nombre).trim()], function (err) {
			if (err) return callback(err)
			callback(null, { id: this.lastID })
		})
		stmt.finalize()
	},

	// Actualizar marca
	update: function (id, { nombre }, callback) {
		if (!id) return callback(new Error('ID requerido'))
		if (!nombre || !String(nombre).trim()) {
			return callback(new Error('El nombre es obligatorio'))
		}

		const sql = `UPDATE Marca SET nombre = ? WHERE id = ?`
		db.run(sql, [String(nombre).trim(), id], function (err) {
			if (err) return callback(err)
			callback(null, { success: true, changes: this.changes })
		})
	},

	// Eliminar marca (soft delete)
	delete: function (id, callback) {
		const sql = `UPDATE Marca SET activo = 0 WHERE id = ?`
		db.run(sql, [id], function (err) {
			if (err) return callback(err)
			callback(null, { success: true, changes: this.changes })
		})
	},

	// Activar/Desactivar marca
	setActive: function (id, activo, callback) {
		const sql = `UPDATE Marca SET activo = ? WHERE id = ?`
		db.run(sql, [activo ? 1 : 0, id], function (err) {
			if (err) return callback(err)
			callback(null, { success: true, changes: this.changes })
		})
	},

	// Contar productos activos asociados
	countProducts: function (id, callback) {
		const sql = `SELECT COUNT(*) AS total FROM Producto WHERE marcaId = ? AND activo = 1`
		db.get(sql, [id], (err, row) => {
			if (err) return callback(err)
			callback(null, row?.total || 0)
		})
	},
}
