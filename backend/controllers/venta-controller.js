const db = require('../db/initDatabase')
const configService = require('../services/config-service')
const {
	parseMonto,
	calcularImpuesto,
	calcularTotal,
	toCents,
} = require('../services/money-utils')

const pct = (tasa) => Number((tasa * 100).toFixed(4))

// Tasa vigente en Configuración; si el cliente envía otra, la configuración cambió mientras tanto
function resolverTasa(solicitada) {
	const tasa = configService.getTasaImpuesto()
	if (solicitada != null && Math.abs(Number(solicitada) - tasa) > 1e-9) {
		throw new Error(
			`La tasa de impuestos configurada es ${pct(tasa)}% y no coincide con la de la venta (${pct(Number(solicitada))}%). Recargue la venta.`,
		)
	}
	return tasa
}

// Valida labor/descuento, impuestos (si hay tasa) y total:
// Tax = round((subtotal + labor) * tasa, 2); total = subtotal + tax + labor - descuento
function validarImportes({
	subtotal,
	impuestos,
	total,
	descuento,
	labor,
	tasaImpuesto = null,
}) {
	const lab = parseMonto(labor, 'Labor')
	if (!lab.ok) return { error: lab.error }
	const desc = parseMonto(descuento, 'El descuento')
	if (!desc.ok) return { error: desc.error }
	if ([subtotal, impuestos, total].some((n) => !Number.isFinite(Number(n)))) {
		return { error: 'Subtotal, impuestos y total deben ser numéricos.' }
	}
	if (tasaImpuesto != null) {
		const esperadoImp = calcularImpuesto(subtotal, lab.value, tasaImpuesto)
		if (toCents(impuestos) !== toCents(esperadoImp)) {
			return {
				error: `Los impuestos (${Number(impuestos).toFixed(2)}) no coinciden con (subtotal + labor) × ${pct(tasaImpuesto)}% (${esperadoImp.toFixed(2)}).`,
			}
		}
	}
	const esperado = calcularTotal({
		subtotal,
		impuestos,
		labor: lab.value,
		descuento: desc.value,
	})
	if (esperado < 0) {
		return { error: 'El descuento no puede superar el total de la venta.' }
	}
	const tolerancia = tasaImpuesto != null ? 0 : 1
	if (Math.abs(toCents(total) - toCents(esperado)) > tolerancia) {
		return {
			error: `El total (${Number(total).toFixed(2)}) no coincide con subtotal + labor + impuestos - descuento (${esperado.toFixed(2)}).`,
		}
	}
	return { labor: lab.value, descuento: desc.value, total: esperado }
}

module.exports = {
	validarImportes,

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
			labor = 0,
			tasaImpuesto,
		},
		callback,
	) {
		if (!idCliente || subtotal == null || impuestos == null || total == null) {
			return callback(
				new Error('idCliente, subtotal, impuestos y total son obligatorios'),
			)
		}
		let tasa
		try {
			tasa = resolverTasa(tasaImpuesto)
		} catch (e) {
			return callback(e)
		}
		const importes = validarImportes({
			subtotal,
			impuestos,
			total,
			descuento,
			labor,
			tasaImpuesto: tasa,
		})
		if (importes.error) return callback(new Error(importes.error))

		const sql = `
            INSERT INTO Venta (idCliente, subtotal, impuestos, total, descuento, motivoDescuento, labor, tasaImpuesto)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
		const stmt = db.prepare(sql)
		stmt.run(
			[
				idCliente,
				subtotal,
				impuestos,
				importes.total,
				importes.descuento,
				motivoDescuento,
				importes.labor,
				tasa,
			],
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
			labor = 0,
			tasaImpuesto,
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
		let tasa
		try {
			tasa = resolverTasa(tasaImpuesto)
		} catch (e) {
			return callback(e)
		}
		const importes = validarImportes({
			subtotal,
			impuestos,
			total,
			descuento,
			labor,
			tasaImpuesto: tasa,
		})
		if (importes.error) return callback(new Error(importes.error))

		// El subtotal debe ser la suma de precio × cantidad de los detalles (sin impuestos)
		const subtotalDetalles = detalles.reduce(
			(acc, d) => acc + Number(d?.precioUnitario) * Number(d?.cantidad),
			0,
		)
		if (
			!Number.isFinite(subtotalDetalles) ||
			Math.abs(toCents(subtotalDetalles) - toCents(subtotal)) > 1
		) {
			return callback(
				new Error('El subtotal no coincide con los productos de la venta.'),
			)
		}

		const insertVentaSql = `
            INSERT INTO Venta (idCliente, subtotal, impuestos, total, descuento, motivoDescuento, labor, tasaImpuesto)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
				[
					idCliente,
					subtotal,
					impuestos,
					importes.total,
					importes.descuento,
					motivoDescuento,
					importes.labor,
					tasa,
				],
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
							d.precioUnitario == null
						) {
							return rollback(new Error('Detalle de venta inválido'))
						}

						const cantidad = Number(d.cantidad)
						const precioUnitario = Number(d.precioUnitario)
						const tasaAplicada = tasa
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
									Math.round(cantidad * precioUnitario * (1 + tasaAplicada) * 100) /
									100

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
			labor = 0,
		} = data
		// Se conserva la tasa original de la venta; las ventas antiguas (NULL) no se recalculan
		db.get('SELECT tasaImpuesto FROM Venta WHERE id = ?', [id], (e, row) => {
			if (e) return callback(e)
			if (!row) return callback(new Error('Venta no encontrada'))
			const tasa = row.tasaImpuesto
			const importes = validarImportes({
				subtotal,
				impuestos,
				total,
				descuento,
				labor,
				tasaImpuesto: tasa,
			})
			if (importes.error) return callback(new Error(importes.error))
			const sql = `
            UPDATE Venta
            SET idCliente = ?, subtotal = ?, impuestos = ?, total = ?, descuento = ?, motivoDescuento = ?, labor = ?
            WHERE id = ?
        `
			db.run(
				sql,
				[
					idCliente,
					subtotal,
					impuestos,
					importes.total,
					importes.descuento,
					motivoDescuento,
					importes.labor,
					id,
				],
				function (err) {
					if (err) return callback(err)
					callback(null, { success: true, changes: this.changes })
				},
			)
		})
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
