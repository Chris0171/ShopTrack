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

	// Cargar configuración desde localStorage
	function cargarConfiguracion() {
		const config = JSON.parse(localStorage.getItem('appConfig') || '{}')

		// General
		idiomaSelect.value = config.idioma || 'es'
		monedaSelect.value = config.moneda || 'USD'
		zonaHorariaSelect.value = config.zonaHoraria || 'America/New_York'
		formatoFechaSelect.value = config.formatoFecha || 'DD/MM/YYYY'

		// Idioma de factura (si no está definido, usar el idioma general por defecto)
		idiomaFacturaSelect.value =
			config.idiomaFactura || idiomaSelect.value || 'es'

		// Facturas
		prefijoFactura.value = config.prefijoFactura || 'F-'
		numeroInicial.value = config.numeroInicial || 1
		ivaPredeterminado.value = config.ivaPredeterminado || 21
		incluirLogo.checked = config.incluirLogo !== false

		// Empresa
		nombreEmpresa.value = config.nombreEmpresa || ''
		rfcEmpresa.value = config.rfcEmpresa || ''
		telefonoEmpresa.value = config.telefonoEmpresa || ''
		emailEmpresa.value = config.emailEmpresa || ''
		direccionEmpresa.value = config.direccionEmpresa || ''
	}

	// Guardar configuración
	btnGuardar.addEventListener('click', async () => {
		const config = {
			idioma: idiomaSelect.value,
			idiomaFactura: idiomaFacturaSelect.value,
			moneda: monedaSelect.value,
			zonaHoraria: zonaHorariaSelect.value,
			formatoFecha: formatoFechaSelect.value,
			prefijoFactura: prefijoFactura.value.trim(),
			numeroInicial: parseInt(numeroInicial.value) || 1,
			ivaPredeterminado: parseFloat(ivaPredeterminado.value) || 21,
			incluirLogo: incluirLogo.checked,
			nombreEmpresa: nombreEmpresa.value.trim(),
			rfcEmpresa: rfcEmpresa.value.trim(),
			telefonoEmpresa: telefonoEmpresa.value.trim(),
			emailEmpresa: emailEmpresa.value.trim(),
			direccionEmpresa: direccionEmpresa.value.trim(),
		}

		localStorage.setItem('appConfig', JSON.stringify(config))
		await showModal(
			'✅',
			'Configuración Guardada',
			'La configuración se ha guardado correctamente.'
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
			'Crear Backup',
			'¿Deseas crear una copia de seguridad de la base de datos?',
			{ confirm: true }
		)

		if (confirmar) {
			// TODO: Implementar lógica de backup
			await showModal(
				'✅',
				'Backup Creado',
				'La copia de seguridad se creó exitosamente.'
			)
		}
	})

	// Restore
	btnRestore.addEventListener('click', async () => {
		const confirmar = await showModal(
			'♻️',
			'Restaurar Base de Datos',
			'¿Deseas restaurar la base de datos desde un archivo de respaldo? Esta acción sobrescribirá los datos actuales.',
			{ confirm: true }
		)

		if (confirmar) {
			// TODO: Implementar lógica de restore
			await showModal(
				'✅',
				'Base de Datos Restaurada',
				'La base de datos se restauró exitosamente.'
			)
		}
	})

	// Reset
	btnReset.addEventListener('click', async () => {
		const confirmar = await showModal(
			'⚠️',
			'¡ADVERTENCIA!',
			'Esta acción eliminará TODOS los datos de la aplicación y no se puede deshacer. ¿Estás seguro?',
			{ confirm: true }
		)

		if (confirmar) {
			const confirmar2 = await showModal(
				'🚨',
				'Confirmación Final',
				'¿Realmente deseas eliminar toda la información? Esta es tu última oportunidad para cancelar.',
				{ confirm: true }
			)

			if (confirmar2) {
				// TODO: Implementar lógica de reset
				await showModal(
					'✅',
					'Base de Datos Reiniciada',
					'La base de datos se reinició exitosamente.'
				)
			}
		}
	})

	// Cargar configuración al iniciar
	cargarConfiguracion()
}
