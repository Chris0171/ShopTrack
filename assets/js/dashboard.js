export async function initDashboard() {
	const {
		t = (key) => key,
		formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`,
	} = window.i18n || {}

	// Sistema de caché para evitar múltiples IPC calls
	const cache = {
		ventas: null,
		detalles: null,
		clientes: null,
		productos: null,
		lastUpdate: null,
	}

	// Estado de navegación drill-down
	const dashboardState = {
		view: 'monthly', // 'monthly' | 'daily'
		selectedMonth: null, // { year: 2026, month: 1, label: 'Enero 2026' }
		dailyFilter: 'all', // 7 | 15 | 'all'
	}

	// Estado de actualización para prevenir clicks múltiples
	let isUpdating = false

	// Instancia global de ECharts para reutilizar
	let chartInstance = null

	// Helper para normalizar fechas
	function normalizarFecha(fechaISO) {
		if (!fechaISO) return null
		return fechaISO.split('T')[0].split(' ')[0]
	}

	// Mostrar indicador de carga
	function mostrarCargando() {
		// Skeleton para gráfico
		const chartContainer = document.getElementById('chartIngresos')
		if (chartContainer) {
			chartContainer.style.opacity = '0.5'
			chartContainer.style.pointerEvents = 'none'
		}

		// Skeleton para tarjetas
		document.querySelectorAll('.tarjetas').forEach((tarjeta) => {
			tarjeta.classList.add('animate-pulse', 'opacity-70')
		})

		// Deshabilitar botones
		document.querySelectorAll('.btn-periodo').forEach((btn) => {
			btn.disabled = true
			btn.classList.add('opacity-50', 'cursor-not-allowed')
		})
	}

	// Ocultar indicador de carga
	function ocultarCargando() {
		// Restaurar gráfico
		const chartContainer = document.getElementById('chartIngresos')
		if (chartContainer) {
			chartContainer.style.opacity = '1'
			chartContainer.style.pointerEvents = 'auto'
		}

		// Restaurar tarjetas
		document.querySelectorAll('.tarjetas').forEach((tarjeta) => {
			tarjeta.classList.remove('animate-pulse', 'opacity-70')
		})

		// Habilitar botones
		document.querySelectorAll('.btn-periodo').forEach((btn) => {
			btn.disabled = false
			btn.classList.remove('opacity-50', 'cursor-not-allowed')
		})
	}

	// Mostrar error al usuario
	function mostrarError(mensaje) {
		const chartContainer = document.getElementById('chartIngresos')
		if (chartContainer) {
			chartContainer.innerHTML = `
				<div class="flex flex-col items-center justify-center h-64 text-center">
					<i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
					<p class="text-gray-700 font-semibold mb-2">${t(
						'dashboard.errorLoadingData',
					)}</p>
					<p class="text-gray-500 text-sm">${mensaje}</p>
					<button id="btnReintentarCarga" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
						<i class="fas fa-redo mr-2"></i>${t('dashboard.retry')}
					</button>
				</div>
			`
			// Agregar event listener para reintentar
			const btnReintentar = document.getElementById('btnReintentarCarga')
			if (btnReintentar) {
				btnReintentar.addEventListener('click', () => {
					const btnActivo = document.querySelector('.btn-periodo.active')
					const días =
						btnActivo?.id === 'btn7Dias'
							? 7
							: btnActivo?.id === 'btn15Dias'
								? 15
								: 30
					actualizarGráfico(días)
				})
			}
		}
	}

	// Cargar datos en caché
	async function cargarDatosCache() {
		if (
			cache.ventas &&
			cache.lastUpdate &&
			Date.now() - cache.lastUpdate < 60000
		) {
			return // Usar caché si es menor a 1 minuto
		}

		try {
			const [ventasRes, detallesRes, clientesRes, productosRes] =
				await Promise.all([
					window.api.venta.getAll(),
					window.api.detalleVenta.getAll(),
					window.api.cliente.getAll(),
					window.api.producto.getAll(),
				])

			cache.ventas = ventasRes.ok ? ventasRes.ventas : []
			cache.detalles = detallesRes.ok ? detallesRes.detalles : []
			cache.clientes = clientesRes.ok ? clientesRes.clientes : []

			// producto.getAll() puede retornar array directo o {ok, productos}
			if (Array.isArray(productosRes)) {
				cache.productos = productosRes
			} else if (productosRes?.ok && Array.isArray(productosRes.productos)) {
				cache.productos = productosRes.productos
			} else {
				cache.productos = []
			}

			cache.lastUpdate = Date.now()
		} catch (error) {
			console.error('Error cargando datos en caché:', error)
			cache.ventas = []
			cache.detalles = []
			cache.clientes = []
			cache.productos = []
		}
	}

	// Helper para calcular beneficio y rentabilidad de una venta
	function calcularBeneficioYRentabilidad(detallesVenta, productos) {
		let costoTotal = 0
		let ingresoTotal = 0

		detallesVenta.forEach((detalle) => {
			const producto = productos.find((p) => p.id === detalle.idProducto)
			if (producto) {
				const costo = (producto.precioCosto || 0) * detalle.cantidad
				const ingreso = detalle.precioUnitario * detalle.cantidad
				costoTotal += costo
				ingresoTotal += ingreso
			}
		})

		const beneficio = ingresoTotal - costoTotal
		const rentabilidad = costoTotal > 0 ? (beneficio / costoTotal) * 100 : 0

		return { beneficio, rentabilidad, costoTotal, ingresoTotal }
	}

	// Helper para procesar ventas y agrupar por mes (últimos 12 meses)
	function procesarVentasPorMes(ventas, detallesVenta, productos) {
		const ahora = new Date()
		const hace12Meses = new Date(ahora)
		hace12Meses.setMonth(ahora.getMonth() - 12)

		const ventasPorMes = {}
		const mesesLabels = []

		// Generar últimos 12 meses
		for (let i = 11; i >= 0; i--) {
			const fecha = new Date(ahora)
			fecha.setMonth(ahora.getMonth() - i)
			const year = fecha.getFullYear()
			const month = fecha.getMonth() + 1
			const key = `${year}-${String(month).padStart(2, '0')}`
			const label = fecha.toLocaleDateString('es-ES', {
				month: 'short',
				year: 'numeric',
			})

			mesesLabels.push({ key, label, year, month })
			ventasPorMes[key] = {
				ingresos: 0,
				ordenes: 0,
				productos: 0,
				beneficio: 0,
				costos: 0,
				ventasIds: [],
			}
		}

		// Agregar datos de ventas
		ventas.forEach((venta) => {
			const fechaVenta = new Date(venta.fecha)
			if (fechaVenta >= hace12Meses) {
				const year = fechaVenta.getFullYear()
				const month = fechaVenta.getMonth() + 1
				const key = `${year}-${String(month).padStart(2, '0')}`

				if (ventasPorMes[key]) {
					const detallesDeVenta = detallesVenta.filter(
						(d) => d.idVenta === venta.id,
					)
					const { beneficio, costoTotal } = calcularBeneficioYRentabilidad(
						detallesDeVenta,
						productos,
					)
					const cantidadProductos = detallesDeVenta.reduce(
						(sum, d) => sum + d.cantidad,
						0,
					)

					ventasPorMes[key].ingresos += venta.total
					ventasPorMes[key].ordenes += 1
					ventasPorMes[key].productos += cantidadProductos
					ventasPorMes[key].beneficio += beneficio
					ventasPorMes[key].costos += costoTotal
					ventasPorMes[key].ventasIds.push(venta.id)
				}
			}
		})

		return { ventasPorMes, mesesLabels }
	}

	// Procesar datos de ventas por período (función consolidada)
	function procesarVentasPorPeriodo(días) {
		const ventas = cache.ventas
		const detallesVenta = cache.detalles

		// Obtener fecha de hace N días
		const hoy = new Date()
		const haceDías = new Date(hoy.getTime() - días * 24 * 60 * 60 * 1000)

		// Filtrar ventas de los últimos N días
		const ventasÚltimoPeríodo = ventas.filter((venta) => {
			const fechaVenta = new Date(venta.fecha)
			return fechaVenta >= haceDías && fechaVenta <= hoy
		})

		// Agrupar ingresos y productos por día
		const ingresosPorDía = {}
		const productosPorDía = {}

		ventasÚltimoPeríodo.forEach((venta) => {
			const fecha = normalizarFecha(venta.fecha)
			if (fecha) {
				ingresosPorDía[fecha] = (ingresosPorDía[fecha] || 0) + venta.total
				productosPorDía[fecha] = productosPorDía[fecha] || 0
			}
		})

		// Contar productos por día
		ventasÚltimoPeríodo.forEach((venta) => {
			const detallesDeVenta = detallesVenta.filter(
				(d) => d.idVenta === venta.id,
			)
			const fecha = normalizarFecha(venta.fecha)
			if (fecha) {
				productosPorDía[fecha] += detallesDeVenta.reduce(
					(sum, d) => sum + (d.cantidad || 0),
					0,
				)
			}
		})

		return { ventasÚltimoPeríodo, ingresosPorDía, productosPorDía }
	}

	// Procesar datos de ventas por período (función consolidada)
	function procesarVentasPorPeriodo(días) {
		const ventas = cache.ventas
		const detallesVenta = cache.detalles

		// Obtener fecha de hace N días
		const hoy = new Date()
		const haceDías = new Date(hoy.getTime() - días * 24 * 60 * 60 * 1000)

		// Filtrar ventas de los últimos N días
		const ventasÚltimoPeríodo = ventas.filter((venta) => {
			const fechaVenta = new Date(venta.fecha)
			return fechaVenta >= haceDías && fechaVenta <= hoy
		})

		// Agrupar ingresos y productos por día
		const ingresosPorDía = {}
		const productosPorDía = {}

		ventasÚltimoPeríodo.forEach((venta) => {
			const fecha = normalizarFecha(venta.fecha)
			if (fecha) {
				ingresosPorDía[fecha] = (ingresosPorDía[fecha] || 0) + venta.total
				productosPorDía[fecha] = productosPorDía[fecha] || 0
			}
		})

		// Contar productos por día
		ventasÚltimoPeríodo.forEach((venta) => {
			const detallesDeVenta = detallesVenta.filter(
				(d) => d.idVenta === venta.id,
			)
			const fecha = normalizarFecha(venta.fecha)
			if (fecha) {
				productosPorDía[fecha] += detallesDeVenta.reduce(
					(sum, d) => sum + (d.cantidad || 0),
					0,
				)
			}
		})

		return { ventasÚltimoPeríodo, ingresosPorDía, productosPorDía, haceDías }
	}

	// Obtener datos de ingresos de un período específico
	async function cargarIngresos(días = 30) {
		try {
			const { ingresosPorDía, haceDías } = procesarVentasPorPeriodo(días)

			console.log('Ingresos por día:', ingresosPorDía)

			// Crear array de fechas para el período
			const fechas = []
			const ingresos = []

			for (let i = 0; i < días; i++) {
				const fecha = new Date(haceDías.getTime() + i * 24 * 60 * 60 * 1000)
				// Formatear como YYYY-MM-DD para buscar en el objeto
				const año = fecha.getFullYear()
				const mes = String(fecha.getMonth() + 1).padStart(2, '0')
				const día = String(fecha.getDate()).padStart(2, '0')
				const fechaFormato = `${año}-${mes}-${día}`

				// Formatear como dd/mm/aa para mostrar en el gráfico
				const últimosDigitosAño = String(año).slice(-2)
				const fechaDisplay = `${día}/${mes}/${últimosDigitosAño}`

				fechas.push(fechaDisplay)
				const ingresoDelDía = ingresosPorDía[fechaFormato] || 0
				ingresos.push(ingresoDelDía)
			}
			return { fechas, ingresos }
		} catch (error) {
			console.error('Error al cargar ingresos:', error)
			return { fechas: [], ingresos: [] }
		}
	}

	// Función para actualizar las tarjetas laterales
	async function actualizarTarjetas(días, mesEspecifico = null) {
		try {
			const clientes = cache.clientes
			const clienteMap = new Map(clientes.map((c) => [c.id, c.nombre]))

			let ventasÚltimoPeríodo, ingresosPorDía, productosPorDía

			if (mesEspecifico) {
				// Filtrar ventas del mes específico
				const { year, month } = mesEspecifico
				const ventasDelMes = cache.ventas.filter((venta) => {
					const fechaVenta = new Date(venta.fecha)
					return (
						fechaVenta.getFullYear() === year &&
						fechaVenta.getMonth() + 1 === month
					)
				})

				ventasÚltimoPeríodo = ventasDelMes
				ingresosPorDía = {}
				productosPorDía = {}

				ventasDelMes.forEach((venta) => {
					const fecha = normalizarFecha(venta.fecha)
					if (fecha) {
						ingresosPorDía[fecha] = (ingresosPorDía[fecha] || 0) + venta.total
						productosPorDía[fecha] = productosPorDía[fecha] || 0
					}
				})

				ventasDelMes.forEach((venta) => {
					const detallesDeVenta = cache.detalles.filter(
						(d) => d.idVenta === venta.id,
					)
					const fecha = normalizarFecha(venta.fecha)
					if (fecha) {
						productosPorDía[fecha] += detallesDeVenta.reduce(
							(sum, d) => sum + (d.cantidad || 0),
							0,
						)
					}
				})
			} else {
				// Usar función consolidada de procesamiento (últimos X días)
				const resultado = procesarVentasPorPeriodo(días)
				ventasÚltimoPeríodo = resultado.ventasÚltimoPeríodo
				ingresosPorDía = resultado.ingresosPorDía
				productosPorDía = resultado.productosPorDía
			}

			// Encontrar el día con mayor venta
			let maxDate = null
			let maxAmount = 0
			let maxProducts = 0

			Object.entries(ingresosPorDía).forEach(([fecha, monto]) => {
				if (monto > maxAmount) {
					maxAmount = monto
					maxDate = fecha
					maxProducts = productosPorDía[fecha] || 0
				}
			})

			// Actualizar elementos HTML
			const año = maxDate ? maxDate.split('-')[0] : '--'
			const mes = maxDate ? maxDate.split('-')[1] : '--'
			const día = maxDate ? maxDate.split('-')[2] : '--'

			document.getElementById('maxSaleDate').textContent = maxDate
				? `${día}/${mes}/${año.slice(-2)}`
				: '--'
			document.getElementById('maxSaleAmount').textContent = maxAmount
				? `$${maxAmount.toFixed(2)}`
				: '$0.00'
			document.getElementById('maxSaleProducts').textContent = maxProducts || 0

			// TARJETA 2: Cliente con más compras
			const clientePorTotal = {}

			ventasÚltimoPeríodo.forEach((venta) => {
				if (!clientePorTotal[venta.idCliente]) {
					clientePorTotal[venta.idCliente] = 0
				}
				clientePorTotal[venta.idCliente] += venta.total
			})

			let topClientId = null
			let topClientTotal = 0
			let topClientCount = 0

			Object.entries(clientePorTotal).forEach(([idCliente, total]) => {
				if (total > topClientTotal) {
					topClientTotal = total
					topClientId = idCliente
					topClientCount = ventasÚltimoPeríodo.filter(
						(v) => v.idCliente === parseInt(idCliente),
					).length
				}
			})

			document.getElementById('topClientName').textContent = topClientId
				? clienteMap.get(parseInt(topClientId)) || t('dashboard.unknown')
				: '--'
			document.getElementById('topClientAmount').textContent = topClientTotal
				? `$${topClientTotal.toFixed(2)}`
				: '$0.00'
			document.getElementById('topClientCount').textContent =
				topClientCount || 0

			// TARJETA 3: Promedio de ventas
			// Actualizar título con periodo
			const tituloElement = document.getElementById('avgSalesTitle')
			if (tituloElement) {
				if (mesEspecifico) {
					tituloElement.textContent = t('dashboard.avgSalesMonth').replace(
						'{month}',
						mesEspecifico.label,
					)
				} else {
					tituloElement.textContent = t('dashboard.avgSalesLast30')
				}
			}

			const totalIngresos = ventasÚltimoPeríodo.reduce(
				(sum, v) => sum + v.total,
				0,
			)

			// Promedio diario
			const avgDaily = totalIngresos / días
			// Promedio mensual
			const avgMonthly = (totalIngresos / días) * 30

			document.getElementById('avgDaily').textContent = `$${avgDaily.toFixed(
				2,
			)}`
			document.getElementById('avgMonthly').textContent =
				`$${avgMonthly.toFixed(2)}`
		} catch (error) {
			console.error('Error al actualizar tarjetas:', error)
		}
	}

	// Función para cargar KPIs principales
	async function cargarKPIs() {
		try {
			const ventas = cache.ventas
			const detallesVenta = cache.detalles
			const productos = cache.productos

			// KPI 1: Ventas del día
			const hoy = normalizarFecha(new Date().toISOString())
			const ventasHoy = ventas.filter((v) => normalizarFecha(v.fecha) === hoy)

			const ordenesHoy = ventasHoy.length
			const ingresoHoy = ventasHoy.reduce((sum, v) => sum + v.total, 0)

			// Contar productos vendidos hoy
			let productosHoy = 0
			ventasHoy.forEach((venta) => {
				const detalles = detallesVenta.filter((d) => d.idVenta === venta.id)
				productosHoy += detalles.reduce((sum, d) => sum + (d.cantidad || 0), 0)
			})

			// Actualizar elementos
			const ventasDiaOrdenes = document.querySelector('#ventasDiaOrdenes')
			const ventasDiaProductos = document.querySelector('#ventasDiaProductos')
			const ventasDiaIngreso = document.querySelector('#ventasDiaIngreso')

			if (ventasDiaOrdenes) ventasDiaOrdenes.textContent = ordenesHoy
			if (ventasDiaProductos) ventasDiaProductos.textContent = productosHoy
			if (ventasDiaIngreso)
				ventasDiaIngreso.textContent = `$${ingresoHoy.toFixed(0)}`

			// KPI 2: Stock bajo (según stock mínimo por producto)
			const stockBajo = productos.filter((p) => {
				if (p.activo !== 1) return false
				const min = Number(p.stockMinimo ?? 0)
				const qty = Number(p.Cantidad ?? 0)
				return qty <= min
			}).length
			const stockBajoEl = document.querySelector('#stockBajo')
			if (stockBajoEl) stockBajoEl.textContent = stockBajo

			// KPI 3: Ingresos del período (últimos 30 días)
			const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
			const ventasPeríodo = ventas.filter(
				(v) => new Date(v.fecha) >= hace30Dias,
			)
			const ingresosPeríodo = ventasPeríodo.reduce((sum, v) => sum + v.total, 0)

			const ingresosPeriodoEl = document.querySelector('#ingresosPeriodo')
			if (ingresosPeriodoEl)
				ingresosPeriodoEl.textContent = `$${ingresosPeríodo.toFixed(2)}`

			// KPI 4: Total productos en inventario
			const totalProductos = productos.filter((p) => p.activo === 1).length
			const inventarioEl = document.querySelector('#inventario')
			if (inventarioEl) inventarioEl.textContent = totalProductos
		} catch (error) {
			console.error('Error al cargar KPIs:', error)
		}
	}

	// Función para renderizar vista mensual (últimos 12 meses)
	function renderVistaMensual() {
		const { ventasPorMes, mesesLabels } = procesarVentasPorMes(
			cache.ventas,
			cache.detalles,
			cache.productos,
		)

		const chartDom = document.getElementById('chartIngresos')

		// Reutilizar o crear nueva instancia de ECharts
		if (chartInstance) {
			chartInstance.dispose()
		}
		chartInstance = echarts.init(chartDom)
		const myChart = chartInstance

		const labels = mesesLabels.map((m) => m.label)
		const ingresos = mesesLabels.map((m) => ventasPorMes[m.key].ingresos)
		const beneficios = mesesLabels.map((m) => ventasPorMes[m.key].beneficio)

		const option = {
			title: {
				text: t('dashboard.monthlyChartTitle'),
				left: 'center',
				top: 10,
				textStyle: {
					fontSize: 18,
					fontWeight: 'bold',
					color: '#333',
				},
			},
			tooltip: {
				trigger: 'axis',
				backgroundColor: 'rgba(255, 255, 255, 0.95)',
				borderColor: '#ccc',
				borderWidth: 1,
				padding: 15,
				textStyle: {
					color: '#333',
					fontSize: 13,
				},
				formatter: (params) => {
					const dataIndex = params[0].dataIndex
					const mesKey = mesesLabels[dataIndex].key
					const datos = ventasPorMes[mesKey]

					if (!datos) {
						return `<div>${t('dashboard.noDataAvailable')}</div>`
					}

					const ticketPromedio =
						datos.ordenes > 0 ? datos.ingresos / datos.ordenes : 0
					const rentabilidad =
						datos.costos > 0 ? (datos.beneficio / datos.costos) * 100 : 0

					// Calcular variación vs mes anterior
					let variacionHTML = ''
					if (dataIndex > 0) {
						const mesAnteriorKey = mesesLabels[dataIndex - 1].key
						const ingresosAnterior = ventasPorMes[mesAnteriorKey].ingresos
						if (ingresosAnterior > 0) {
							const variacion =
								((datos.ingresos - ingresosAnterior) / ingresosAnterior) * 100
							const colorVariacion = variacion >= 0 ? '#22c55e' : '#ef4444'
							const simbolo = variacion >= 0 ? '▲' : '▼'
							variacionHTML = `<div style="margin-top:8px; color:${colorVariacion}">
								${simbolo} ${Math.abs(variacion).toFixed(1)}% ${t('dashboard.vsPreviousMonth')}
							</div>`
						}
					}

					return `
						<div style="font-weight:bold; margin-bottom:10px; font-size:14px">${
							params[0].axisValue
						}</div>
						<div style="line-height:1.8">
							<div><span style="color:#6d3aef">●</span> <b>${t(
								'dashboard.ingresos',
							)}:</b> ${formatCurrency(datos.ingresos)}</div>
							<div><span style="color:#22c55e">●</span> <b>${t(
								'dashboard.beneficio',
							)}:</b> ${formatCurrency(datos.beneficio)}</div>
							<div><span style="color:#f59e0b">●</span> <b>${t(
								'dashboard.rentabilidad',
							)}:</b> ${rentabilidad.toFixed(1)}%</div>
							<div style="margin-top:5px; padding-top:5px; border-top:1px solid #e5e7eb">
								<div>📦 <b>${t('dashboard.orders')}:</b> ${datos.ordenes}</div>
								<div>🛒 <b>${t('dashboard.products')}:</b> ${datos.productos}</div>
								<div>💵 <b>${t('dashboard.ticketPromedio')}:</b> ${formatCurrency(
									ticketPromedio,
								)}</div>
							</div>
							${variacionHTML}
						</div>
						<div style="margin-top:10px; padding-top:8px; border-top:1px solid #e5e7eb; color:#6b7280; font-size:11px">
							${t('dashboard.clickForDetail')}
						</div>
					`
				},
			},
			grid: {
				left: '70',
				right: '40',
				bottom: '80',
				top: '60',
				containLabel: false,
			},
			xAxis: {
				type: 'category',
				data: labels,
				axisLabel: {
					rotate: 45,
					fontSize: 11,
					color: '#666',
				},
				axisLine: {
					lineStyle: {
						color: '#d1d5db',
					},
				},
			},
			yAxis: {
				type: 'value',
				name: t('dashboard.incomeAxis'),
				nameTextStyle: {
					color: '#666',
					fontSize: 12,
					padding: [0, 0, 0, 10],
				},
				axisLabel: {
					formatter: (value) => {
						if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
						return `$${value}`
					},
					fontSize: 11,
					color: '#666',
				},
				splitLine: {
					lineStyle: {
						type: 'dashed',
						color: '#e5e7eb',
					},
				},
			},
			series: [
				{
					name: t('dashboard.ingresos'),
					type: 'bar',
					data: ingresos,
					itemStyle: {
						color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
							{ offset: 0, color: '#6d3aef' },
							{ offset: 1, color: '#183262' },
						]),
						borderRadius: [6, 6, 0, 0],
					},
					emphasis: {
						itemStyle: {
							color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
								{ offset: 0, color: '#8b5cf6' },
								{ offset: 1, color: '#2d4a7c' },
							]),
						},
					},
					label: {
						show: true,
						position: 'top',
						formatter: (params) => {
							const value = params.value
							if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
							return `$${value.toFixed(0)}`
						},
						fontSize: 11,
						color: '#374151',
						fontWeight: 'bold',
					},
					barMaxWidth: 60,
				},
			],
		}

		myChart.setOption(option)

		// Event listener para drill-down
		myChart.off('click') // Limpiar listeners previos
		myChart.on('click', (params) => {
			if (params.componentType === 'series') {
				const mesData = mesesLabels[params.dataIndex]
				dashboardState.view = 'daily'
				dashboardState.selectedMonth = {
					year: mesData.year,
					month: mesData.month,
					label: mesData.label,
				}
				dashboardState.dailyFilter = 'all'
				actualizarGráfico() // Re-render con vista diaria
			}
		})
	}

	// Helper para procesar ventas y agrupar por día dentro de un mes específico
	function procesarDiasDeMes(year, month, filtro) {
		const ventas = cache.ventas
		const detallesVenta = cache.detalles
		const productos = cache.productos

		// Filtrar ventas del mes específico
		const ventasDelMes = ventas.filter((venta) => {
			const fechaVenta = new Date(venta.fecha)
			return (
				fechaVenta.getFullYear() === year && fechaVenta.getMonth() + 1 === month
			)
		})

		// Agrupar por día
		const ventasPorDia = {}

		ventasDelMes.forEach((venta) => {
			const fecha = normalizarFecha(venta.fecha)
			if (!fecha) return // Skip si fecha inválida

			if (!ventasPorDia[fecha]) {
				ventasPorDia[fecha] = {
					ingresos: 0,
					ordenes: 0,
					productos: 0,
					beneficio: 0,
					costos: 0,
				}
			}

			const detallesDeVenta = detallesVenta.filter(
				(d) => d.idVenta === venta.id,
			)
			const { beneficio, costoTotal } = calcularBeneficioYRentabilidad(
				detallesDeVenta,
				productos,
			)
			const cantidadProductos = detallesDeVenta.reduce(
				(sum, d) => sum + d.cantidad,
				0,
			)

			ventasPorDia[fecha].ingresos += venta.total
			ventasPorDia[fecha].ordenes += 1
			ventasPorDia[fecha].productos += cantidadProductos
			ventasPorDia[fecha].beneficio += beneficio
			ventasPorDia[fecha].costos += costoTotal
		})

		// Ordenar por fecha y aplicar filtro de días
		const fechasOrdenadas = Object.keys(ventasPorDia).sort()

		let fechasFiltradas = fechasOrdenadas
		if (filtro !== 'all') {
			// Tomar primeros X días del mes, no últimos
			fechasFiltradas = fechasOrdenadas.slice(0, filtro)
		}

		return { ventasPorDia, fechas: fechasFiltradas }
	}

	// Función para renderizar vista diaria con drill-down
	function renderVistaDiaria() {
		if (!dashboardState.selectedMonth) {
			console.error('No hay mes seleccionado para vista diaria')
			return
		}

		const { year, month, label } = dashboardState.selectedMonth
		const filtro = dashboardState.dailyFilter

		const { ventasPorDia, fechas } = procesarDiasDeMes(year, month, filtro)

		const chartDom = document.getElementById('chartIngresos')

		// Reutilizar o crear nueva instancia de ECharts
		if (chartInstance) {
			chartInstance.dispose()
		}
		chartInstance = echarts.init(chartDom)
		const myChart = chartInstance

		// Preparar datos para las series
		const labels = fechas.map((fecha) => {
			const [y, m, d] = fecha.split('-')
			return `${d}/${m}`
		})

		const ingresos = fechas.map((fecha) => ventasPorDia[fecha].ingresos)
		const beneficios = fechas.map((fecha) => ventasPorDia[fecha].beneficio)
		const ordenes = fechas.map((fecha) => ventasPorDia[fecha].ordenes)

		// Calcular promedio móvil de 3 días para ingresos
		const promedioMovil = []
		for (let i = 0; i < ingresos.length; i++) {
			if (i === 0) {
				promedioMovil.push(ingresos[i])
			} else if (i === 1) {
				promedioMovil.push((ingresos[i] + ingresos[i - 1]) / 2)
			} else {
				const promedio = (ingresos[i] + ingresos[i - 1] + ingresos[i - 2]) / 3
				promedioMovil.push(promedio)
			}
		}

		const filtroTexto =
			filtro === 'all'
				? t('dashboard.wholeMonth')
				: t('dashboard.firstDays').replace('{days}', filtro)

		const option = {
			title: {
				text: `${label} - ${filtroTexto}`,
				left: 'center',
				top: 10,
				textStyle: {
					fontSize: 18,
					fontWeight: 'bold',
					color: '#333',
				},
			},
			tooltip: {
				trigger: 'axis',
				backgroundColor: 'rgba(255, 255, 255, 0.95)',
				borderColor: '#ccc',
				borderWidth: 1,
				padding: 15,
				textStyle: {
					color: '#333',
					fontSize: 13,
				},
				formatter: (params) => {
					const dataIndex = params[0].dataIndex
					const fecha = fechas[dataIndex]
					const datos = ventasPorDia[fecha]

					if (!datos) {
						return `<div>${t('dashboard.noDataAvailable')}</div>`
					}

					const ticketPromedio =
						datos.ordenes > 0 ? datos.ingresos / datos.ordenes : 0
					const rentabilidad =
						datos.costos > 0 ? (datos.beneficio / datos.costos) * 100 : 0

					const [y, m, d] = fecha.split('-')
					const fechaFormateada = new Date(y, m - 1, d).toLocaleDateString(
						'es-ES',
						{
							weekday: 'long',
							day: 'numeric',
							month: 'long',
						},
					)

					return `
						<div style="font-weight:bold; margin-bottom:10px; font-size:14px; text-transform:capitalize">${fechaFormateada}</div>
						<div style="line-height:1.8">
							<div><span style="color:#6d3aef">●</span> <b>${t(
								'dashboard.ingresos',
							)}:</b> ${formatCurrency(datos.ingresos)}</div>
							<div><span style="color:#22c55e">●</span> <b>${t(
								'dashboard.beneficio',
							)}:</b> ${formatCurrency(datos.beneficio)}</div>
							<div><span style="color:#f59e0b">●</span> <b>${t(
								'dashboard.rentabilidad',
							)}:</b> ${rentabilidad.toFixed(1)}%</div>
							<div style="margin-top:5px; padding-top:5px; border-top:1px solid #e5e7eb">
								<div>📦 <b>${t('dashboard.orders')}:</b> ${datos.ordenes}</div>
								<div>🛒 <b>${t('dashboard.products')}:</b> ${datos.productos}</div>
								<div>💵 <b>${t('dashboard.ticketPromedio')}:</b> ${formatCurrency(
									ticketPromedio,
								)}</div>
							</div>
						</div>
					`
				},
			},
			legend: {
				data: [
					t('dashboard.ingresos'),
					t('dashboard.beneficio'),
					t('dashboard.orders'),
					t('dashboard.promedioMovil'),
				],
				top: 40,
				textStyle: {
					fontSize: 12,
				},
			},
			grid: {
				left: '70',
				right: '70',
				bottom: '60',
				top: '100',
				containLabel: false,
			},
			xAxis: {
				type: 'category',
				data: labels,
				axisLabel: {
					fontSize: 11,
					color: '#666',
					rotate: labels.length > 15 ? 45 : 0,
				},
				axisLine: {
					lineStyle: {
						color: '#d1d5db',
					},
				},
			},
			yAxis: [
				{
					type: 'value',
					name: t('dashboard.incomeAndProfitAxis'),
					position: 'left',
					nameTextStyle: {
						color: '#666',
						fontSize: 12,
					},
					axisLabel: {
						formatter: (value) => {
							if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`
							return `$${value}`
						},
						fontSize: 11,
						color: '#666',
					},
					splitLine: {
						lineStyle: {
							type: 'dashed',
							color: '#e5e7eb',
						},
					},
				},
				{
					type: 'value',
					name: t('dashboard.ordersAxis'),
					position: 'right',
					nameTextStyle: {
						color: '#666',
						fontSize: 12,
					},
					axisLabel: {
						fontSize: 11,
						color: '#666',
					},
					splitLine: {
						show: false,
					},
				},
			],
			series: [
				{
					name: 'Ingresos',
					type: 'line',
					data: ingresos,
					smooth: true,
					lineStyle: {
						color: '#6d3aef',
						width: 3,
					},
					itemStyle: {
						color: '#6d3aef',
					},
					areaStyle: {
						color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
							{ offset: 0, color: 'rgba(109, 58, 239, 0.3)' },
							{ offset: 1, color: 'rgba(109, 58, 239, 0.05)' },
						]),
					},
					emphasis: {
						focus: 'series',
					},
				},
				{
					name: 'Beneficio',
					type: 'line',
					data: beneficios,
					smooth: true,
					lineStyle: {
						color: '#22c55e',
						width: 2,
					},
					itemStyle: {
						color: '#22c55e',
					},
					emphasis: {
						focus: 'series',
					},
				},
				{
					name: 'Órdenes',
					type: 'line',
					data: ordenes,
					smooth: true,
					yAxisIndex: 1,
					lineStyle: {
						color: '#f59e0b',
						width: 2,
						type: 'dashed',
					},
					itemStyle: {
						color: '#f59e0b',
					},
					emphasis: {
						focus: 'series',
					},
				},
				{
					name: 'Promedio Móvil',
					type: 'line',
					data: promedioMovil,
					smooth: true,
					lineStyle: {
						color: '#94a3b8',
						width: 2,
						type: 'dotted',
					},
					itemStyle: {
						color: '#94a3b8',
					},
					symbol: 'none',
					emphasis: {
						focus: 'series',
					},
				},
			],
		}

		myChart.setOption(option)
	}

	// Función para actualizar el gráfico con debounce
	async function actualizarGráfico() {
		// Prevenir clicks múltiples
		if (isUpdating) {
			return
		}

		isUpdating = true
		mostrarCargando()

		try {
			await cargarDatosCache()

			// Delegar a la vista correspondiente según el estado
			if (dashboardState.view === 'monthly') {
				renderVistaMensual()
				// Ocultar botones de filtro diario (usar visibility para mantener espacio)
				const filtrosDiarios = document.getElementById('filtrosDiarios')
				if (filtrosDiarios) filtrosDiarios.style.visibility = 'hidden'
			} else {
				renderVistaDiaria()
				// Mostrar botones de filtro diario
				const filtrosDiarios = document.getElementById('filtrosDiarios')
				if (filtrosDiarios) filtrosDiarios.style.visibility = 'visible'
				// Actualizar estado activo de botones
				actualizarBotonesFiltro()
			}

			// Actualizar tarjetas y KPIs (independiente de la vista)
			if (dashboardState.view === 'monthly') {
				// Vista mensual: usar últimos 30 días
				await actualizarTarjetas(30)
			} else {
				// Vista diaria: calcular con todo el mes seleccionado
				const { year, month } = dashboardState.selectedMonth
				const diasDelMes = new Date(year, month, 0).getDate() // Días del mes (28-31)
				await actualizarTarjetas(diasDelMes, dashboardState.selectedMonth)
			}
			await cargarKPIs()
		} catch (error) {
			console.error('Error al actualizar el gráfico:', error)
			mostrarError(t('dashboard.errorLoadingDashboard'))
		} finally {
			ocultarCargando()
			isUpdating = false
		}
	}

	// Función para actualizar estado activo de botones de filtro diario
	function actualizarBotonesFiltro() {
		const botones = {
			btn7Dias: 7,
			btn15Dias: 15,
			btnTodoMes: 'all',
		}

		Object.keys(botones).forEach((btnId) => {
			const btn = document.getElementById(btnId)
			if (btn) {
				if (botones[btnId] === dashboardState.dailyFilter) {
					btn.classList.add('active')
				} else {
					btn.classList.remove('active')
				}
			}
		})
	}

	// Función para volver a vista mensual
	function volverAVistaMensual() {
		dashboardState.view = 'monthly'
		dashboardState.selectedMonth = null
		dashboardState.dailyFilter = 'all'
		actualizarGráfico()
	}

	// Función para cambiar filtro de días en vista diaria
	function cambiarFiltroDiario(filtro) {
		if (dashboardState.view === 'daily') {
			dashboardState.dailyFilter = filtro
			actualizarGráfico()
		}
	}

	// Cargar datos iniciales y renderizar gráfico en vista mensual
	await actualizarGráfico()

	// Event listener único para responsive (reutiliza chartInstance global)
	window.addEventListener('resize', () => {
		if (chartInstance) {
			chartInstance.resize()
		}
	})

	// Event listeners para botones de filtro diario
	const btn7Dias = document.getElementById('btn7Dias')
	const btn15Dias = document.getElementById('btn15Dias')
	const btnTodoMes = document.getElementById('btnTodoMes')
	const btnVolver = document.getElementById('btnVolver')

	if (btn7Dias) btn7Dias.addEventListener('click', () => cambiarFiltroDiario(7))
	if (btn15Dias)
		btn15Dias.addEventListener('click', () => cambiarFiltroDiario(15))
	if (btnTodoMes)
		btnTodoMes.addEventListener('click', () => cambiarFiltroDiario('all'))
	if (btnVolver) btnVolver.addEventListener('click', volverAVistaMensual)
}
