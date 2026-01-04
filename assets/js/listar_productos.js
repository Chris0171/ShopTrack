import { initUpdateProducto } from './actualizar_producto.js'
import { loadView } from '../../renderer.js'

export function initProductList() {
	// Constantes de configuración
	const CONFIG = {
		MODAL_TIMEOUT: 100,
		FADE_DURATION: 150,
		FADE_IN_DELAY: 20,
	}

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
	let currentLoadId = 0 // Control de race conditions
	let modalTimeout = null // Control de timeout del modal
	let isLoading = false // Control de estado de carga
	let currentCarouselImages = [] // Array de fotos del producto actual para carousel
	let currentCarouselIndex = 0 // Índice actual en el carousel

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
		// Si es < 1, convertir de decimal a porcentaje (0.0825 -> 8.25%)
		const percentage = safeNum < 1 ? safeNum * 100 : safeNum
		return `${percentage.toFixed(2)}%`
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

		// Mostrar solo la foto principal
		const fotoPrincipal = fotosOrdenadas[0]
		const tieneMasFotos = fotosOrdenadas.length > 1

		return `
		<div class="flex items-center justify-center relative group">
			<img data-product-id="${id}" 
					 data-foto-name="${fotoPrincipal.nombreImagen}" 
					 src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" 
					 alt="${fotoPrincipal.nombreImagen}" 
					 class="product-thumb w-12 h-12 object-cover rounded-lg border-2 border-indigo-500 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200" 
					 title="★ ${t('products.list.zoomImage')}" />
			${
				tieneMasFotos
					? `<span class="absolute -top-1 -right-1 bg-indigo-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">${fotosOrdenadas.length}</span>`
					: ''
			}
		</div>
	`
	}

	// Función auxiliar para cargar las rutas de las imágenes después del render
	async function cargarRutasImagenes(fotos, loadId) {
		for (const foto of fotos) {
			// Cancelar si hay una nueva carga en progreso
			if (currentLoadId !== loadId) return

			try {
				const result = await window.api.producto.getImagenPath(
					foto.nombreImagen
				)

				// Verificar nuevamente después del await
				if (currentLoadId !== loadId) return

				const imgs = document.querySelectorAll(
					`img[data-foto-name="${foto.nombreImagen}"]`
				)

				if (result.ok && result.exists) {
					imgs.forEach((img) => {
						img.src = result.path
					})
				} else {
					// Imagen no encontrada, mostrar placeholder de error
					imgs.forEach((img) => {
						img.classList.add('opacity-50')
						img.title = 'Imagen no disponible'
					})
				}
			} catch (error) {
				console.error(
					'Error cargando ruta de imagen:',
					foto.nombreImagen,
					error
				)
			}
		}
	}

	function sortProductos(lista) {
		if (!sortField) return lista
		const arr = [...lista]
		arr.sort((a, b) => {
			let A = a[sortField]
			let B = b[sortField]

			// Casos especiales para campos complejos
			if (sortField === 'numerosParte') {
				// Ordenar por el número de parte principal
				A =
					a.numerosParte?.find((n) => n.esPrincipal === 1)?.nroParte ||
					a.NroParte ||
					''
				B =
					b.numerosParte?.find((n) => n.esPrincipal === 1)?.nroParte ||
					b.NroParte ||
					''
			} else if (sortField === 'fotos') {
				// Ordenar por cantidad de fotos
				A = a.fotos?.length || 0
				B = b.fotos?.length || 0
			}

			// Ordenamiento numérico si ambos son números
			if (typeof A === 'number' && typeof B === 'number') {
				return sortAsc ? A - B : B - A
			}

			// Ordenamiento de strings
			const strA = A !== undefined && A !== null ? String(A) : ''
			const strB = B !== undefined && B !== null ? String(B) : ''
			return sortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA)
		})
		return arr
	}

	function actualizarIndicadoresOrden() {
		// Remover todos los indicadores previos
		document.querySelectorAll('th.sortable').forEach((th) => {
			th.classList.remove('sorted-asc', 'sorted-desc')
			// Remover flechas previas
			const textContent = th.textContent.replace(/[\u25b2\u25bc]/g, '').trim()
			th.textContent = textContent
		})

		// Agregar indicador a la columna actual
		if (sortField) {
			const currentTh = document.querySelector(
				`th.sortable[data-field="${sortField}"]`
			)
			if (currentTh) {
				currentTh.classList.add(sortAsc ? 'sorted-asc' : 'sorted-desc')
				const arrow = sortAsc ? ' \u25b2' : ' \u25bc'
				currentTh.textContent += arrow
			}
		}
	}

	function showModal(icon, title, message, opts = { confirm: false }) {
		// Cancelar timeout pendiente para prevenir race conditions
		if (modalTimeout) {
			clearTimeout(modalTimeout)
			modalTimeout = null
		}

		const yaVisible = appModal.style.display === 'flex'

		// Ocultar completamente
		appModal.style.display = 'none'
		appModal.style.opacity = '0'

		modalTimeout = setTimeout(
			() => {
				document.getElementById('modalIcon').textContent = icon
				document.getElementById('modalTitle').textContent = title
				document.getElementById('modalMessage').textContent = message

				btnModalCancel.style.display = opts.confirm ? 'inline-block' : 'none'

				appModal.style.display = 'flex'
				appModal.style.transition = 'opacity 0.2s ease'

				setTimeout(() => {
					appModal.style.opacity = '1'
				}, CONFIG.FADE_IN_DELAY)

				modalTimeout = null
			},
			yaVisible ? CONFIG.MODAL_TIMEOUT : CONFIG.FADE_IN_DELAY
		)
	}

	function hideModal() {
		appModal.style.opacity = '0'
		setTimeout(() => {
			appModal.style.display = 'none'
			selectedDeleteId = null
		}, CONFIG.FADE_DURATION)
	}

	function showImageModal(nombreImagen, todasLasFotos = []) {
		// Guardar las fotos del producto para el carousel
		currentCarouselImages = todasLasFotos
		// Encontrar el índice de la imagen seleccionada
		currentCarouselIndex = todasLasFotos.findIndex(
			(f) => f.nombreImagen === nombreImagen
		)
		if (currentCarouselIndex === -1) currentCarouselIndex = 0

		// Mostrar modal inmediatamente
		imageModal.style.display = 'flex'
		imageModal.style.opacity = '1'

		// Cargar la imagen seleccionada
		cargarImagenCarousel(currentCarouselIndex)
	}

	function cargarImagenCarousel(index) {
		if (!currentCarouselImages || currentCarouselImages.length === 0) return

		// Asegurar que el índice esté en rango
		index =
			((index % currentCarouselImages.length) + currentCarouselImages.length) %
			currentCarouselImages.length
		currentCarouselIndex = index

		const foto = currentCarouselImages[index]
		const totalFotos = currentCarouselImages.length

		// Mostrar placeholder de carga
		modalImage.src =
			'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
		modalImage.style.opacity = '0.5'

		// Actualizar contador
		const contador = document.getElementById('imageCounter')
		if (contador) {
			contador.textContent = `${index + 1} / ${totalFotos}`
		}

		// Mostrar/ocultar botones de navegación
		const btnPrev = document.getElementById('prevImageBtn')
		const btnNext = document.getElementById('nextImageBtn')
		if (btnPrev && btnNext) {
			btnPrev.style.display = totalFotos > 1 ? 'flex' : 'none'
			btnNext.style.display = totalFotos > 1 ? 'flex' : 'none'
		}

		// Cargar imagen desde IPC
		window.api.producto
			.getImagenPath(foto.nombreImagen)
			.then((result) => {
				if (result.ok && result.exists) {
					modalImage.src = result.path
					modalImage.style.opacity = '1'
					modalImage.onload = () => {
						modalImage.style.opacity = '1'
					}
				} else {
					imageModal.style.display = 'none'
					showModal(
						'❌',
						'Imagen no disponible',
						'No se pudo cargar la imagen solicitada.'
					)
				}
			})
			.catch((error) => {
				console.error('Error al cargar imagen en modal:', error)
				imageModal.style.display = 'none'
				showModal('❌', 'Error', 'Error al cargar la imagen.')
			})
	}

	function navegarCarousel(direccion) {
		const nuevoIndex = currentCarouselIndex + direccion
		cargarImagenCarousel(nuevoIndex)
	}
	function hideImageModal() {
		imageModal.style.opacity = '0'
		setTimeout(() => {
			imageModal.style.display = 'none'
			modalImage.src = ''
			modalImage.style.opacity = '1'
			// Asegurar que el modal esté listo para la próxima apertura
			imageModal.style.opacity = '1'
			currentCarouselImages = []
			currentCarouselIndex = 0
		}, CONFIG.FADE_DURATION)
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
					console.error('Error al eliminar producto:', selectedDeleteId, err)
					const mensaje = err.message || t('products.list.deleteError')
					showModal('❌', 'Error', mensaje)
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

	// Botones de navegación del carousel
	const prevImageBtn = document.getElementById('prevImageBtn')
	const nextImageBtn = document.getElementById('nextImageBtn')

	if (prevImageBtn) {
		prevImageBtn.addEventListener('click', (e) => {
			e.stopPropagation()
			navegarCarousel(-1)
		})
	}

	if (nextImageBtn) {
		nextImageBtn.addEventListener('click', (e) => {
			e.stopPropagation()
			navegarCarousel(1)
		})
	}

	// Agregar transición suave al modal de imagen
	imageModal.style.transition = 'opacity 0.2s ease'
	modalImage.style.transition = 'opacity 0.3s ease'

	// Atajos de teclado
	document.addEventListener('keydown', (e) => {
		// ESC para cerrar modales
		if (e.key === 'Escape') {
			if (imageModal.style.display === 'flex') {
				hideImageModal()
			} else if (appModal.style.display === 'flex') {
				// Solo cerrar si no es modal de confirmación
				if (btnModalCancel.style.display === 'none') {
					hideModal()
				}
			}
		}

		// Flechas para navegar en el carousel
		if (imageModal.style.display === 'flex') {
			if (e.key === 'ArrowLeft') {
				e.preventDefault()
				navegarCarousel(-1)
			} else if (e.key === 'ArrowRight') {
				e.preventDefault()
				navegarCarousel(1)
			}
		}

		// Enter para buscar en filtros
		if (
			e.key === 'Enter' &&
			(document.activeElement === filtroNroParte ||
				document.activeElement === filtroDescripcion)
		) {
			pagina = 1
			cargarProductos()
		}
	})

	async function cargarProductos() {
		// Prevenir múltiples cargas simultáneas
		if (isLoading) return
		isLoading = true
		currentLoadId++
		const thisLoadId = currentLoadId

		// Mostrar indicador de carga
		tablaBody.innerHTML = `
			<tr>
				<td colspan="10" class="text-center py-8">
					<div class="animate-spin inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
					<p class="mt-2 text-gray-600 font-semibold">${
						t('products.list.loading') || 'Cargando productos...'
					}</p>
				</td>
			</tr>
		`

		try {
			const filtros = {
				NroParte: filtroNroParte.value.trim(),
				Descripcion: filtroDescripcion.value.trim(),
				pagina,
				limite,
			}

			// Llamada a IPC preload
			const result = await window.api.producto.getPaginated(filtros)

			// Verificar si esta carga sigue siendo relevante
			if (currentLoadId !== thisLoadId) return

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
				// Guardar fotos en data attribute para el carousel
				if (p.fotos && p.fotos.length > 0) {
					tr.dataset.fotos = JSON.stringify(p.fotos)
				}

				// Obtener número de parte principal
				const nroPartePrincipal =
					p.numerosParte?.find((n) => n.esPrincipal === 1)?.nroParte ||
					p.NroParte
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
					}" class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-lg text-sm font-semibold shadow">${t(
					'common.edit'
				)}</button>
          <button id="btn_del_${
						p.id
					}" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm font-semibold shadow">${t(
					'common.delete'
				)}</button>
        </td>
      `

				tablaBody.appendChild(tr)

				// Cargar rutas de imágenes después de agregar al DOM
				if (p.fotos && p.fotos.length > 0) {
					cargarRutasImagenes(p.fotos, thisLoadId)
				}
			})

			// Actualizar número de página
			paginaActualSpan.textContent = formatPageLabel(pagina, totalPaginas)
			nextPageBtn.style.display =
				pagina < totalPaginas ? 'inline-block' : 'none'
			prevPageBtn.style.display = pagina > 1 ? 'inline-block' : 'none'

			// Actualizar indicadores de ordenamiento
			actualizarIndicadoresOrden()
		} catch (error) {
			console.error('Error al cargar productos:', error)
			tablaBody.innerHTML = `
				<tr>
					<td colspan="10" class="text-center py-8 text-red-600">
						<div class="text-4xl mb-2">❌</div>
						<p class="font-semibold">${
							t('products.list.loadError') || 'Error al cargar productos'
						}</p>
						<p class="text-sm text-gray-600 mt-1">${
							error.message || 'Intenta nuevamente'
						}</p>
					</td>
				</tr>
			`
		} finally {
			isLoading = false
		}
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

			// Agregar estilo de cursor pointer y transición si no existe
			th.style.cursor = 'pointer'
			th.style.userSelect = 'none'

			cargarProductos()
		})

		// Agregar estilos iniciales para indicar que es ordenable
		th.style.cursor = 'pointer'
		th.style.userSelect = 'none'
		th.title = th.title || 'Clic para ordenar'
	})

	// Delegación de eventos para botones e imágenes (evita memory leaks)
	tablaBody.addEventListener('click', async (e) => {
		// Manejar clic en botón actualizar
		const btnUpdate = e.target.closest('[id^="btn_upd_"]')
		if (btnUpdate) {
			const productId = parseInt(btnUpdate.id.replace('btn_upd_', ''))
			await loadView('actualizar_producto.html')
			initUpdateProducto(productId)
			return
		}

		// Manejar clic en botón eliminar
		const btnDelete = e.target.closest('[id^="btn_del_"]')
		if (btnDelete) {
			const productId = parseInt(btnDelete.id.replace('btn_del_', ''))
			selectedDeleteId = productId
			showModal(
				'⚠️',
				t('products.list.deleteConfirmTitle'),
				t('products.list.deleteConfirmMessage'),
				{ confirm: true }
			)
			return
		}

		// Manejar clic en miniatura de imagen
		const thumb = e.target.closest('.product-thumb')
		if (thumb) {
			const productId = parseInt(thumb.dataset.productId)
			const fotoName = thumb.dataset.fotoName

			if (fotoName && productId) {
				// Buscar el producto para obtener todas sus fotos
				const productoRow = thumb.closest('tr')
				if (productoRow && productoRow.dataset.fotos) {
					try {
						const fotos = JSON.parse(productoRow.dataset.fotos)
						// Ordenar fotos igual que en renderImagen
						const fotosOrdenadas = [...fotos].sort((a, b) => {
							if (a.esPrincipal !== b.esPrincipal) {
								return b.esPrincipal - a.esPrincipal
							}
							return a.orden - b.orden
						})
						showImageModal(fotoName, fotosOrdenadas)
					} catch (error) {
						console.error('Error al parsear fotos:', error)
						showImageModal(fotoName, [])
					}
				} else {
					showImageModal(fotoName, [])
				}
			}
			return
		}
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
		// Verificar si hay filtros activos
		const hayFiltros =
			filtroNroParte.value.trim() || filtroDescripcion.value.trim() || sortField

		if (hayFiltros) {
			const confirmar = confirm(
				'¿Desea limpiar todos los filtros y ordenamiento para recargar la lista completa?'
			)
			if (!confirmar) return
		}

		filtroNroParte.value = ''
		filtroDescripcion.value = ''
		sortField = null
		sortAsc = true
		pagina = 1
		actualizarIndicadoresOrden()
		cargarProductos()
	})

	// Paginación
	// Paginación
	prevPageBtn.addEventListener('click', () => {
		if (pagina > 1 && !isLoading) {
			pagina--
			cargarProductos()
		}
	})

	nextPageBtn.addEventListener('click', () => {
		if (pagina < totalPaginas && !isLoading) {
			pagina++
			cargarProductos()
		}
	})

	// Inicializar tabla
	cargarProductos()
}
