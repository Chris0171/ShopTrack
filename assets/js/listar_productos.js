import { initUpdateProducto } from './actualizar_producto.js'
import { loadView } from '../../renderer.js'

export function initProductList() {
	const { t = (k) => k } = window.i18n || {}
	const tablaBody = document.getElementById('tablaProductosBody')
	const filtroNroParte = document.getElementById('filtroNroParte')
	const filtroDescripcion = document.getElementById('filtroDescripcion')
	const btnFiltrar = document.getElementById('btnFiltrar')
	const btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros')

	const prevPageBtn = document.getElementById('prevPage')
	const nextPageBtn = document.getElementById('nextPage')
	const paginaActualSpan = document.getElementById('paginaActual')

	const appModal = document.getElementById('appModal')
	const btnModalOk = document.getElementById('btn-modal-ok')
	const btnModalCancel = document.getElementById('btn-modal-cancel')

	const imageModal = document.getElementById('imageModal')
	const modalImage = document.getElementById('modalImage')
	const closeImageModal = document.getElementById('closeImageModal')

	let pagina = 1
	let limite = 10 // Puedes cambiar este valor dinámicamente
	let totalPaginas = 1
	let selectedDeleteId = null
	let sortField = null
	let sortAsc = true

	const debounce = (fn, delay = 300) => {
		let t
		return (...args) => {
			clearTimeout(t)
			t = setTimeout(() => fn(...args), delay)
		}
	}

	function formatMoney(value) {
		const num = Number(value)
		const safeNum = Number.isFinite(num) ? num : 0
		return `$${safeNum.toFixed(2)}`
	}

	function formatPercent(value) {
		const num = Number(value)
		const safeNum = Number.isFinite(num) ? num : 0
		return `${safeNum.toFixed(2)}%`
	}

	function formatPageLabel(page, total) {
		const label = t('products.list.pageLabel') || 'Página {page} de {total}'
		return label.replace('{page}', page).replace('{total}', total)
	}

	function renderTipo(esOriginal) {
		return esOriginal
			? `<span class="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">${t(
					'products.list.original'
			  )}</span>`
			: `<span class="px-2 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-700">${t(
					'products.list.copy'
			  )}</span>`
	}

	function renderEstado(activo) {
		return activo
			? `<span class="px-2 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">${t(
					'products.list.active'
			  )}</span>`
			: `<span class="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">${t(
					'products.list.inactive'
			  )}</span>`
	}

	function renderImagen(fotos, id) {
		// fotos es un array de objetos { nombreImagen, esPrincipal, orden }
		if (!fotos || fotos.length === 0) {
			return `<div class="flex items-center justify-center"><span class="text-gray-400 text-sm">${t(
				'products.list.noImage'
			)}</span></div>`
		}

		// Ordenar fotos: principal primero, luego por orden
		const fotosOrdenadas = [...fotos].sort((a, b) => {
			if (a.esPrincipal !== b.esPrincipal) {
				return b.esPrincipal - a.esPrincipal
			}
			return a.orden - b.orden
		})

		// Generar HTML para todas las fotos
		const thumbnails = fotosOrdenadas
			.map((foto, index) => {
				const imagePath = `./assets/images/productos/${foto.nombreImagen}`
				const isPrincipal = foto.esPrincipal === 1
				return `
				<img data-foto-index="${index}" data-product-id="${id}" src="${imagePath}" alt="${
					foto.nombreImagen
				}" 
					 class="product-thumb w-10 h-10 object-cover rounded border ${
							isPrincipal
								? 'border-indigo-500 ring-2 ring-indigo-300'
								: 'border-gray-300'
						} cursor-pointer hover:border-indigo-500 hover:shadow-lg transition" 
					 title="${isPrincipal ? '★ ' : ''}${t('products.list.zoomImage')}" />
			`
			})
			.join('')

		return `
			<div class="flex items-center justify-center gap-1 flex-wrap max-w-[120px]">
				${thumbnails}
			</div>
		`
	}

	function sortProductos(lista) {
		if (!sortField) return lista
		const arr = [...lista]
		arr.sort((a, b) => {
			const A = a[sortField]
			const B = b[sortField]
			// num sort if both numbers
			if (typeof A === 'number' && typeof B === 'number') {
				return sortAsc ? A - B : B - A
			}
			const strA = A !== undefined && A !== null ? String(A) : ''
			const strB = B !== undefined && B !== null ? String(B) : ''
			return sortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA)
		})
		return arr
	}

	function showModal(icon, title, message, opts = { confirm: false }) {
		document.getElementById('modalIcon').textContent = icon
		document.getElementById('modalTitle').textContent = title
		document.getElementById('modalMessage').textContent = message

		btnModalCancel.style.display = opts.confirm ? 'inline-block' : 'none'

		appModal.style.display = 'flex'
	}

	function hideModal() {
		appModal.style.display = 'none'
		selectedDeleteId = null
	}

	function showImageModal(nombreImagen) {
		const imagePath = `./assets/images/productos/${nombreImagen}`
		modalImage.src = imagePath
		imageModal.style.display = 'flex'
	}

	function hideImageModal() {
		imageModal.style.display = 'none'
		modalImage.src = ''
	}

	btnModalOk.onclick = () => {
		if (selectedDeleteId) {
			window.api.producto
				.delete(selectedDeleteId)
				.then(() => {
					hideModal()
					cargarProductos()
				})
				.catch((err) => {
					console.error(err)
					showModal('❌', 'Error', t('products.list.deleteError'))
				})
		} else {
			hideModal()
		}
	}

	btnModalCancel.onclick = hideModal
	appModal.addEventListener('click', (e) => {
		if (e.target === appModal) hideModal()
	})

	closeImageModal.onclick = hideImageModal
	imageModal.addEventListener('click', (e) => {
		if (e.target === imageModal) hideImageModal()
	})

	async function cargarProductos() {
		const filtros = {
			NroParte: filtroNroParte.value.trim(),
			Descripcion: filtroDescripcion.value.trim(),
			pagina,
			limite,
		}

		// Llamada a IPC preload
		const result = await window.api.producto.getPaginated(filtros)
		const productos = result && result.productos ? result.productos : []
		const total =
			result && typeof result.totalPaginas !== 'undefined'
				? result.totalPaginas
				: 1
		totalPaginas = total || 1

		const listaOrdenada = sortProductos(productos)

		// Limpiar tabla
		tablaBody.innerHTML = ''

		if (!listaOrdenada || listaOrdenada.length === 0) {
			tablaBody.innerHTML = `
			<tr>
				<td colspan="10" class="text-center py-6 text-gray-500 font-semibold">${t(
					'products.list.noProducts'
				)}</td>
			</tr>`
			paginaActualSpan.textContent = formatPageLabel(pagina, totalPaginas)
			prevPageBtn.style.display = pagina > 1 ? 'inline-block' : 'none'
			nextPageBtn.style.display =
				pagina < totalPaginas ? 'inline-block' : 'none'
			return
		}

		listaOrdenada.forEach((p) => {
			const tr = document.createElement('tr')
			tr.className = 'hover:bg-gray-50'

			// Obtener número de parte principal
			const nroPartePrincipal =
				p.numerosParte?.find((n) => n.esPrincipal === 1)?.nroParte || p.NroParte
			const cantidadNumerosParte = p.numerosParte?.length || 0
			const numeroParteDisplay =
				cantidadNumerosParte > 1
					? `${nroPartePrincipal} <span class="text-xs text-gray-500">(+${
							cantidadNumerosParte - 1
					  })</span>`
					: nroPartePrincipal

			tr.innerHTML = `
        <td class="py-3 px-4 text-sm font-bold text-gray-800">${numeroParteDisplay}</td>
        <td class="py-3 px-4 text-sm text-gray-700">${p.Descripcion}</td>
        <td class="py-3 px-4 text-sm text-right text-gray-700">${
					p.Cantidad
				}</td>
        <td class="py-3 px-4 text-sm text-right text-gray-800 font-semibold">${formatMoney(
					p.Precio
				)}</td>
        <td class="py-3 px-4 text-sm text-right text-gray-700">${formatMoney(
					Number.isFinite(Number(p.precioCosto)) ? Number(p.precioCosto) : 0
				)}</td>
        <td class="py-3 px-4 text-sm text-right text-gray-700">${formatPercent(
					p.Tasas
				)}</td>
        <td class="py-3 px-4 text-center">${renderTipo(p.esOriginal)}</td>
        <td class="py-3 px-4 text-sm text-gray-700">${renderImagen(
					p.fotos,
					p.id
				)}</td>
        <td class="py-3 px-4 text-center">${renderEstado(p.activo)}</td>
        <td class="py-3 px-4 text-center flex gap-2 justify-center">
          <button id="btn_upd_${
						p.id
					}" class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-lg text-sm font-semibold shadow">Actualizar</button>
          <button id="btn_del_${
						p.id
					}" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm font-semibold shadow">Eliminar</button>
        </td>
      `

			tablaBody.appendChild(tr)

			const btnUpdate = document.getElementById(`btn_upd_${p.id}`)
			if (btnUpdate) {
				btnUpdate.textContent = t('common.edit')
				btnUpdate.addEventListener('click', async () => {
					await loadView('actualizar_producto.html')
					initUpdateProducto(p.id)
				})
			}

			// Manejador para todas las miniaturas del producto (delegación de eventos)
			const productThumbs = document.querySelectorAll(
				`img.product-thumb[data-product-id="${p.id}"]`
			)
			productThumbs.forEach((thumb) => {
				thumb.addEventListener('click', () => {
					const fotoIndex = parseInt(thumb.dataset.fotoIndex)
					if (p.fotos && p.fotos[fotoIndex]) {
						// Ordenar fotos igual que en renderImagen
						const fotosOrdenadas = [...p.fotos].sort((a, b) => {
							if (a.esPrincipal !== b.esPrincipal) {
								return b.esPrincipal - a.esPrincipal
							}
							return a.orden - b.orden
						})
						showImageModal(fotosOrdenadas[fotoIndex].nombreImagen)
					}
				})
			})

			const btnDelete = document.getElementById(`btn_del_${p.id}`)
			if (btnDelete) {
				btnDelete.textContent = t('common.delete')
				btnDelete.addEventListener('click', async () => {
					selectedDeleteId = p.id
					showModal(
						'⚠️',
						t('products.list.deleteConfirmTitle'),
						t('products.list.deleteConfirmMessage'),
						{
							confirm: true,
						}
					)
				})
			}
		})

		// Actualizar número de página
		paginaActualSpan.textContent = formatPageLabel(pagina, totalPaginas)

		// Mostrar u ocultar botones de paginación
		prevPageBtn.style.display = pagina > 1 ? 'inline-block' : 'none'
		nextPageBtn.style.display = pagina < totalPaginas ? 'inline-block' : 'none'
	}

	// Sortable headers
	document.querySelectorAll('th.sortable').forEach((th) => {
		th.addEventListener('click', () => {
			const field = th.getAttribute('data-field')
			if (!field) return
			if (sortField === field) {
				sortAsc = !sortAsc
			} else {
				sortField = field
				sortAsc = true
			}
			cargarProductos()
		})
	})
	// Filtrar automáticamente al escribir (con debounce)
	const onFilter = debounce(() => {
		pagina = 1
		cargarProductos()
	}, 300)

	filtroNroParte.addEventListener('input', onFilter)
	filtroDescripcion.addEventListener('input', onFilter)

	btnFiltrar.addEventListener('click', () => {
		pagina = 1
		cargarProductos()
	})

	btnLimpiarFiltros.addEventListener('click', () => {
		filtroNroParte.value = ''
		filtroDescripcion.value = ''
		pagina = 1
		cargarProductos()
	})

	// Paginación
	prevPageBtn.addEventListener('click', () => {
		if (pagina > 1) {
			pagina--
			cargarProductos()
		}
	})

	nextPageBtn.addEventListener('click', () => {
		pagina++
		cargarProductos()
	})

	// Inicializar tabla
	cargarProductos()
}
