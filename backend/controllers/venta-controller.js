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
		callback,
	) {
		if (!idCliente || subtotal == null || impuestos == null || total == null) {
			return callback(
				new Error('idCliente, subtotal, impuestos y total son obligatorios'),
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
			},
		)
		stmt.finalize()
	},

	// 🔹 Crear venta con detalles y actualizar stock (transacción)
	createWithDetails: function (
		{
			idCliente,
			subtotal,
			impuestos,
			total,
			descuento = 0,
			motivoDescuento = '',
			detalles = [],
		},
		callback,
	) {
		if (!idCliente || subtotal == null || impuestos == null || total == null) {
			return callback(
				new Error('idCliente, subtotal, impuestos y total son obligatorios'),
			)
		}
		if (!Array.isArray(detalles) || detalles.length === 0) {
			return callback(new Error('Debe incluir al menos un detalle de venta'))
		}

		const insertVentaSql = `
            INSERT INTO Venta (idCliente, subtotal, impuestos, total, descuento, motivoDescuento)
            VALUES (?, ?, ?, ?, ?, ?)
        `
		const insertDetalleSql = `
            INSERT INTO DetalleVenta 
            (idVenta, idProducto, cantidad, precioUnitario, tasaAplicada, totalLinea)
            VALUES (?, ?, ?, ?, ?, ?)
        `
		const updateStockSql = `
            UPDATE Producto
            SET Cantidad = Cantidad - ?
            WHERE id = ? AND Cantidad >= ?
        `

		let finished = false
		const done = (err, result) => {
			if (finished) return
			finished = true
			callback(err, result)
		}
		const rollback = (err) => {
			db.run('ROLLBACK', () => done(err))
		}

		db.serialize(() => {
			db.run('BEGIN TRANSACTION')
			db.run(
				insertVentaSql,
				[idCliente, subtotal, impuestos, total, descuento, motivoDescuento],
				function (err) {
					if (err) return rollback(err)
					const idVenta = this.lastID

					const procesarDetalle = (index) => {
						if (index >= detalles.length) {
							return db.run('COMMIT', (commitErr) => {
								if (commitErr) return rollback(commitErr)
								done(null, { id: idVenta })
							})
						}

						const d = detalles[index] || {}
						if (
							d.idProducto == null ||
							d.cantidad == null ||
							d.precioUnitario == null ||
							d.tasaAplicada == null
						) {
							return rollback(new Error('Detalle de venta inválido'))
						}

						const cantidad = Number(d.cantidad)
						const precioUnitario = Number(d.precioUnitario)
						const tasaAplicada = Number(d.tasaAplicada)
						if (!Number.isFinite(cantidad) || cantidad <= 0) {
							return rollback(new Error('Cantidad inválida en detalle'))
						}

						db.run(
							updateStockSql,
							[cantidad, d.idProducto, cantidad],
							function (err) {
								if (err) return rollback(err)
								if (this.changes === 0) {
									return rollback(new Error('Stock insuficiente'))
								}

								const totalLinea =
									d.totalLinea != null
										? Number(d.totalLinea)
										: cantidad * precioUnitario * (1 + tasaAplicada)

								db.run(
									insertDetalleSql,
									[
										idVenta,
										d.idProducto,
										cantidad,
										precioUnitario,
										tasaAplicada,
										totalLinea,
									],
									function (err) {
										if (err) return rollback(err)
										procesarDetalle(index + 1)
									},
								)
							},
						)
					}

					procesarDetalle(0)
				},
			)
		})
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
			},
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
