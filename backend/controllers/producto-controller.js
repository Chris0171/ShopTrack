// backend/controllers/producto-controller.js
const db = require('../db/initDatabase')

module.exports = {
	// Obtener todos los productos
	getAll: function (callback) {
		const sql = `SELECT * FROM Producto ORDER BY id DESC`
		db.all(sql, [], (err, rows) => {
			if (err) return callback(err)
			callback(null, rows)
		})
	},

	// Crear producto (incluye Descripcion)
	create: function (
		{ NroParte, Descripcion, Cantidad = 0, Precio = 0, Tasas = 0 },
		callback
	) {
		if (!NroParte || !Descripcion) {
			return callback(new Error('NroParte y Descripcion son obligatorios'))
		}

		const sql = `
			INSERT INTO Producto (NroParte, Descripcion, Cantidad, Precio, Tasas)
			VALUES (?, ?, ?, ?, ?)
		`

		db.run(
			sql,
			[NroParte, Descripcion, Cantidad, Precio, Tasas],
			function (err) {
				if (err) return callback(err)
				callback(null, { id: this.lastID })
			}
		)
	},

	// Actualizar producto (incluye Descripcion)
	update: function (id, data, callback) {
		const { NroParte, Descripcion, Cantidad, Precio, Tasas } = data

		const sql = `
			UPDATE Producto 
			SET NroParte = ?, Descripcion = ?, Cantidad = ?, Precio = ?, Tasas = ?
			WHERE id = ?
		`

		db.run(
			sql,
			[NroParte, Descripcion, Cantidad, Precio, Tasas, id],
			function (err) {
				if (err) return callback(err)
				callback(null)
			}
		)
	},

	// Eliminar producto
	delete: function (id, callback) {
		db.run(`DELETE FROM Producto WHERE id = ?`, [id], function (err) {
			if (err) return callback(err)
			callback(null)
		})
	},
	// Buscar producto por número de parte
	buscarPorNroParte: function (nroParte, callback) {
		const sql = `SELECT * FROM Producto WHERE NroParte = ?`
		db.get(sql, [nroParte], (err, row) => {
			if (err) return callback(err)
			callback(null, row)
		})
	},
	// 🔥 Actualizar solo el stock de un producto
	actualizarStock: function (idProducto, nuevaCantidad, callback) {
		const sql = `UPDATE Producto SET Cantidad = ? WHERE id = ?`

		db.run(sql, [nuevaCantidad, idProducto], function (err) {
			if (err) return callback(err)
			callback(null, { success: true })
		})
	},
}
