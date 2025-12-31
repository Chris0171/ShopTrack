// backend/controllers/producto-controller.js
const db = require('../db/initDatabase')

module.exports = {
	// Obtener todos los productos con sus números de parte y fotos
	getAll: function (callback) {
		const sql = `SELECT * FROM Producto WHERE activo = 1 ORDER BY id DESC`
		db.all(sql, [], (err, rows) => {
			if (err) return callback(err)

			// Si no hay productos, retornar array vacío
			if (!rows || rows.length === 0) {
				return callback(null, [])
			}

			// Cargar números de parte y fotos para cada producto
			let completed = 0
			const productos = []

			rows.forEach((producto) => {
				// Obtener números de parte
				db.all(
					`SELECT nroParte, esPrincipal FROM ProductoNumerosParte WHERE idProducto = ? ORDER BY esPrincipal DESC`,
					[producto.id],
					(err, numerosParte) => {
						if (err) return callback(err)

						// Obtener fotos
						db.all(
						`SELECT nombreImagen, esPrincipal, orden FROM ProductoFotos WHERE idProducto = ? ORDER BY esPrincipal DESC, orden ASC`,
							[producto.id],
							(err, fotos) => {
								if (err) return callback(err)

								productos.push({
									...producto,
									numerosParte: numerosParte || [],
									fotos: fotos || [],
								})

								completed++
								if (completed === rows.length) {
									callback(null, productos)
								}
							}
						)
					}
				)
			})
		})
	},

	// Crear producto con múltiples números de parte y fotos
	create: function (
		{
			NroParte, // Número principal (requerido para mantener compatibilidad)
			numerosParte = [], // Array de números adicionales
			Descripcion,
			Cantidad = 0,
			Precio = 0,
			Tasas = 0,
			precioCosto = 0,
			esOriginal = 1,
			fotos = [], // Array de rutas de fotos
		},
		callback
	) {
		if (!NroParte || !Descripcion) {
			return callback(new Error('NroParte y Descripcion son obligatorios'))
		}

		const sql = `
			INSERT INTO Producto (NroParte, Descripcion, Cantidad, Precio, Tasas, precioCosto, esOriginal)
			VALUES (?, ?, ?, ?, ?, ?, ?)
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
			],
			function (err) {
				if (err) return callback(err)

				const idProducto = this.lastID

				// Insertar número principal en ProductoNumerosParte
				db.run(
					`INSERT INTO ProductoNumerosParte (idProducto, nroParte, esPrincipal) VALUES (?, ?, 1)`,
					[idProducto, NroParte],
					(err) => {
						if (err) return callback(err)

						// Insertar números adicionales si existen
						if (numerosParte && numerosParte.length > 0) {
							let insertedNumeros = 0
							numerosParte.forEach((nroParte) => {
								db.run(
									`INSERT INTO ProductoNumerosParte (idProducto, nroParte, esPrincipal) VALUES (?, ?, 0)`,
									[idProducto, nroParte],
									(err) => {
										if (err)
											console.error('Error insertando número adicional:', err)
										insertedNumeros++
										if (insertedNumeros === numerosParte.length) {
											insertarFotos()
										}
									}
								)
							})
						} else {
							insertarFotos()
						}
					}
				)

				function insertarFotos() {
					// Insertar todas las fotos - la primera será marcada como principal
					if (fotos && fotos.length > 0) {
						let insertedFotos = 0
						fotos.forEach((foto, index) => {
							const esPrincipal = index === 0 ? 1 : 0
							db.run(
							`INSERT INTO ProductoFotos (idProducto, nombreImagen, esPrincipal, orden) VALUES (?, ?, ?, ?)`,
								[idProducto, foto, esPrincipal, index],
								(err) => {
									if (err) console.error('Error insertando foto:', err)
									insertedFotos++
									if (insertedFotos === fotos.length) {
										callback(null, { id: idProducto })
									}
								}
							)
						})
					} else {
						callback(null, { id: idProducto })
					}
				}
			}
		)
	},

	// Actualizar producto con múltiples números de parte y fotos
	update: function (id, data, callback) {
		const {
			NroParte,
			numerosParte = [],
			Descripcion,
			Cantidad,
			Precio,
			Tasas,
			precioCosto,
			esOriginal,
			fotos = [],
		} = data

		const sql = `
			UPDATE Producto 
			SET NroParte = ?, Descripcion = ?, Cantidad = ?, Precio = ?, Tasas = ?, precioCosto = ?, esOriginal = ?
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
				id,
			],
			function (err) {
				if (err) return callback(err)

				// Actualizar números de parte
				// 1. Eliminar números existentes
				db.run(
					`DELETE FROM ProductoNumerosParte WHERE idProducto = ?`,
					[id],
					(err) => {
						if (err) return callback(err)

						// 2. Insertar número principal
						db.run(
							`INSERT INTO ProductoNumerosParte (idProducto, nroParte, esPrincipal) VALUES (?, ?, 1)`,
							[id, NroParte],
							(err) => {
								if (err) return callback(err)

								// 3. Insertar números adicionales
								if (numerosParte && numerosParte.length > 0) {
									let insertedNumeros = 0
									numerosParte.forEach((nroParte) => {
										db.run(
											`INSERT INTO ProductoNumerosParte (idProducto, nroParte, esPrincipal) VALUES (?, ?, 0)`,
											[id, nroParte],
											(err) => {
												if (err)
													console.error('Error actualizando número:', err)
												insertedNumeros++
												if (insertedNumeros === numerosParte.length) {
													actualizarFotos()
												}
											}
										)
									})
								} else {
									actualizarFotos()
								}
							}
						)
					}
				)

				function actualizarFotos() {
					// 1. Eliminar fotos existentes
					db.run(
						`DELETE FROM ProductoFotos WHERE idProducto = ?`,
						[id],
						(err) => {
							if (err) return callback(err)

							// 2. Insertar todas las fotos - la primera será marcada como principal
							if (fotos && fotos.length > 0) {
								let insertedFotos = 0
								fotos.forEach((foto, index) => {
									const esPrincipal = index === 0 ? 1 : 0
									db.run(
										`INSERT INTO ProductoFotos (idProducto, nombreImagen, esPrincipal, orden) VALUES (?, ?, ?, ?)`,
										[id, foto, esPrincipal, index],
										(err) => {
											if (err) console.error('Error actualizando foto:', err)
											insertedFotos++
											if (insertedFotos === fotos.length) {
												callback(null)
											}
										}
									)
								})
							} else {
								callback(null)
							}
						}
					)
				}
					}
				}
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
