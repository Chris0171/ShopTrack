const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
	loadView: async (viewName) => {
		return await ipcRenderer.invoke('load-view', viewName)
	},
})
