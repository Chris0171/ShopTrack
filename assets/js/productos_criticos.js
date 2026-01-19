export async function initProductosCriticos() {
	const { t = (k) => k } = window.i18n || {}

	const PAGE_SIZE = 5
	let baseCriticos = []
	let filtradosCache = []
	let pagina = 1
	let totalPaginas = 1

	const inputTexto = document.querySelector('#filtroCriticoTexto')
	const selectMarca = document.querySelector('#filtroCriticoMarca')
	const selectUbicacion = document.querySelector('#filtroCriticoUbicacion')
	const selectSeveridad = document.querySelector('#filtroCriticoSeveridad')
	const btnLimpiar = document.querySelector('#btnLimpiarCriticos')
	const tbody = document.querySelector('#tablaStockCriticoBody')
	const contador = document.querySelector('#stockCriticoCount')
	const paginacion = document.querySelector('#paginaCriticos')
	const btnPrev = document.querySelector('#prevCriticos')
	const btnNext = document.querySelector('#nextCriticos')
	const paginacionNumeros = document.querySelector('#paginacionCriticos')

	if (!tbody) return

	const debounce = (fn, delay = 300) => {
		let tId
		return (...args) => {
			clearTimeout(tId)
			tId = setTimeout(() => fn(...args), delay)
		}
	}

	function obtenerCriticos(productos) {
		return (productos || [])
			.filter((p) => {
				if (p.activo !== 1) return false
				const min = Number(p.stockMinimo ?? 0)
				const qty = Number(p.Cantidad ?? 0)
				return qty <= min
			})
			.map((p) => ({
				...p,
				_qty: Number(p.Cantidad ?? 0),
				_min: Number(p.stockMinimo ?? 0),
			}))
			.sort((a, b) => a._qty - a._min - (b._qty - b._min))
	}

	function renderPaginacionNumeros() {
		if (!paginacionNumeros) return
		paginacionNumeros.innerHTML = ''
		if (totalPaginas <= 1) return

		for (let i = 1; i <= totalPaginas; i++) {
			const btn = document.createElement('button')
			btn.type = 'button'
			btn.textContent = String(i)
			btn.className =
				i === pagina
					? 'bg-indigo-600 text-white px-3 py-1 rounded-lg font-semibold shadow'
					: 'bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded-lg font-semibold transition'
			btn.addEventListener('click', () => {
				if (i === pagina) return
				pagina = i
				renderTabla(filtradosCache)
			})
			paginacionNumeros.appendChild(btn)
		}
	}

	function renderTabla(items) {
		filtradosCache = Array.isArray(items) ? items : []
		totalPaginas = Math.max(1, Math.ceil(filtradosCache.length / PAGE_SIZE))
		if (pagina > totalPaginas) pagina = totalPaginas

		if (contador) contador.textContent = filtradosCache.length
		if (paginacion) paginacion.textContent = `${pagina}/${totalPaginas}`
		if (btnPrev) btnPrev.disabled = pagina <= 1
		if (btnNext) btnNext.disabled = pagina >= totalPaginas
		renderPaginacionNumeros()

		if (filtradosCache.length === 0) {
			tbody.innerHTML = `
				<tr>
					<td colspan="5" class="text-center py-4 text-gray-500">${
						t('dashboard.criticalEmpty') || 'No hay productos en stock crítico'
					}</td>
				</tr>
			`
			return
		}

		const start = (pagina - 1) * PAGE_SIZE
		const end = start + PAGE_SIZE
		const pageItems = filtradosCache.slice(start, end)

		const rows = pageItems
			.map((p) => {
				const nroPartePrincipal =
					p.numerosParte?.find((n) => n.esPrincipal === 1)?.nroParte ||
					p.NroParte ||
					'—'
				const descripcion = p.Descripcion || ''
				const productoLabel = descripcion
					? `${nroPartePrincipal} - ${descripcion}`
					: nroPartePrincipal
				const marca = p.marcaNombre || '—'
				const ubicacion = p.ubicacion || '—'
				return `
					<tr class="border-t">
						<td class="py-2 px-3 font-semibold text-gray-800">${productoLabel}</td>
						<td class="py-2 px-3 text-gray-700">${marca}</td>
						<td class="py-2 px-3 text-gray-700">${ubicacion}</td>
						<td class="py-2 px-3 text-right text-gray-700">${p._qty}</td>
						<td class="py-2 px-3 text-right text-red-600 font-semibold">${p._min}</td>
					</tr>
				`
			})
			.join('')

		tbody.innerHTML = rows
	}

	function aplicarFiltros() {
		const texto = (inputTexto?.value || '').trim().toLowerCase()
		const marca = selectMarca?.value || ''
		const ubicacion = selectUbicacion?.value || ''
		const severidad = selectSeveridad?.value || 'all'

		const filtrados = baseCriticos.filter((p) => {
			if (marca && p.marcaNombre !== marca) return false
			if (ubicacion) {
				if (ubicacion === '__NONE__') {
					if (p.ubicacion) return false
				} else if (p.ubicacion !== ubicacion) {
					return false
				}
			}

			if (severidad === 'zero' && p._qty > 0) return false
			if (severidad === 'belowMin' && p._qty > p._min) return false
			if (severidad === 'under2' && p._qty > 2) return false

			if (texto) {
				const nroParte = (p.NroParte || '').toLowerCase()
				const descripcion = (p.Descripcion || '').toLowerCase()
				const otrosNumeros = (p.numerosParte || [])
					.map((n) => String(n.nroParte || '').toLowerCase())
					.join(' ')
				if (
					!nroParte.includes(texto) &&
					!descripcion.includes(texto) &&
					!otrosNumeros.includes(texto)
				) {
					return false
				}
			}

			return true
		})

		pagina = 1
		renderTabla(filtrados)
	}

	function cargarOpcionesFiltros(productos) {
		if (!selectMarca || !selectUbicacion) return

		const activos = (productos || []).filter((p) => p.activo === 1)
		const marcas = new Set()
		const ubicaciones = new Set()
		let tieneSinUbicacion = false

		activos.forEach((p) => {
			if (p.marcaNombre) marcas.add(p.marcaNombre)
			if (p.ubicacion) {
				ubicaciones.add(p.ubicacion)
			} else {
				tieneSinUbicacion = true
			}
		})

		selectMarca.innerHTML = `
			<option value="">${t('dashboard.criticalFilterBrandAll') || 'Todas las marcas'}</option>
		`
		Array.from(marcas)
			.sort((a, b) => a.localeCompare(b))
			.forEach((marca) => {
				const opt = document.createElement('option')
				opt.value = marca
				opt.textContent = marca
				selectMarca.appendChild(opt)
			})

		selectUbicacion.innerHTML = `
			<option value="">${
				t('dashboard.criticalFilterLocationAll') || 'Todas las ubicaciones'
			}</option>
		`
		Array.from(ubicaciones)
			.sort((a, b) => a.localeCompare(b))
			.forEach((ubicacion) => {
				const opt = document.createElement('option')
				opt.value = ubicacion
				opt.textContent = ubicacion
				selectUbicacion.appendChild(opt)
			})
		if (tieneSinUbicacion) {
			const opt = document.createElement('option')
			opt.value = '__NONE__'
			opt.textContent =
				t('dashboard.criticalFilterLocationNone') || 'Sin ubicación'
			selectUbicacion.appendChild(opt)
		}
	}

	function conectarEventos() {
		inputTexto?.addEventListener('input', debounce(aplicarFiltros))
		selectMarca?.addEventListener('change', aplicarFiltros)
		selectUbicacion?.addEventListener('change', aplicarFiltros)
		selectSeveridad?.addEventListener('change', aplicarFiltros)

		btnLimpiar?.addEventListener('click', () => {
			if (inputTexto) inputTexto.value = ''
			if (selectMarca) selectMarca.value = ''
			if (selectUbicacion) selectUbicacion.value = ''
			if (selectSeveridad) selectSeveridad.value = 'all'
			aplicarFiltros()
		})

		btnPrev?.addEventListener('click', () => {
			if (pagina > 1) {
				pagina--
				renderTabla(filtradosCache)
			}
		})
		btnNext?.addEventListener('click', () => {
			if (pagina < totalPaginas) {
				pagina++
				renderTabla(filtradosCache)
			}
		})
	}

	async function cargarDatos() {
		try {
			const res = await window.api.producto.getAll()
			const productos = Array.isArray(res)
				? res
				: res?.ok
					? res.productos || []
					: []
			baseCriticos = obtenerCriticos(productos)
			cargarOpcionesFiltros(productos)
			conectarEventos()
			aplicarFiltros()
		} catch (error) {
			console.error('Error cargando productos críticos:', error)
			tbody.innerHTML = `
				<tr>
					<td colspan="5" class="text-center py-4 text-red-600">${
						t('dashboard.criticalEmpty') || 'No hay productos en stock crítico'
					}</td>
				</tr>
			`
		}
	}

	cargarDatos()
}
