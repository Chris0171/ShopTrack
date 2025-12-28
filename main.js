const { app, BrowserWindow, Menu, ipcMain, screen } = require('electron')
const fs = require('fs')
const path = require('path')

// ** === Cargar módulos IPC === ** //
const registerClienteIPC = require('./backend/ipcs/cliente.ipc')
const registerProductoIPC = require('./backend/ipcs/producto.ipc')
const registerVentaIPC = require('./backend/ipcs/venta.ipc')
const registerDetalleVentaIPC = require('./backend/ipcs/detalleVenta.ipc')
const registerFacturaIPC = require('./backend/ipcs/factura.ipc')
const registerGeneralIPC = require('./backend/ipcs/general.ipc')

const db = require('./backend/db/initDatabase') // * Inicializa DB

let mainWindow

function createWindow(width, height) {
	mainWindow = new BrowserWindow({
		minWidth: width,
		minHeight: height,
		maxWidth: width,
		maxHeight: height,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			nodeIntegration: false, // si quieres usar Node.js en tu ventana
			contextIsolation: true,
		},
	})
	mainWindow.maximize()
	mainWindow.setBounds({ x: 0, y: 0, width, height })
	mainWindow.loadFile('index.html')
	return mainWindow
}

// Menu.setApplicationMenu(null)

app.whenReady().then(() => {
	// ** Obtener parámetros de la pantalla
	const primaryDisplay = screen.getPrimaryDisplay()
	const { width, height } = primaryDisplay.workAreaSize
	createWindow(width, height)

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow()
	})
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit()
})

// ** === Registrar IPCs === ** //
registerProductoIPC(ipcMain)
registerClienteIPC(ipcMain)
registerVentaIPC(ipcMain)
registerDetalleVentaIPC(ipcMain)
registerFacturaIPC(ipcMain)
registerGeneralIPC(ipcMain, mainWindow)
