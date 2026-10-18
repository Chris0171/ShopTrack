// backup-service.js - Servicio para backup de la base de datos
const fs = require('fs')
const path = require('path')
const pathService = require('./path-service')

/**
 * Realiza un backup del archivo de base de datos
 * Copia el archivo a la carpeta data/backups con timestamp
 * @returns {object} Resultado del backup
 */
function backupDatabase() {
	try {
		// Limpiar backups manuales antiguos antes de crear uno nuevo
		cleanOldManualBackups(5)
		// Ruta del archivo de base de datos
		const dbPath = pathService.getDatabasePath
			? pathService.getDatabasePath()
			: path.join(__dirname, '../db/database.sql')
		// Carpeta de backups
		const backupsDir = pathService.getBackupsPath
			? pathService.getBackupsPath()
			: path.join(__dirname, '../../data/backups')
		// Asegurar que la carpeta existe
		if (!fs.existsSync(backupsDir)) {
			fs.mkdirSync(backupsDir, { recursive: true })
		}
		// Nombre de archivo con timestamp
		const now = new Date()
		const timestamp = now
			.toISOString()
			.replace(/[:.]/g, '-')
			.replace('T', '_')
			.split('Z')[0]
		const backupName = `backup-${timestamp}.sql`
		const backupPath = path.join(backupsDir, backupName)
		// Copiar archivo
		fs.copyFileSync(dbPath, backupPath)
		return { ok: true, backupPath, backupName }
	} catch (error) {
		return { ok: false, error: error.message }
	}
}

/**
 * Elimina los respaldos automáticos antiguos, dejando solo los más recientes
 * @param {number} maxBackups - Cantidad máxima de backups a conservar
 */
function cleanOldRestoreBackups(maxBackups = 5) {
	const path = require('path')
	const backupsDir = pathService.getBackupsPath()
	const files = fs
		.readdirSync(backupsDir)
		.filter((f) => f.startsWith('db-before-restore-') && f.endsWith('.bak'))
		.map((f) => ({
			name: f,
			fullPath: path.join(backupsDir, f),
			ctime: fs.statSync(path.join(backupsDir, f)).ctimeMs,
		}))
		.sort((a, b) => a.ctime - b.ctime)
	if (files.length > maxBackups - 1) {
		const toDelete = files.slice(0, files.length - (maxBackups - 1))
		toDelete.forEach((f) => {
			try {
				fs.unlinkSync(f.fullPath)
			} catch (e) {}
		})
	}
}

/**
 * Elimina los backups manuales antiguos, dejando solo los más recientes
 * @param {number} maxBackups - Cantidad máxima de backups a conservar
 */
function cleanOldManualBackups(maxBackups = 5) {
	const path = require('path')
	const backupsDir = pathService.getBackupsPath()
	const files = fs
		.readdirSync(backupsDir)
		.filter((f) => f.startsWith('backup-') && f.endsWith('.sql'))
		.map((f) => ({
			name: f,
			fullPath: path.join(backupsDir, f),
			ctime: fs.statSync(path.join(backupsDir, f)).ctimeMs,
		}))
		.sort((a, b) => a.ctime - b.ctime)
	if (files.length >= maxBackups) {
		const toDelete = files.slice(0, files.length - (maxBackups - 1))
		toDelete.forEach((f) => {
			try {
				fs.unlinkSync(f.fullPath)
			} catch (e) {}
		})
	}
}

/**
 * Restaura la base de datos desde un archivo de backup
 * @param {string} backupFilePath - Ruta absoluta del archivo de backup
 * @returns {object} Resultado de la restauración
 */
const REQUIRED_TABLES = [
	'Marca',
	'Producto',
	'Clientes',
	'Venta',
	'DetalleVenta',
	'Factura',
]
const SQLITE_HEADER = 'SQLite format 3\0'

function openReadOnly(file) {
	const sqlite3 = require('sqlite3')
	return new Promise((resolve, reject) => {
		const db = new sqlite3.Database(file, sqlite3.OPEN_READONLY, (err) =>
			err ? reject(err) : resolve(db),
		)
	})
}
const dbAll = (db, sql) =>
	new Promise((resolve, reject) =>
		db.all(sql, (err, rows) => (err ? reject(err) : resolve(rows))),
	)
const dbClose = (db) => new Promise((resolve) => db.close(() => resolve()))

/**
 * Comprueba que un archivo es una base de datos SQLite íntegra de ShopTrack.
 * No modifica el archivo. Devuelve { ok } o { ok:false, error }.
 */
async function validateBackup(file) {
	let db
	try {
		if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
			return { ok: false, error: 'Archivo de backup no encontrado' }
		}
		const fd = fs.openSync(file, 'r')
		const header = Buffer.alloc(16)
		fs.readSync(fd, header, 0, 16, 0)
		fs.closeSync(fd)
		if (header.toString('latin1') !== SQLITE_HEADER) {
			return { ok: false, error: 'El archivo no es una base de datos SQLite' }
		}
		db = await openReadOnly(file)
		const [{ integrity_check: integrity }] = await dbAll(
			db,
			'PRAGMA integrity_check',
		)
		if (integrity !== 'ok') {
			return { ok: false, error: 'La copia de seguridad está dañada' }
		}
		const tablas = (
			await dbAll(db, "SELECT name FROM sqlite_master WHERE type='table'")
		).map((t) => t.name)
		const faltan = REQUIRED_TABLES.filter((t) => !tablas.includes(t))
		if (faltan.length) {
			return {
				ok: false,
				error: `La copia no es de ShopTrack (faltan tablas: ${faltan.join(', ')})`,
			}
		}
		return { ok: true }
	} catch (error) {
		return { ok: false, error: `Copia no válida: ${error.message}` }
	} finally {
		if (db) await dbClose(db)
	}
}

/**
 * Restaura la base de datos desde una copia.
 * 1) valida la copia, 2) la copia a un archivo temporal junto a la base actual,
 * 3) guarda una copia de seguridad de la base actual, 4) cierra la conexión y
 * 5) sustituye la base mediante rename (atómico). El esquema se migra en el
 * siguiente arranque (initDatabase), por lo que tras un resultado con
 * restartRequired la aplicación debe reiniciarse.
 * @param {string} backupFilePath
 * @param {{ closeConnection?: () => Promise<void> }} [opts]
 */
async function restoreDatabase(backupFilePath, { closeConnection } = {}) {
	const dbPath = pathService.getDatabasePath()
	const tmpPath = `${dbPath}.restore-tmp`
	const validation = await validateBackup(backupFilePath)
	if (!validation.ok) return validation

	try {
		let previousBackup
		if (fs.existsSync(dbPath)) {
			cleanOldRestoreBackups(5)
			const timestamp = new Date()
				.toISOString()
				.replace(/[:.]/g, '-')
				.replace('T', '_')
				.split('Z')[0]
			previousBackup = `db-before-restore-${timestamp}.bak`
			fs.copyFileSync(
				dbPath,
				path.join(pathService.getBackupsPath(), previousBackup),
			)
		}
		fs.copyFileSync(backupFilePath, tmpPath)
		if (fs.statSync(tmpPath).size !== fs.statSync(backupFilePath).size) {
			throw new Error('La copia temporal no coincide con el original')
		}
		const staged = await validateBackup(tmpPath)
		if (!staged.ok) throw new Error(staged.error)
	} catch (error) {
		fs.rmSync(tmpPath, { force: true })
		return { ok: false, error: error.message }
	}

	// A partir de aquí la conexión actual deja de ser válida: ante cualquier fallo se pide reiniciar
	try {
		if (closeConnection) await closeConnection()
		for (const suffix of ['-journal', '-wal', '-shm']) {
			fs.rmSync(`${dbPath}${suffix}`, { force: true })
		}
		fs.renameSync(tmpPath, dbPath)
		return { ok: true, restartRequired: true }
	} catch (error) {
		fs.rmSync(tmpPath, { force: true })
		return { ok: false, error: error.message, restartRequired: !!closeConnection }
	}
}

module.exports = {
	backupDatabase,
	restoreDatabase,
	validateBackup,
}
