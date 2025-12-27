import { initUpdateProducto } from './actualizar_producto.js'
import { loadView } from '../../renderer.js'

export function initProductList() {
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

	function renderTipo(esOriginal) {
		return esOriginal
			? '<span class="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">Original</span>'
			: '<span class="px-2 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-700">Copia</span>'
	}

	function renderEstado(activo) {
		return activo
			? '<span class="px-2 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">Activo</span>'
			: '<span class="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">Inactivo</span>'
	}

	function renderImagen(nombreImagen, id) {
		if (!nombreImagen) {
			return '<div class="flex items-center justify-center"><span class="text-gray-400 text-sm">Sin imagen</span></div>'
		}
		const imagePath = `./assets/images/productos/${nombreImagen}`
		return `
			<div class="flex items-center justify-center">
				<img id="thumb_${id}" src="${imagePath}" alt="${nombreImagen}" 
					   class="w-12 h-12 object-cover rounded border border-gray-300 cursor-pointer hover:border-indigo-500 hover:shadow-lg transition" 
					   title="Click para ver en tamaño completo" />
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
					showModal('❌', 'Error', 'No se pudo eliminar el producto')
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
				<td colspan="10" class="text-center py-6 text-gray-500 font-semibold">No hay productos para mostrar</td>
			</tr>`
			paginaActualSpan.textContent = `Página ${pagina} de ${totalPaginas}`
			prevPageBtn.style.display = pagina > 1 ? 'inline-block' : 'none'
			nextPageBtn.style.display =
				pagina < totalPaginas ? 'inline-block' : 'none'
			return
		}

		listaOrdenada.forEach((p) => {
			const tr = document.createElement('tr')
			tr.className = 'hover:bg-gray-50'

			tr.innerHTML = `
        <td class="py-3 px-4 text-sm font-bold text-gray-800">${p.NroParte}</td>
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
					p.nombreImagen,
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
				btnUpdate.addEventListener('click', async () => {
					await loadView('actualizar_producto.html')
					initUpdateProducto(p.id)
				})
			}

			const thumbImg = document.getElementById(`thumb_${p.id}`)
			if (thumbImg && p.nombreImagen) {
				thumbImg.addEventListener('click', () => {
					showImageModal(p.nombreImagen)
				})
			}

			const btnDelete = document.getElementById(`btn_del_${p.id}`)
			if (btnDelete) {
				btnDelete.addEventListener('click', async () => {
					selectedDeleteId = p.id
					showModal(
						'⚠️',
						'Confirmar eliminación',
						'¿Deseas eliminar este producto?',
						{
							confirm: true,
						}
					)
				})
			}
		})

		// Actualizar número de página
		paginaActualSpan.textContent = `Página ${pagina} de ${totalPaginas}`

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
