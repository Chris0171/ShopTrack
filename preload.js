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
		getPaginated: (filtros) =>
			ipcRenderer.invoke('producto:getPaginated', filtros),
		seleccionarImagen: () => ipcRenderer.invoke('producto:seleccionar-imagen'),
		copiarImagen: (payload) =>
			ipcRenderer.invoke('producto:copiar-imagen', payload),
	},

	cliente: {
		create: (data) => ipcRenderer.invoke('crear-cliente', data),
		getAll: () => ipcRenderer.invoke('cliente:getAll'),
		update: (id, data) => ipcRenderer.invoke('cliente:update', { id, data }),
		delete: (id) => ipcRenderer.invoke('cliente:delete', id),
		buscarPorNombre: (nombre) =>
			ipcRenderer.invoke('cliente:buscar-nombre', nombre),
		getById: (id) => ipcRenderer.invoke('cliente:getById', id),
		getAllWithStats: () => ipcRenderer.invoke('cliente:getAllWithStats'),
	},

	venta: {
		create: (data) => ipcRenderer.invoke('venta:create', data),
		getAll: () => ipcRenderer.invoke('venta:getAll'),
		update: (id, data) => ipcRenderer.invoke('venta:update', { id, data }),
		delete: (id) => ipcRenderer.invoke('venta:delete', id),
		getById: (id) => ipcRenderer.invoke('venta:getById', id),
		getByClienteId: (idCliente) =>
			ipcRenderer.invoke('venta:getByClienteId', idCliente),
	},

	detalleVenta: {
		create: (data) => ipcRenderer.invoke('detalle:create', data),
		getAll: () => ipcRenderer.invoke('detalle:getAll'),
		update: (id, data) => ipcRenderer.invoke('detalle:update', { id, data }),
		delete: (id) => ipcRenderer.invoke('detalle:delete', id),
		getById: (id) => ipcRenderer.invoke('detalle:getById', id),
		getByVentaId: (idVenta) =>
			ipcRenderer.invoke('detalle:getByVentaId', idVenta),
		getPaginated: (limit, offset) =>
			ipcRenderer.invoke('detalle:getPaginated', { limit, offset }),
	},
	factura: {
		create: (data) => ipcRenderer.invoke('factura:create', data),
		getAll: () => ipcRenderer.invoke('factura:getAll'),
		update: (id, data) => ipcRenderer.invoke('factura:update', { id, data }),
		delete: (id) => ipcRenderer.invoke('factura:delete', id),
		getById: (id) => ipcRenderer.invoke('factura:getById', id),
		getByVentaId: (idVenta) =>
			ipcRenderer.invoke('factura:getByVentaId', idVenta),
		generarPDF: (datos) => ipcRenderer.invoke('factura:generarPDF', datos),
		generatePDF: (idVenta) =>
			ipcRenderer.invoke('factura:generatePDF', idVenta),
	},

	general: {
		abrirArchivo: (ruta) => ipcRenderer.invoke('abrirArchivo', ruta),
		abrirImagenProducto: (nombreImagen) =>
			ipcRenderer.invoke('producto:abrir-imagen', nombreImagen),
	},
})
