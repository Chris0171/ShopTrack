export async function initDashboard() {
	// Obtener datos de ingresos de un período específico
	async function cargarIngresos(días = 30) {
		try {
			const resultado = await window.api.venta.getAll()
			const ventas = resultado.ok ? resultado.ventas : []
			console.log('Ventas obtenidas:', ventas)

			// Obtener fecha de hace N días
			const hoy = new Date()
			const haceDías = new Date(hoy.getTime() - días * 24 * 60 * 60 * 1000)

			// Filtrar ventas de los últimos N días
			const ventasÚltimoPeríodo = ventas.filter((venta) => {
				const fechaVenta = new Date(venta.fecha)
				return fechaVenta >= haceDías && fechaVenta <= hoy
			})

			// Agrupar ingresos por día
			const ingresosPorDía = {}

			ventasÚltimoPeríodo.forEach((venta) => {
				// Extraer solo la fecha (YYYY-MM-DD) sin importar el formato
				let fecha = venta.fecha
				if (fecha.includes('T')) {
					fecha = fecha.split('T')[0]
				} else if (fecha.includes(' ')) {
					fecha = fecha.split(' ')[0]
				}
				console.log('Fecha procesada:', fecha, 'Total:', venta.total)
				ingresosPorDía[fecha] = (ingresosPorDía[fecha] || 0) + venta.total
			})

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

	// Variable para almacenar la instancia del gráfico
	let ingresosChart = null

	// Función para actualizar las tarjetas laterales
	async function actualizarTarjetas(días) {
		try {
			const resultado = await window.api.venta.getAll()
			const ventas = resultado.ok ? resultado.ventas : []
			const detalles = await window.api.detalleVenta.getAll()
			const detallesVenta = detalles.ok ? detalles.detalles : []

			// Obtener fecha de hace N días
			const hoy = new Date()
			const haceDías = new Date(hoy.getTime() - días * 24 * 60 * 60 * 1000)

			// Filtrar ventas de los últimos N días
			const ventasÚltimoPeríodo = ventas.filter((venta) => {
				const fechaVenta = new Date(venta.fecha)
				return fechaVenta >= haceDías && fechaVenta <= hoy
			})

			// Agrupar ingresos por día
			const ingresosPorDía = {}
			const productosPorDía = {}

			ventasÚltimoPeríodo.forEach((venta) => {
				let fecha = venta.fecha
				if (fecha.includes('T')) {
					fecha = fecha.split('T')[0]
				} else if (fecha.includes(' ')) {
					fecha = fecha.split(' ')[0]
				}
				ingresosPorDía[fecha] = (ingresosPorDía[fecha] || 0) + venta.total
				productosPorDía[fecha] = productosPorDía[fecha] || 0
			})

			// Contar productos por día
			ventasÚltimoPeríodo.forEach((venta) => {
				const detallesDeVenta = detallesVenta.filter(
					(d) => d.idVenta === venta.id
				)
				let fecha = venta.fecha
				if (fecha.includes('T')) {
					fecha = fecha.split('T')[0]
				} else if (fecha.includes(' ')) {
					fecha = fecha.split(' ')[0]
				}
				productosPorDía[fecha] += detallesDeVenta.reduce(
					(sum, d) => sum + (d.cantidad || 0),
					0
				)
			})

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
			const clientePorNombre = {}

			ventasÚltimoPeríodo.forEach((venta) => {
				if (!clientePorTotal[venta.idCliente]) {
					clientePorTotal[venta.idCliente] = 0
					clientePorNombre[venta.idCliente] =
						venta.clienteNombre || 'Desconocido'
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
						(v) => v.idCliente === parseInt(idCliente)
					).length
				}
			})

			document.getElementById('topClientName').textContent = topClientId
				? clientePorNombre[topClientId]
				: '--'
			document.getElementById('topClientAmount').textContent = topClientTotal
				? `$${topClientTotal.toFixed(2)}`
				: '$0.00'
			document.getElementById('topClientCount').textContent =
				topClientCount || 0

			// TARJETA 3: Promedio de ventas
			const totalIngresos = ventasÚltimoPeríodo.reduce(
				(sum, v) => sum + v.total,
				0
			)

			// Promedio diario
			const avgDaily = totalIngresos / días
			// Promedio semanal
			const avgWeekly = (totalIngresos / días) * 7
			// Promedio mensual
			const avgMonthly = (totalIngresos / días) * 30

			document.getElementById('avgDaily').textContent = `$${avgDaily.toFixed(
				2
			)}`
			document.getElementById('avgWeekly').textContent = `$${avgWeekly.toFixed(
				2
			)}`
			document.getElementById(
				'avgMonthly'
			).textContent = `$${avgMonthly.toFixed(2)}`
		} catch (error) {
			console.error('Error al actualizar tarjetas:', error)
		}
	}

	// Función para actualizar el gráfico
	async function actualizarGráfico(días) {
		const { fechas, ingresos } = await cargarIngresos(días)
		await actualizarTarjetas(días)

		if (!ingresosChart) {
			ingresosChart = echarts.init(document.getElementById('chartIngresos'))
		}

		const títulos = {
			7: 'Ingresos (Últimos 7 días)',
			15: 'Ingresos (Últimos 15 días)',
			30: 'Ingresos (Últimos 30 días)',
		}

		ingresosChart.setOption({
			title: {
				text: títulos[días],
				left: 'center',
				top: 5,
				textStyle: {
					fontSize: 16,
					fontWeight: 'bold',
					color: '#1f2937',
				},
			},
			tooltip: {
				backgroundColor: 'rgba(50, 50, 50, 0.9)',
				borderColor: '#6d3aef',
				borderWidth: 1,
				textStyle: {
					color: '#fff',
					fontSize: 12,
				},
				formatter: (params) => {
					if (params.value !== 0) {
						return `${params.name}<br/>Ingresos: $${params.value.toFixed(2)}`
					}
					return `${params.name}<br/>Sin ventas`
				},
			},
			xAxis: {
				type: 'category',
				data: fechas,
				axisLine: {
					lineStyle: {
						color: '#9ca3af',
						width: 1.5,
					},
				},
				axisLabel: {
					rotate: 45,
					fontSize: 11,
					color: '#1f2937',
					fontWeight: '600',
					margin: 8,
				},
				splitLine: {
					show: false,
				},
				axisTick: {
					lineStyle: {
						color: '#9ca3af',
					},
					length: 6,
				},
				axisPointer: {
					type: 'shadow',
					shadowStyle: {
						color: 'rgba(109, 58, 239, 0.1)',
					},
				},
			},
			yAxis: {
				type: 'value',
				axisLine: {
					lineStyle: {
						color: '#9ca3af',
						width: 1.5,
					},
				},
				axisLabel: {
					fontSize: 11,
					color: '#1f2937',
					fontWeight: '600',
					formatter: '${value}',
					margin: 12,
				},
				splitLine: {
					lineStyle: {
						color: '#e5e7eb',
						type: 'solid',
						width: 0.8,
					},
					interval: 'auto',
				},
				axisTick: {
					lineStyle: {
						color: '#9ca3af',
					},
					length: 6,
				},
				splitArea: {
					show: true,
					areaStyle: {
						color: ['rgba(255, 255, 255, 0)', 'rgba(109, 58, 239, 0.03)'],
					},
				},
				axisPointer: {
					type: 'line',
					lineStyle: {
						color: '#9ca3af',
						width: 1,
						type: 'dashed',
					},
				},
			},
			grid: {
				bottom: 80,
				top: 60,
				left: 70,
				right: 30,
				containLabel: true,
			},
			series: [
				{
					name: 'Ingresos',
					type: 'bar',
					data: ingresos,
					label: {
						show: true,
						position: 'top',
						formatter: (params) => {
							return params.value > 0 ? `$${params.value.toFixed(0)}` : ''
						},
					},
					itemStyle: {
						color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
							{ offset: 0, color: '#6d3aef' }, // color inicial
							{ offset: 1, color: '#183262' }, // color final
						]),
						borderRadius: [6, 6, 0, 0], // top-left, top-right, bottom-right, bottom-left
					},
				},
			],
		})
	}

	// Cargar datos iniciales y renderizar gráfico con 7 días
	await actualizarGráfico(7)

	// Función helper para manejar click en botones
	function manejarClickBotón(botónId, días) {
		document.getElementById(botónId).addEventListener('click', async () => {
			await actualizarGráfico(días)
			// Remover clase active de todos los botones
			document.querySelectorAll('.btn-periodo').forEach((btn) => {
				btn.classList.remove('active')
			})
			// Agregar clase active al botón clickeado
			document.getElementById(botónId).classList.add('active')
		})
	}

	// Agregar event listeners a los botones
	manejarClickBotón('btn7Dias', 7)
	manejarClickBotón('btn15Dias', 15)
	manejarClickBotón('btn30Dias', 30)

	// Hacer el gráfico responsivo
	window.addEventListener('resize', () => {
		if (ingresosChart) {
			ingresosChart.resize()
		}
	})
}
