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
function restoreDatabase(backupFilePath) {
	const path = require('path')
	try {
		if (!backupFilePath || !fs.existsSync(backupFilePath)) {
			return { ok: false, error: 'Archivo de backup no encontrado' }
		}
		const dbPath = pathService.getDatabasePath()
		if (!fs.existsSync(dbPath)) {
			// Si no existe la base de datos, simplemente copiar
			fs.copyFileSync(backupFilePath, dbPath)
			return { ok: true }
		}
		// Limpiar backups antiguos antes de crear uno nuevo
		cleanOldRestoreBackups(5)
		// Hacer respaldo del archivo actual antes de sobrescribir
		const now = new Date()
		const timestamp = now
			.toISOString()
			.replace(/[:.]/g, '-')
			.replace('T', '_')
			.split('Z')[0]
		const dbBackupName = `db-before-restore-${timestamp}.bak`
		const dbBackupPath = path.join(pathService.getBackupsPath(), dbBackupName)
		fs.copyFileSync(dbPath, dbBackupPath)
		// Restaurar backup
		fs.copyFileSync(backupFilePath, dbPath)
		return { ok: true, previousBackup: dbBackupName }
	} catch (error) {
		return { ok: false, error: error.message }
	}
}

module.exports = {
	backupDatabase,
	restoreDatabase,
}
