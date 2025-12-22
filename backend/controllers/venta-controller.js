const db = require('../db/initDatabase')

module.exports = {
	// 🔹 Obtener todas las ventas
	getAll: function (callback) {
		const sql = `
            SELECT v.*, c.nombre AS clienteNombre
            FROM Venta v
            JOIN Clientes c ON v.idCliente = c.id
            ORDER BY v.id DESC
        `
		db.all(sql, [], (err, rows) => {
			if (err) return callback(err)
			callback(null, rows)
		})
	},

	// 🔹 Crear venta
	create: function (
		{
			idCliente,
			subtotal,
			impuestos,
			total,
			descuento = 0,
			motivoDescuento = '',
		},
		callback
	) {
		if (!idCliente || subtotal == null || impuestos == null || total == null) {
			return callback(
				new Error('idCliente, subtotal, impuestos y total son obligatorios')
			)
		}

		const sql = `
            INSERT INTO Venta (idCliente, subtotal, impuestos, total, descuento, motivoDescuento)
            VALUES (?, ?, ?, ?, ?, ?)
        `
		const stmt = db.prepare(sql)
		stmt.run(
			[idCliente, subtotal, impuestos, total, descuento, motivoDescuento],
			function (err) {
				if (err) return callback(err)
				callback(null, { id: this.lastID })
			}
		)
		stmt.finalize()
	},

	// 🔹 Actualizar venta
	update: function (id, data, callback) {
		const {
			idCliente,
			subtotal,
			impuestos,
			total,
			descuento = 0,
			motivoDescuento = '',
		} = data
		const sql = `
            UPDATE Venta
            SET idCliente = ?, subtotal = ?, impuestos = ?, total = ?, descuento = ?, motivoDescuento = ?
            WHERE id = ?
        `
		db.run(
			sql,
			[idCliente, subtotal, impuestos, total, descuento, motivoDescuento, id],
			function (err) {
				if (err) return callback(err)
				callback(null, { success: true, changes: this.changes })
			}
		)
	},

	// 🔹 Eliminar venta
	delete: function (id, callback) {
		const sql = `DELETE FROM Venta WHERE id = ?`
		db.run(sql, [id], function (err) {
			if (err) return callback(err)
			callback(null, { success: true, changes: this.changes })
		})
	},

	// 🔹 Obtener venta por ID
	getById: function (id, callback) {
		const sql = `
            SELECT v.*, c.nombre AS clienteNombre
            FROM Venta v
            JOIN Clientes c ON v.idCliente = c.id
            WHERE v.id = ?
        `
		db.get(sql, [id], (err, row) => {
			if (err) return callback(err)
			callback(null, row)
		})
	},

	// 🔹 Obtener ventas de un cliente
	getByClienteId: function (idCliente, callback) {
		const sql = `SELECT * FROM Venta WHERE idCliente = ? ORDER BY id DESC`
		db.all(sql, [idCliente], (err, rows) => {
			if (err) return callback(err)
			callback(null, rows)
		})
	},
}
