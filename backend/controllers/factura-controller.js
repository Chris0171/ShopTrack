const db = require('../db/initDatabase')

module.exports = {
	// 🔹 Obtener todas las facturas
	getAll: function (callback) {
		const sql = `
            SELECT f.*, v.idCliente
            FROM Factura f
            JOIN Venta v ON f.idVenta = v.id
            ORDER BY f.id DESC
        `
		db.all(sql, [], (err, rows) => {
			if (err) return callback(err)
			callback(null, rows)
		})
	},

	// 🔹 Crear factura
	create: function (
		{
			idVenta,
			numeroFactura,
			subtotal,
			impuestos,
			total,
			metodoPago = 'efectivo',
			observaciones = '',
			estado = 'emitida',
		},
		callback
	) {
		if (
			!idVenta ||
			!numeroFactura ||
			subtotal == null ||
			impuestos == null ||
			total == null
		) {
			return callback(
				new Error(
					'idVenta, numeroFactura, subtotal, impuestos y total son obligatorios'
				)
			)
		}

		const sql = `
            INSERT INTO Factura 
            (idVenta, numeroFactura, subtotal, impuestos, total, metodoPago, observaciones, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
		const stmt = db.prepare(sql)
		stmt.run(
			[
				idVenta,
				numeroFactura,
				subtotal,
				impuestos,
				total,
				metodoPago,
				observaciones,
				estado,
			],
			function (err) {
				if (err) return callback(err)
				callback(null, { id: this.lastID })
			}
		)
		stmt.finalize()
	},

	// 🔹 Actualizar factura
	update: function (id, data, callback) {
		const {
			numeroFactura,
			subtotal,
			impuestos,
			total,
			metodoPago,
			observaciones,
			estado,
		} = data
		const sql = `
            UPDATE Factura
            SET numeroFactura = ?, subtotal = ?, impuestos = ?, total = ?, metodoPago = ?, observaciones = ?, estado = ?
            WHERE id = ?
        `
		db.run(
			sql,
			[
				numeroFactura,
				subtotal,
				impuestos,
				total,
				metodoPago,
				observaciones,
				estado,
				id,
			],
			function (err) {
				if (err) return callback(err)
				callback(null, { success: true, changes: this.changes })
			}
		)
	},

	// 🔹 Eliminar factura
	delete: function (id, callback) {
		const sql = `DELETE FROM Factura WHERE id = ?`
		db.run(sql, [id], function (err) {
			if (err) return callback(err)
			callback(null, { success: true, changes: this.changes })
		})
	},

	// 🔹 Obtener factura por ID
	getById: function (id, callback) {
		const sql = `
            SELECT f.*, v.idCliente
            FROM Factura f
            JOIN Venta v ON f.idVenta = v.id
            WHERE f.id = ?
        `
		db.get(sql, [id], (err, row) => {
			if (err) return callback(err)
			callback(null, row)
		})
	},

	// 🔹 Obtener facturas por venta
	getByVentaId: function (idVenta, callback) {
		const sql = `SELECT * FROM Factura WHERE idVenta = ? ORDER BY id DESC`
		db.all(sql, [idVenta], (err, rows) => {
			if (err) return callback(err)
			callback(null, rows)
		})
	},
}
