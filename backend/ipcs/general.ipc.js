module.exports = function registerGeneralIPC(ipcMain) {
	ipcMain.handle('load-view', (event, viewName) => {
		const viewPath = path.join(__dirname, 'views', viewName)
		return fs.readFileSync(viewPath, 'utf8')
	})
}
