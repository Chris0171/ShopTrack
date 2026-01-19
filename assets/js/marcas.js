export function initMarcas() {
	const tablaBody = document.getElementById('tablaMarcasBody')
	const marcaNombre = document.getElementById('marcaNombre')
	const btnCrear = document.getElementById('btnCrearMarca')
	const btnLimpiar = document.getElementById('btnLimpiarMarca')

	const marcaModal = document.getElementById('marcaModal')
	const marcaEditNombre = document.getElementById('marcaEditNombre')
	const btnGuardarMarca = document.getElementById('btnGuardarMarca')
	const btnCancelarMarca = document.getElementById('btnCancelarMarca')

	const appModal = document.getElementById('appModal')
	const modalIcon = document.getElementById('modalIcon')
	const modalTitle = document.getElementById('modalTitle')
	const modalMessage = document.getElementById('modalMessage')
	const modalOk = document.getElementById('btn-modal-ok')

	let editId = null

	function showModal(icon, title, message) {
		modalIcon.textContent = icon
		modalTitle.textContent = title
		modalMessage.textContent = message
		appModal.style.display = 'flex'
	}

	function hideModal() {
		appModal.style.display = 'none'
	}

	modalOk.addEventListener('click', hideModal)
	appModal.addEventListener('click', (e) => {
		if (e.target === appModal) hideModal()
	})

	function openEditModal(nombre) {
		marcaEditNombre.value = nombre || ''
		marcaModal.style.display = 'flex'
	}

	function closeEditModal() {
		marcaModal.style.display = 'none'
		editId = null
		marcaEditNombre.value = ''
	}

	function renderEstado(activo) {
		return activo
			? `<span class="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">${window.i18n.t(
					'brands.statusActive'
			  )}</span>`
			: `<span class="px-2 py-1 rounded-full text-xs font-bold bg-gray-200 text-gray-700">${window.i18n.t(
					'brands.statusInactive'
			  )}</span>`
	}

	btnCancelarMarca.addEventListener('click', closeEditModal)
	marcaModal.addEventListener('click', (e) => {
		if (e.target === marcaModal) closeEditModal()
	})

	btnLimpiar.addEventListener('click', () => {
		marcaNombre.value = ''
	})

	btnCrear.addEventListener('click', async () => {
		const nombre = marcaNombre.value.trim()
		if (!nombre) {
			showModal(
				'⚠️',
				window.i18n.t('common.confirm'),
				window.i18n.t('brands.required')
			)
			return
		}

		const res = await window.api.marca.create({ nombre })
		if (res.ok) {
			marcaNombre.value = ''
			await cargarMarcas()
			showModal(
				'✅',
				window.i18n.t('brands.created'),
				window.i18n.t('brands.createdMsg')
			)
		} else {
			showModal('❌', window.i18n.t('common.confirm'), res.error || 'Error')
		}
	})

	btnGuardarMarca.addEventListener('click', async () => {
		const nombre = marcaEditNombre.value.trim()
		if (!editId) return
		if (!nombre) {
			showModal(
				'⚠️',
				window.i18n.t('common.confirm'),
				window.i18n.t('brands.required')
			)
			return
		}

		const res = await window.api.marca.update(editId, { nombre })
		if (res.ok) {
			closeEditModal()
			await cargarMarcas()
			showModal(
				'✅',
				window.i18n.t('brands.updated'),
				window.i18n.t('brands.updatedMsg')
			)
		} else {
			showModal('❌', window.i18n.t('common.confirm'), res.error || 'Error')
		}
	})

	async function cargarMarcas() {
		const res = await window.api.marca.getAllWithInactive()
		if (!res.ok) {
			tablaBody.innerHTML = `
			<tr>
				<td colspan="3" class="text-center py-6 text-gray-500 text-lg">❌ ${window.i18n.t(
					'brands.loadError'
				)}</td>
			</tr>`
			return
		}

		const marcas = res.marcas || []
		if (marcas.length === 0) {
			tablaBody.innerHTML = `
			<tr>
				<td colspan="3" class="text-center py-6 text-gray-500 text-lg">${window.i18n.t(
					'brands.empty'
				)}</td>
			</tr>`
			return
		}

		tablaBody.innerHTML = ''
		marcas.forEach((m) => {
			const tr = document.createElement('tr')
			tr.className = 'hover:bg-gray-50'
			const isActive = m.activo === 1 || m.activo === true
			tr.innerHTML = `
				<td class="py-3 px-4 text-sm text-gray-800">${m.nombre}</td>
				<td class="py-3 px-4 text-center">${renderEstado(isActive)}</td>
				<td class="py-3 px-4 text-center flex gap-2 justify-center">
					<button class="btn-edit bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-lg text-sm font-semibold shadow">${window.i18n.t(
						'common.edit'
					)}</button>
					${
						isActive
							? `<button class="btn-del bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm font-semibold shadow">${window.i18n.t(
									'common.delete'
							  )}</button>`
							: `<button class="btn-activate bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm font-semibold shadow">${window.i18n.t(
									'brands.activate'
							  )}</button>`
					}
				</td>
			`

			tr.querySelector('.btn-edit').addEventListener('click', () => {
				editId = m.id
				openEditModal(m.nombre)
			})

			const deleteBtn = tr.querySelector('.btn-del')
			if (deleteBtn) {
				deleteBtn.addEventListener('click', async () => {
					const confirmar = confirm(window.i18n.t('brands.deleteConfirm'))
					if (!confirmar) return
					const delRes = await window.api.marca.delete(m.id)
					if (delRes.ok) {
						await cargarMarcas()
						showModal(
							'✅',
							window.i18n.t('brands.deleted'),
							window.i18n.t('brands.deletedMsg')
						)
					} else {
						if (delRes.code === 'BRAND_IN_USE') {
							const msg = window.i18n
								.t('brands.inUseMsg')
								.replace('{count}', delRes.count || 0)
							const confirmarDesactivar = confirm(
								`${msg}\n${window.i18n.t('brands.deactivateConfirm')}`
							)
							if (!confirmarDesactivar) return
							const desRes = await window.api.marca.setActive(m.id, false)
							if (desRes.ok) {
								await cargarMarcas()
								showModal(
									'✅',
									window.i18n.t('brands.deactivated'),
									window.i18n.t('brands.deactivatedMsg')
								)
							} else {
								showModal(
									'❌',
									window.i18n.t('common.confirm'),
									desRes.error || 'Error'
								)
							}
						} else {
							showModal(
								'❌',
								window.i18n.t('common.confirm'),
								delRes.error || 'Error'
							)
						}
					}
				})
			}

			const activateBtn = tr.querySelector('.btn-activate')
			if (activateBtn) {
				activateBtn.addEventListener('click', async () => {
					const res = await window.api.marca.setActive(m.id, true)
					if (res.ok) {
						await cargarMarcas()
						showModal(
							'✅',
							window.i18n.t('brands.activated'),
							window.i18n.t('brands.activatedMsg')
						)
					} else {
						showModal(
							'❌',
							window.i18n.t('common.confirm'),
							res.error || 'Error'
						)
					}
				})
			}

			tablaBody.appendChild(tr)
		})
	}

	cargarMarcas()
}
