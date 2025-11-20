// backend/controllers/producto-controller.js
const db = require('../db/initDatabase')

module.exports = {
	getAll: function (callback) {
		const sql = `SELECT * FROM Producto ORDER BY id DESC`
		db.all(sql, [], (err, rows) => {
			if (err) return callback(err)
			callback(null, rows)
		})
	},

	create: function (
		{ NroParte, Cantidad = 0, Precio = 0, Tasas = 0 },
		callback
	) {
		const sql = `INSERT INTO Producto (NroParte, Cantidad, Precio, Tasas)
                 VALUES (?, ?, ?, ?)`
		db.run(sql, [NroParte, Cantidad, Precio, Tasas], function (err) {
			if (err) return callback(err)
			callback(null, { id: this.lastID })
		})
	},

	update: function (id, data, callback) {
		const { NroParte, Cantidad, Precio, Tasas } = data
		const sql = `UPDATE Producto SET NroParte=?, Cantidad=?, Precio=?, Tasas=? WHERE id=?`
		db.run(sql, [NroParte, Cantidad, Precio, Tasas, id], function (err) {
			if (err) return callback(err)
			callback(null)
		})
	},

	delete: function (id, callback) {
		db.run(`DELETE FROM Producto WHERE id=?`, [id], function (err) {
			if (err) return callback(err)
			callback(null)
		})
	},
}
