export function initConfiguracion() {
	// Referencias DOM
	const idiomaSelect = document.getElementById('idiomaSelect')
	const monedaSelect = document.getElementById('monedaSelect')
	const zonaHorariaSelect = document.getElementById('zonaHorariaSelect')
	const formatoFechaSelect = document.getElementById('formatoFechaSelect')
	const idiomaFacturaSelect = document.getElementById('idiomaFacturaSelect')

	const prefijoFactura = document.getElementById('prefijoFactura')
	const numeroInicial = document.getElementById('numeroInicial')
	const ivaPredeterminado = document.getElementById('ivaPredeterminado')
	const incluirLogo = document.getElementById('incluirLogo')

	const nombreEmpresa = document.getElementById('nombreEmpresa')
	const rfcEmpresa = document.getElementById('rfcEmpresa')
	const telefonoEmpresa = document.getElementById('telefonoEmpresa')
	const emailEmpresa = document.getElementById('emailEmpresa')
	const direccionEmpresa = document.getElementById('direccionEmpresa')

	const btnGuardar = document.getElementById('btnGuardar')
	const btnCancelar = document.getElementById('btnCancelar')
	const btnBackup = document.getElementById('btnBackup')
	const btnRestore = document.getElementById('btnRestore')
	const btnReset = document.getElementById('btnReset')

	const appModal = document.getElementById('appModal')
	const btnModalOk = document.getElementById('btn-modal-ok')
	const btnModalCancel = document.getElementById('btn-modal-cancel')

	let confirmCallback = null

	// Funciones del modal
	function showModal(icon, title, message, opts = { confirm: false }) {
		document.getElementById('modalIcon').textContent = icon
		document.getElementById('modalTitle').textContent = title
		document.getElementById('modalMessage').textContent = message

		btnModalCancel.style.display = opts.confirm ? 'inline-block' : 'none'
		appModal.style.display = 'flex'

		return new Promise((resolve) => {
			confirmCallback = resolve
		})
	}

	function hideModal() {
		appModal.style.display = 'none'
		confirmCallback = null
	}

	btnModalOk.onclick = () => {
		if (confirmCallback) confirmCallback(true)
		hideModal()
	}

	btnModalCancel.onclick = () => {
		if (confirmCallback) confirmCallback(false)
		hideModal()
	}

	appModal.addEventListener('click', (e) => {
		if (e.target === appModal) {
			if (confirmCallback) confirmCallback(false)
			hideModal()
		}
	})

	// Cargar configuración desde backend IPC o localStorage
	async function cargarConfiguracion() {
		let config = {}

		// Intentar cargar del backend primero
		if (window.api?.config?.get) {
			try {
				const res = await window.api.config.get()
				if (res.ok) {
					config = res.data
					console.log('✓ Configuración cargada del backend')
				}
			} catch (error) {
				console.warn(
					'No se pudo cargar config del backend, usando localStorage:',
					error
				)
				config = JSON.parse(localStorage.getItem('appConfig') || '{}')
			}
		} else {
			config = JSON.parse(localStorage.getItem('appConfig') || '{}')
		}

		// General
		idiomaSelect.value = config.idioma || 'es'
		monedaSelect.value = config.moneda || '$'
		zonaHorariaSelect.value = config.zonaHoraria || 'America/Mexico_City'
		formatoFechaSelect.value = config.formatoFecha || 'DD/MM/YYYY'

		// Idioma de factura (si no está definido, usar el idioma general por defecto)
		idiomaFacturaSelect.value =
			config.idiomaFactura || idiomaSelect.value || 'es'

		// Facturas
		prefijoFactura.value = config.prefijoFactura || 'FAC'
		numeroInicial.value = config.numeroInicial || 1000
		ivaPredeterminado.value = (config.ivaPredeterminado * 100).toFixed(0) || 21
		incluirLogo.checked = config.incluirLogo !== false

		// Empresa
		nombreEmpresa.value = config.nombre || ''
		rfcEmpresa.value = config.rfc || ''
		telefonoEmpresa.value = config.telefono || ''
		emailEmpresa.value = config.email || ''
		direccionEmpresa.value = config.direccion || ''
	}

	// Guardar configuración en backend e i18n
	btnGuardar.addEventListener('click', async () => {
		const config = {
			idioma: idiomaSelect.value,
			idiomaFactura: idiomaFacturaSelect.value,
			moneda: monedaSelect.value,
			zonaHoraria: zonaHorariaSelect.value,
			formatoFecha: formatoFechaSelect.value,
			prefijoFactura: prefijoFactura.value.trim(),
			numeroInicial: parseInt(numeroInicial.value) || 1000,
			ivaPredeterminado: parseFloat(ivaPredeterminado.value) / 100 || 0.21,
			incluirLogo: incluirLogo.checked,
			nombre: nombreEmpresa.value.trim(),
			rfc: rfcEmpresa.value.trim(),
			telefono: telefonoEmpresa.value.trim(),
			email: emailEmpresa.value.trim(),
			direccion: direccionEmpresa.value.trim(),
		}

		// Guardar en localStorage como fallback
		localStorage.setItem('appConfig', JSON.stringify(config))

		// Intentar guardar en backend
		if (window.api?.config?.set) {
			try {
				const res = await window.api.config.set(config)
				if (res.ok) {
					console.log('✓ Configuración guardada en backend')
				} else {
					console.error('Error al guardar en backend:', res.error)
				}
			} catch (error) {
				console.error('Error IPC al guardar config:', error)
			}
		}

		// Cambiar idioma si fue modificado
		if (config.idioma !== window.i18n.getCurrentLanguage()) {
			await window.i18n.setLanguage(config.idioma)
		}

		await showModal(
			'✅',
			window.i18n.t('config.saved'),
			window.i18n.t('config.savedMsg')
		)
	})

	// Cancelar
	btnCancelar.addEventListener('click', () => {
		cargarConfiguracion()
	})

	// Backup
	btnBackup.addEventListener('click', async () => {
		const confirmar = await showModal(
			'📦',
			window.i18n.t('config.backupTitle'),
			window.i18n.t('config.backupMsg'),
			{ confirm: true }
		)

		if (confirmar) {
			// TODO: Implementar lógica de backup
			await showModal(
				'✅',
				window.i18n.t('config.backupSuccess'),
				window.i18n.t('config.backupSuccessMsg')
			)
		}
	})

	// Restore
	btnRestore.addEventListener('click', async () => {
		const confirmar = await showModal(
			'♻️',
			window.i18n.t('config.restoreTitle'),
			window.i18n.t('config.restoreMsg'),
			{ confirm: true }
		)

		if (confirmar) {
			// TODO: Implementar lógica de restore
			await showModal(
				'✅',
				window.i18n.t('config.restoreSuccess'),
				window.i18n.t('config.restoreSuccessMsg')
			)
		}
	})

	// Reset
	btnReset.addEventListener('click', async () => {
		const confirmar = await showModal(
			'⚠️',
			window.i18n.t('config.resetTitle'),
			window.i18n.t('config.resetMsg'),
			{ confirm: true }
		)

		if (confirmar) {
			const confirmar2 = await showModal(
				'🚨',
				window.i18n.t('config.resetConfirm'),
				window.i18n.t('config.resetConfirmMsg'),
				{ confirm: true }
			)

			if (confirmar2) {
				// TODO: Implementar lógica de reset
				await showModal(
					'✅',
					window.i18n.t('config.resetSuccess'),
					window.i18n.t('config.resetSuccessMsg')
				)
			}
		}
	})

	// Cargar configuración al iniciar
	cargarConfiguracion()
}
