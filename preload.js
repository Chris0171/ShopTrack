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
	cliente: {
		create: (data) => ipcRenderer.invoke('crear-cliente', data),
		getAll: () => ipcRenderer.invoke('cliente:getAll'),
		update: (id, data) => ipcRenderer.invoke('cliente:update', { id, data }),
		delete: (id) => ipcRenderer.invoke('cliente:delete', id),
		buscarPorNombre: (nombre) =>
			ipcRenderer.invoke('cliente:buscar-nombre', nombre),
		getById: (id) => ipcRenderer.invoke('cliente:getById', id),
	},
})
