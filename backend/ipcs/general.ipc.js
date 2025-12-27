const path = require('path')
const fs = require('fs')
const { shell, dialog } = require('electron')

module.exports = function registerGeneralIPC(ipcMain) {
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

	// Abrir imagen de producto por nombre (ubicada en assets/images/productos)
	ipcMain.handle('producto:abrir-imagen', async (event, nombreImagen) => {
		try {
			if (!nombreImagen) return { ok: false, error: 'Nombre de imagen vacío' }
			const assetsPath = path.join(
				__dirname,
				'../../assets/images/productos',
				nombreImagen
			)
			if (!fs.existsSync(assetsPath)) {
				return { ok: false, error: 'Archivo no encontrado' }
			}
			await shell.openPath(assetsPath)
			return { ok: true, path: assetsPath }
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

	// Copiar imagen seleccionada a assets/images/productos
	ipcMain.handle(
		'producto:copiar-imagen',
		async (event, { sourcePath, fileName }) => {
			try {
				if (!sourcePath)
					return { ok: false, error: 'Ruta de origen no definida' }

				const assetsDir = path.join(__dirname, '../../assets/images/productos')
				if (!fs.existsSync(assetsDir)) {
					fs.mkdirSync(assetsDir, { recursive: true })
				}

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
}
