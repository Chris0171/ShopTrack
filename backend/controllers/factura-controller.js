const db = require('../db/initDatabase')
const configService = require('../services/config-service')

module.exports = {
	// 🔹 Generar número de factura automático
	generateNumeroFactura: function (callback) {
		const hoy = new Date()
		const mm = String(hoy.getMonth() + 1).padStart(2, '0')
		const dd = String(hoy.getDate()).padStart(2, '0')
		const yyyy = hoy.getFullYear()
		const fechaUS = `${mm}${dd}${yyyy}` // MMDDYYYY
		// Obtener prefijo dinámico desde config
		const config = configService.getConfig()
		const prefijoConfig = config.prefijoFactura || 'FAC'
		const prefijo = `${prefijoConfig}-${fechaUS}-`

		const sql = `
            SELECT numeroFactura 
            FROM Factura 
            WHERE numeroFactura LIKE ? 
            ORDER BY numeroFactura DESC 
            LIMIT 1
        `

		db.get(sql, [`${prefijo}%`], (err, row) => {
			if (err) return callback(err)

			let nuevoNumero
			if (!row) {
				nuevoNumero = `${prefijo}0001`
			} else {
				// Extraer el número correlativo correctamente
				const partes = row.numeroFactura.split('-')
				const correlativo = partes[2] ? partes[2].replace(/\D/g, '') : '0'
				const ultimoNumero = parseInt(correlativo)
				nuevoNumero = `${prefijo}${String(ultimoNumero + 1).padStart(4, '0')}`
			}

			callback(null, nuevoNumero)
		})
	},

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
			rutaPDF = null,
		},
		callback,
	) {
		if (!idVenta || subtotal == null || impuestos == null || total == null) {
			return callback(
				new Error('idVenta, subtotal, impuestos y total son obligatorios'),
			)
		}

		// Generar numeroFactura si no se proporciona
		const procesarCreacion = (numFacturaFinal) => {
			const sql = `
                INSERT INTO Factura 
                (idVenta, numeroFactura, subtotal, impuestos, total, metodoPago, observaciones, estado, rutaPDF)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `
			const stmt = db.prepare(sql)
			stmt.run(
				[
					idVenta,
					numFacturaFinal,
					subtotal,
					impuestos,
					total,
					metodoPago,
					observaciones,
					estado,
					rutaPDF,
				],
				function (err) {
					if (err) return callback(err)
					callback(null, { id: this.lastID, numeroFactura: numFacturaFinal })
				},
			)
			stmt.finalize()
		}

		// La factura debe coincidir con los importes guardados en la venta
		db.get(
			'SELECT subtotal, impuestos, total FROM Venta WHERE id = ?',
			[idVenta],
			(ventaErr, venta) => {
				if (ventaErr) return callback(ventaErr)
				if (!venta) return callback(new Error('Venta no encontrada'))
				const cent = (n) => Math.round(Number(n) * 100)
				if (
					cent(venta.subtotal) !== cent(subtotal) ||
					cent(venta.impuestos) !== cent(impuestos) ||
					cent(venta.total) !== cent(total)
				) {
					return callback(
						new Error('Los importes de la factura no coinciden con la venta.'),
					)
				}
				if (!numeroFactura) {
					// Generar número automáticamente
					module.exports.generateNumeroFactura((err, nuevoNumero) => {
						if (err) return callback(err)
						procesarCreacion(nuevoNumero)
					})
				} else {
					procesarCreacion(numeroFactura)
				}
			},
		)
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
			rutaPDF,
		} = data
		const sql = `
            UPDATE Factura
            SET numeroFactura = ?, subtotal = ?, impuestos = ?, total = ?, metodoPago = ?, observaciones = ?, estado = ?, rutaPDF = ?
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
				rutaPDF,
				id,
			],
			function (err) {
				if (err) return callback(err)
				callback(null, { success: true, changes: this.changes })
			},
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

	// 🔹 Actualizar solo la ruta del PDF
	updateRutaPDF: function (idVenta, rutaPDF, callback) {
		const sql = `UPDATE Factura SET rutaPDF = ? WHERE idVenta = ?`
		db.run(sql, [rutaPDF, idVenta], function (err) {
			if (err) return callback(err)
			callback(null, { success: true, changes: this.changes })
		})
	},
}
