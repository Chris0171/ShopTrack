const path = require('path')
const fs = require('fs')
const { shell, dialog, ipcMain: ipcMainModule } = require('electron')
const configService = require('../services/config-service')
const pathService = require('../services/path-service')

// Variable global para almacenar el BrowserWindow y poder hacer emit
let mainWindow = null

module.exports = function registerGeneralIPC(ipcMain, mainWindowRef = null) {
	mainWindow = mainWindowRef
	ipcMain.handle('load-view', (event, viewName) => {
		const viewPath = path.join(__dirname, '../../views', viewName)
		return fs.readFileSync(viewPath, 'utf8')
	})

	ipcMain.handle('abrirArchivo', async (event, ruta) => {
		try {
			await shell.openPath(ruta)
			return { ok: true }
		} catch (error) {
			return { ok: false, error: error.message }
		}
	})

	// Abrir imagen de producto por nombre (usando pathService)
	ipcMain.handle('producto:abrir-imagen', async (event, nombreImagen) => {
		try {
			if (!nombreImagen) return { ok: false, error: 'Nombre de imagen vacío' }

			const imagesPath = pathService.getProductImagesPath()
			const imagePath = path.join(imagesPath, nombreImagen)

			if (!fs.existsSync(imagePath)) {
				return { ok: false, error: 'Archivo no encontrado' }
			}
			await shell.openPath(imagePath)
			return { ok: true, path: imagePath }
		} catch (error) {
			return { ok: false, error: error.message }
		}
	})

	// Obtener la ruta completa de una imagen de producto
	ipcMain.handle('producto:get-imagen-path', async (event, nombreImagen) => {
		try {
			if (!nombreImagen) return { ok: false, error: 'Nombre de imagen vacío' }

			const imagesPath = pathService.getProductImagesPath()
			const imagePath = path.join(imagesPath, nombreImagen)

			// Convertir a URL para usar en el frontend
			const fileUrl = `file:///${imagePath.replace(/\\/g, '/')}`

			return { ok: true, path: fileUrl, exists: fs.existsSync(imagePath) }
		} catch (error) {
			return { ok: false, error: error.message }
		}
	})

	// Seleccionar imagen desde el sistema de archivos
	ipcMain.handle('producto:seleccionar-imagen', async () => {
		const result = await dialog.showOpenDialog({
			title: 'Seleccionar imagen del producto',
			properties: ['openFile'],
			filters: [
				{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
			],
		})

		if (result.canceled || result.filePaths.length === 0) {
			return { ok: false, canceled: true }
		}

		const fullPath = result.filePaths[0]
		const fileName = path.basename(fullPath)
		return { ok: true, path: fullPath, fileName }
	})

	// Copiar imagen seleccionada a data/images/productos (usando pathService)
	ipcMain.handle(
		'producto:copiar-imagen',
		async (event, { sourcePath, fileName }) => {
			try {
				if (!sourcePath)
					return { ok: false, error: 'Ruta de origen no definida' }

				// Usar pathService para obtener la ruta correcta
				const assetsDir = pathService.getProductImagesPath()

				const ext = path.extname(sourcePath) || path.extname(fileName || '')
				const baseName = fileName
					? path.parse(fileName).name
					: path.parse(sourcePath).name

				let targetName = ext ? `${baseName}${ext}` : baseName
				let targetPath = path.join(assetsDir, targetName)

				// Evitar sobrescritura: agrega sufijo incremental si existe
				let counter = 1
				while (fs.existsSync(targetPath)) {
					targetName = `${baseName}-${counter}${ext}`
					targetPath = path.join(assetsDir, targetName)
					counter += 1
				}

				fs.copyFileSync(sourcePath, targetPath)

				return { ok: true, savedName: targetName, savedPath: targetPath }
			} catch (error) {
				return { ok: false, error: error.message }
			}
		}
	)

	// ==================== CONFIG HANDLERS ====================

	ipcMain.handle('config:get', async () => {
		try {
			const config = configService.getConfig()
			console.log('✓ Config enviada al renderer')
			return { ok: true, data: config }
		} catch (error) {
			return { ok: false, error: error.message }
		}
	})

	ipcMain.handle('config:set', async (event, updates) => {
		try {
			const config = configService.updateConfig(updates)

			// Notificar a todos los renderers
			if (mainWindow) {
				mainWindow.webContents.send('config:changed', config)
			}

			console.log('✓ Configuración actualizada')
			return { ok: true, data: config }
		} catch (error) {
			console.error('Error al actualizar config:', error)
			return { ok: false, error: error.message }
		}
	})

	ipcMain.handle('config:reset', async () => {
		try {
			const config = configService.resetConfig()

			if (mainWindow) {
				mainWindow.webContents.send('config:changed', config)
			}

			return { ok: true, data: config }
		} catch (error) {
			return { ok: false, error: error.message }
		}
	})
}
