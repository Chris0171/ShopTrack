const db = require('../db/initDatabase')

module.exports = {
	// 🔹 Obtener todos los detalles de ventas
	getAll: function (callback) {
		const sql = `
            SELECT dv.*, p.Descripcion AS productoDescripcion, v.idCliente
            FROM DetalleVenta dv
            JOIN Producto p ON dv.idProducto = p.id
            JOIN Venta v ON dv.idVenta = v.id
            ORDER BY dv.id DESC
        `
		db.all(sql, [], (err, rows) => {
			if (err) return callback(err)
			callback(null, rows)
		})
	},

	// 🔹 Crear detalle de venta
	create: function (
		{ idVenta, idProducto, cantidad, precioUnitario, tasaAplicada, totalLinea },
		callback
	) {
		if (
			!idVenta ||
			!idProducto ||
			cantidad == null ||
			precioUnitario == null ||
			tasaAplicada == null ||
			totalLinea == null
		) {
			return callback(new Error('Todos los campos son obligatorios'))
		}

		const sql = `
            INSERT INTO DetalleVenta 
            (idVenta, idProducto, cantidad, precioUnitario, tasaAplicada, totalLinea)
            VALUES (?, ?, ?, ?, ?, ?)
        `
		const stmt = db.prepare(sql)
		stmt.run(
			[idVenta, idProducto, cantidad, precioUnitario, tasaAplicada, totalLinea],
			function (err) {
				if (err) return callback(err)
				callback(null, { id: this.lastID })
			}
		)
		stmt.finalize()
	},

	// 🔹 Actualizar detalle de venta
	update: function (id, data, callback) {
		const { idProducto, cantidad, precioUnitario, tasaAplicada, totalLinea } =
			data
		const sql = `
            UPDATE DetalleVenta
            SET idProducto = ?, cantidad = ?, precioUnitario = ?, tasaAplicada = ?, totalLinea = ?
            WHERE id = ?
        `
		db.run(
			sql,
			[idProducto, cantidad, precioUnitario, tasaAplicada, totalLinea, id],
			function (err) {
				if (err) return callback(err)
				callback(null, { success: true, changes: this.changes })
			}
		)
	},

	// 🔹 Eliminar detalle de venta
	delete: function (id, callback) {
		const sql = `DELETE FROM DetalleVenta WHERE id = ?`
		db.run(sql, [id], function (err) {
			if (err) return callback(err)
			callback(null, { success: true, changes: this.changes })
		})
	},

	// 🔹 Obtener detalle por ID
	getById: function (id, callback) {
		const sql = `
            SELECT dv.*, p.Descripcion AS productoDescripcion
            FROM DetalleVenta dv
            JOIN Producto p ON dv.idProducto = p.id
            WHERE dv.id = ?
        `
		db.get(sql, [id], (err, row) => {
			if (err) return callback(err)
			callback(null, row)
		})
	},

	// 🔹 Obtener todos los detalles de una venta
	getByVentaId: function (idVenta, callback) {
		const sql = `
            SELECT dv.*, p.Descripcion AS productoDescripcion, p.NroParte AS nroParte, p.Descripcion AS descripcion
            FROM DetalleVenta dv
            JOIN Producto p ON dv.idProducto = p.id
            WHERE dv.idVenta = ?
        `
		db.all(sql, [idVenta], (err, rows) => {
			if (err) return callback(err)
			callback(null, rows)
		})
	},
	// ** Obtener historial
	getPaginated: function (limit, offset, callback) {
		const sql = `
        SELECT 
            v.id AS idVenta,
            v.fecha,
            v.subtotal,
            v.impuestos,
            v.total,
            c.nombre AS clienteNombre,
            c.telefono AS clienteTelefono,
            c.email AS clienteEmail,
            c.direccion AS clienteDireccion,
            f.numeroFactura,
            f.metodoPago,
            f.estado
        FROM Venta v
        JOIN Clientes c ON v.idCliente = c.id
        LEFT JOIN Factura f ON f.idVenta = v.id
        ORDER BY v.id DESC
        LIMIT ? OFFSET ?;
    `
		db.all(sql, [limit, offset], (err, rows) => {
			if (err) return callback(err)
			callback(null, rows)
		})
	},
}
