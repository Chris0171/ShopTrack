const db = require('../db/initDatabase')

module.exports = {
	// 🔹 Obtener todos los clientes
	getAll: function (callback) {
		const sql = `SELECT * FROM Clientes ORDER BY id DESC`
		db.all(sql, [], (err, rows) => {
			if (err) return callback(err)
			callback(null, rows)
		})
	},

	// 🔹 Crear cliente
	create: function (
		{ nombre, telefono = null, email = null, direccion = null },
		callback
	) {
		if (!nombre) {
			return callback(new Error('El nombre es obligatorio'))
		}

		const sql = `
            INSERT INTO Clientes (nombre, telefono, email, direccion)
            VALUES (?, ?, ?, ?)
        `
		const stmt = db.prepare(sql)
		stmt.run([nombre, telefono, email, direccion], function (err) {
			if (err) return callback(err)
			callback(null, { id: this.lastID }) // devuelve id del cliente creado
		})
		stmt.finalize()
	},

	// 🔹 Actualizar cliente
	update: function (id, data, callback) {
		const { nombre, telefono, email, direccion } = data
		const sql = `
            UPDATE Clientes
            SET nombre = ?, telefono = ?, email = ?, direccion = ?
            WHERE id = ?
        `
		db.run(sql, [nombre, telefono, email, direccion, id], function (err) {
			if (err) return callback(err)
			callback(null, { success: true, changes: this.changes })
		})
	},

	// 🔹 Eliminar cliente
	delete: function (id, callback) {
		const sql = `DELETE FROM Clientes WHERE id = ?`
		db.run(sql, [id], function (err) {
			if (err) return callback(err)
			callback(null, { success: true, changes: this.changes })
		})
	},

	// 🔹 Buscar cliente por nombre
	buscarPorNombre: function (nombre, callback) {
		const sql = `SELECT * FROM Clientes WHERE nombre = ?`
		db.get(sql, [nombre], (err, row) => {
			if (err) return callback(err)
			callback(null, row)
		})
	},

	// 🔹 Buscar cliente por ID
	getById: function (id, callback) {
		const sql = `SELECT * FROM Clientes WHERE id = ?`
		db.get(sql, [id], (err, row) => {
			if (err) return callback(err)
			callback(null, row)
		})
	},
}
