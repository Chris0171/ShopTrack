// backend/controllers/producto-controller.js
const db = require('../db/initDatabase')

module.exports = {
	// Obtener todos los productos
	getAll: function (callback) {
		const sql = `SELECT * FROM Producto WHERE activo = 1 ORDER BY id DESC`
		db.all(sql, [], (err, rows) => {
			if (err) return callback(err)
			callback(null, rows)
		})
	},

	// Crear producto (incluye Descripcion y nuevos campos)
	create: function (
		{
			NroParte,
			Descripcion,
			Cantidad = 0,
			Precio = 0,
			Tasas = 0,
			precioCosto = 0,
			esOriginal = 1,
			nombreImagen = null,
		},
		callback
	) {
		if (!NroParte || !Descripcion) {
			return callback(new Error('NroParte y Descripcion son obligatorios'))
		}

		const sql = `
			INSERT INTO Producto (NroParte, Descripcion, Cantidad, Precio, Tasas, precioCosto, esOriginal, nombreImagen)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`

		db.run(
			sql,
			[
				NroParte,
				Descripcion,
				Cantidad,
				Precio,
				Tasas,
				precioCosto,
				esOriginal,
				nombreImagen,
			],
			function (err) {
				if (err) return callback(err)
				callback(null, { id: this.lastID })
			}
		)
	},

	// Actualizar producto (incluye Descripcion y nuevos campos)
	update: function (id, data, callback) {
		const {
			NroParte,
			Descripcion,
			Cantidad,
			Precio,
			Tasas,
			precioCosto,
			esOriginal,
			nombreImagen,
		} = data

		const sql = `
			UPDATE Producto 
			SET NroParte = ?, Descripcion = ?, Cantidad = ?, Precio = ?, Tasas = ?, precioCosto = ?, esOriginal = ?, nombreImagen = ?
			WHERE id = ?
		`

		db.run(
			sql,
			[
				NroParte,
				Descripcion,
				Cantidad,
				Precio,
				Tasas,
				precioCosto,
				esOriginal,
				nombreImagen,
				id,
			],
			function (err) {
				if (err) return callback(err)
				callback(null)
			}
		)
	},

	// Eliminar producto
	delete: function (id, callback) {
		const sql = `UPDATE Producto SET activo = 0 WHERE id = ?`
		db.run(sql, [id], function (err) {
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
	getPaginated: function (filtros, callback) {
		const { NroParte = '', Descripcion = '', pagina = 1, limite = 10 } = filtros
		const offset = (pagina - 1) * limite

		const countSql = `
    SELECT COUNT(*) AS total 
    FROM Producto 
    WHERE activo = 1 AND NroParte LIKE ? AND Descripcion LIKE ?
  `
		db.get(countSql, [`%${NroParte}%`, `%${Descripcion}%`], (err, countRow) => {
			if (err) return callback(err)

			const total = countRow.total

			const dataSql = `
      SELECT * FROM Producto
      WHERE activo = 1 AND NroParte LIKE ? AND Descripcion LIKE ?
      ORDER BY id ASC
      LIMIT ? OFFSET ?
    `
			db.all(
				dataSql,
				[`%${NroParte}%`, `%${Descripcion}%`, limite, offset],
				(err, rows) => {
					if (err) return callback(err)
					callback(null, {
						productos: rows,
						total,
						pagina,
						limite,
						totalPaginas: Math.ceil(total / limite),
					})
				}
			)
		})
	},
}
