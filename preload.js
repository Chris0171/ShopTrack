const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
	loadView: async (viewName) => {
		return await ipcRenderer.invoke('load-view', viewName)
	},

	producto: {
		getAll: () => ipcRenderer.invoke('producto:getAll'),
		create: (data) => ipcRenderer.invoke('producto:create', data),
		update: (id, data) => ipcRenderer.invoke('producto:update', { id, data }),
		delete: (id) => ipcRenderer.invoke('producto:delete', id),
		buscarProducto: (nroParte) =>
			ipcRenderer.invoke('producto:buscar-producto', nroParte),
		actualizarStock: (idProducto, nuevaCantidad) =>
			ipcRenderer.invoke(
				'producto:actualizar-stock',
				idProducto,
				nuevaCantidad
			),
	},
})
