export function initDashboard() {
	// GRÁFICO 1 - CLIENTES
	const clientesChart = echarts.init(document.getElementById('chartClientes'))

	clientesChart.setOption({
		title: { text: 'Clientes (3 meses)', left: 'center', top: 5 },
		tooltip: {},
		xAxis: { type: 'category', data: ['Sept', 'Oct', 'Nov'] },
		yAxis: { type: 'value' },
		series: [
			{
				name: 'Clientes',
				type: 'bar',
				data: [120, 150, 180],
				label: {
					show: true,
					position: 'top',
				},
				itemStyle: {
					color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
						{ offset: 0, color: '#6d3aef' }, // color inicial
						{ offset: 1, color: '#183262' }, // color final
					]),
					borderRadius: [10, 10, 0, 0], // top-left, top-right, bottom-right, bottom-left
				},
			},
		],
	})

	// GRÁFICO 2 - Productos vendidos
	const productosChart = echarts.init(document.getElementById('chartProductos'))

	productosChart.setOption({
		title: { text: 'Productos Vendidos', left: 'center', top: 5 },
		tooltip: {},
		xAxis: { type: 'category', data: ['Sept', 'Oct', 'Nov'] },
		yAxis: { type: 'value' },
		series: [
			{
				name: 'Productos',
				type: 'bar',
				data: [300, 400, 350],
				label: {
					show: true,
					position: 'top',
				},
			},
		],
	})

	// GRÁFICO 3 - Ingresos
	const ingresosChart = echarts.init(document.getElementById('chartIngresos'))

	ingresosChart.setOption({
		title: { text: 'Ingresos ($)', left: 'center', top: 5 },
		tooltip: {},
		xAxis: {
			type: 'category',
			data: ['Sept', 'Oct', 'Nov'],
		},
		yAxis: { type: 'value' },
		series: [
			{
				name: 'Ingresos',
				type: 'bar',
				data: [5000, 7500, 6200],
				label: {
					show: true,
					position: 'top',
				},
			},
		],
	})
}
