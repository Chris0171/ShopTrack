// Utilidades monetarias compartidas (aritmética en céntimos para evitar errores de coma flotante)

const toCents = (value) => Math.round(Number(value) * 100)
const fromCents = (cents) => cents / 100

// Valida un importe monetario opcional (Labor / descuento). Vacío o null => 0.
function parseMonto(value, nombre = 'Importe') {
	if (value === undefined || value === null || value === '') {
		return { ok: true, value: 0 }
	}
	if (typeof value === 'string' && value.trim() === '') {
		return { ok: true, value: 0 }
	}
	if (typeof value === 'boolean') {
		return { ok: false, error: `${nombre} no es un importe válido.` }
	}
	const num = typeof value === 'number' ? value : Number(String(value).trim())
	if (!Number.isFinite(num)) {
		return { ok: false, error: `${nombre} no es un importe válido.` }
	}
	if (num < 0) {
		return { ok: false, error: `${nombre} no puede ser negativo.` }
	}
	return { ok: true, value: fromCents(toCents(num)) }
}

// Tax = redondear((Subtotal + Labor) × tasa, 2). `tasa` es una fracción (0.1 = 10 %).
// La tasa se pasa a millonésimas enteras para que los medios céntimos redondeen sin ruido binario.
function calcularImpuesto(subtotal, labor, tasa) {
	const baseCents = toCents(subtotal) + toCents(labor)
	return fromCents(Math.round((baseCents * Math.round(tasa * 1e6)) / 1e6))
}

// Total = Subtotal + Impuestos + Labor - Descuento
function calcularTotal({ subtotal = 0, impuestos = 0, labor = 0, descuento = 0 }) {
	return fromCents(
		toCents(subtotal) + toCents(impuestos) + toCents(labor) - toCents(descuento),
	)
}

module.exports = { toCents, fromCents, parseMonto, calcularImpuesto, calcularTotal }
