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
			numerosParte = [], // Array de objetos { nroParte, esPrincipal }
			Descripcion,
			Cantidad = 0,
			Precio = 0,
			Tasas = 0,
			precioCosto = 0,
			esOriginal = 1,
			fotos = [], // Array de nombres de archivo
		},
		callback
	) {
		// Validación: debe haber al menos un número de parte
		if (!numerosParte || numerosParte.length === 0 || !Descripcion) {
			return callback(new Error('numerosParte y Descripcion son obligatorios'))
		}

		// Obtener el número de parte principal
		const nroPartePrincipal =
			numerosParte.find((n) => n.esPrincipal === 1) || numerosParte[0]

		const sql = `
			INSERT INTO Producto (NroParte, Descripcion, Cantidad, Precio, Tasas, precioCosto, esOriginal)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`

		db.run(
			sql,
			[
				nroPartePrincipal.nroParte,
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

				// Insertar todos los números de parte
				if (numerosParte && numerosParte.length > 0) {
					let insertedNumeros = 0
					numerosParte.forEach((numeroParte) => {
						db.run(
							`INSERT INTO ProductoNumerosParte (idProducto, nroParte, esPrincipal) VALUES (?, ?, ?)`,
							[idProducto, numeroParte.nroParte, numeroParte.esPrincipal],
							(err) => {
								if (err) console.error('Error insertando número de parte:', err)
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
			numerosParte = [],
			Descripcion,
			Cantidad,
			Precio,
			Tasas,
			precioCosto,
			esOriginal,
			fotos = [],
		} = data

		// Obtener el número de parte principal
		const nroPartePrincipal =
			numerosParte.find((n) => n.esPrincipal === 1) || numerosParte[0]

		// Normalizar el nombre de la propiedad (puede venir como NroParte o nroParte)
		const nroParteValor =
			nroPartePrincipal.NroParte || nroPartePrincipal.nroParte

		const sql = `
			UPDATE Producto 
			SET NroParte = ?, Descripcion = ?, Cantidad = ?, Precio = ?, Tasas = ?, precioCosto = ?, esOriginal = ?
			WHERE id = ?
		`

		db.run(
			sql,
			[
				nroParteValor,
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

						// 2. Insertar todos los números de parte
						if (numerosParte && numerosParte.length > 0) {
							let insertedNumeros = 0
							numerosParte.forEach((numeroParte) => {
								// Normalizar el nombre de la propiedad (puede venir como NroParte o nroParte)
								const nroParteValor =
									numeroParte.NroParte || numeroParte.nroParte
								db.run(
									`INSERT INTO ProductoNumerosParte (idProducto, nroParte, esPrincipal) VALUES (?, ?, ?)`,
									[id, nroParteValor, numeroParte.esPrincipal],
									(err) => {
										if (err) console.error('Error actualizando número:', err)
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

				function actualizarFotos() {
					// 1. Eliminar fotos existentes
					db.run(
						`DELETE FROM ProductoFotos WHERE idProducto = ?`,
						[id],
						(err) => {
							if (err) return callback(err)

							// 2. Insertar todas las fotos con su información
							if (fotos && fotos.length > 0) {
								let insertedFotos = 0
								fotos.forEach((foto) => {
									// foto puede ser un objeto { nombreImagen, esPrincipal, orden } o un string
									const nombreImagen =
										typeof foto === 'string' ? foto : foto.nombreImagen
									const esPrincipal =
										typeof foto === 'object' ? foto.esPrincipal || 0 : 0
									const orden = typeof foto === 'object' ? foto.orden || 0 : 0

									db.run(
										`INSERT INTO ProductoFotos (idProducto, nombreImagen, esPrincipal, orden) VALUES (?, ?, ?, ?)`,
										[id, nombreImagen, esPrincipal, orden],
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
		// Primero buscar el producto por número de parte (puede ser principal o alterno)
		const sqlBuscarEnPrincipal = `SELECT * FROM Producto WHERE NroParte = ? AND activo = 1`

		db.get(sqlBuscarEnPrincipal, [nroParte], (err, producto) => {
			if (err) return callback(err)

			// Si se encontró en el campo principal
			if (producto) {
				// Cargar números de parte
				db.all(
					`SELECT nroParte, esPrincipal FROM ProductoNumerosParte WHERE idProducto = ? ORDER BY esPrincipal DESC`,
					[producto.id],
					(err, numerosParte) => {
						if (err) return callback(err)

						// Cargar fotos
						db.all(
							`SELECT nombreImagen, esPrincipal, orden FROM ProductoFotos WHERE idProducto = ? ORDER BY esPrincipal DESC, orden ASC`,
							[producto.id],
							(err, fotos) => {
								if (err) return callback(err)

								callback(null, {
									...producto,
									numerosParte: numerosParte || [],
									fotos: fotos || [],
								})
							}
						)
					}
				)
			} else {
				// Si no se encontró, buscar en la tabla de números de parte alternos
				const sqlBuscarEnAlternos = `
					SELECT p.* FROM Producto p
					INNER JOIN ProductoNumerosParte pnp ON p.id = pnp.idProducto
					WHERE pnp.nroParte = ? AND p.activo = 1
					LIMIT 1
				`

				db.get(sqlBuscarEnAlternos, [nroParte], (err, producto) => {
					if (err) return callback(err)
					if (!producto) return callback(null, null)

					// Cargar números de parte
					db.all(
						`SELECT nroParte, esPrincipal FROM ProductoNumerosParte WHERE idProducto = ? ORDER BY esPrincipal DESC`,
						[producto.id],
						(err, numerosParte) => {
							if (err) return callback(err)

							// Cargar fotos
							db.all(
								`SELECT nombreImagen, esPrincipal, orden FROM ProductoFotos WHERE idProducto = ? ORDER BY esPrincipal DESC, orden ASC`,
								[producto.id],
								(err, fotos) => {
									if (err) return callback(err)

									callback(null, {
										...producto,
										numerosParte: numerosParte || [],
										fotos: fotos || [],
									})
								}
							)
						}
					)
				})
			}
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

					// Si no hay productos, retornar resultado vacío
					if (!rows || rows.length === 0) {
						return callback(null, {
							productos: [],
							total,
							pagina,
							limite,
							totalPaginas: Math.ceil(total / limite),
						})
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
											callback(null, {
												productos,
												total,
												pagina,
												limite,
												totalPaginas: Math.ceil(total / limite),
											})
										}
									}
								)
							}
						)
					})
				}
			)
		})
	},
}
