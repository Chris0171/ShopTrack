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
}
