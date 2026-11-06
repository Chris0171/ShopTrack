const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

const ROOT = path.join(__dirname, '..')
const SERVICE = path.join(ROOT, 'backend/services/config-service')
const dirs = []
const nuevaCarpeta = () => {
	const d = fs.mkdtempSync(path.join(os.tmpdir(), 'shoptrack-cfgsvc-'))
	dirs.push(d)
	return d
}
test.after(() => dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })))

// CONFIG_PATH se calcula al cargar el módulo: cada escenario va en su propio proceso con cwd aislado
function ejecutar(dir, codigo) {
	const script = `const cs = require(${JSON.stringify(SERVICE)}); const out = (async () => { ${codigo} })(); out.then((r) => console.log('RESULT ' + JSON.stringify(r)))`
	const salida = execFileSync(process.execPath, ['-e', script], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
	return JSON.parse(salida.split('\n').find((l) => l.startsWith('RESULT ')).slice(7))
}
const rutaConfig = (dir) => path.join(dir, 'data', 'config.json')
const defaults = () => JSON.parse(execFileSync(process.execPath, ['-e', `console.log(JSON.stringify(require(${JSON.stringify(SERVICE)}).DEFAULT_CONFIG))`], { cwd: nuevaCarpeta(), encoding: 'utf8' }).trim().split('\n').pop())

test('Sin config.json: se crea con DEFAULT_CONFIG y se devuelve una copia', () => {
	const dir = nuevaCarpeta() // ni siquiera existe ./data
	const r = ejecutar(dir, `const c = cs.loadConfig(); c.nombre = 'mutado'; return { c, defecto: cs.DEFAULT_CONFIG.nombre }`)
	assert.ok(fs.existsSync(rutaConfig(dir)))
	assert.deepEqual(JSON.parse(fs.readFileSync(rutaConfig(dir), 'utf8')), defaults())
	assert.equal(r.defecto, 'Mi Empresa') // mutar la copia no altera DEFAULT_CONFIG
	assert.equal(r.c.nombre, 'mutado')
	// Segunda carga: no vuelve a escribirlo
	const antes = fs.statSync(rutaConfig(dir)).mtimeMs
	ejecutar(dir, 'return cs.loadConfig().idioma')
	assert.equal(fs.statSync(rutaConfig(dir)).mtimeMs, antes)
})

test('Configuración antigua sin zonaHoraria: se incorpora el valor por defecto sin perder preferencias', () => {
	const dir = nuevaCarpeta()
	fs.mkdirSync(path.join(dir, 'data'))
	const antigua = { idioma: 'en', idiomaFactura: 'en', nombre: 'Taller Prueba', ivaPredeterminado: 0.0825, prefijoFactura: 'INV' }
	fs.writeFileSync(rutaConfig(dir), JSON.stringify(antigua, null, 2))
	const bytes = fs.readFileSync(rutaConfig(dir))
	const c = ejecutar(dir, 'return cs.loadConfig()')
	assert.equal(c.zonaHoraria, defaults().zonaHoraria)
	assert.equal(c.terminosCondiciones, '')
	for (const [k, v] of Object.entries(antigua)) assert.equal(c[k], v, k)
	assert.ok(fs.readFileSync(rutaConfig(dir)).equals(bytes), 'el archivo existente no se reescribe al cargar')
})

test('Propiedades personalizadas y valores existentes se conservan (también tras guardar)', () => {
	const dir = nuevaCarpeta()
	fs.mkdirSync(path.join(dir, 'data'))
	fs.writeFileSync(rutaConfig(dir), JSON.stringify({ idioma: 'pt', nombre: 'Mi Taller', miAjusteExtra: { a: [1, 2] }, otro: 'x' }, null, 2))
	const c = ejecutar(dir, 'return cs.loadConfig()')
	assert.deepEqual([c.idioma, c.nombre, c.miAjusteExtra, c.otro], ['pt', 'Mi Taller', { a: [1, 2] }, 'x'])
	ejecutar(dir, "return cs.updateConfig({ telefono: '123' }) && true")
	const enDisco = JSON.parse(fs.readFileSync(rutaConfig(dir), 'utf8'))
	assert.deepEqual([enDisco.idioma, enDisco.nombre, enDisco.miAjusteExtra, enDisco.otro, enDisco.telefono], ['pt', 'Mi Taller', { a: [1, 2] }, 'x', '123'])
})

test('Una configuración válida existente nunca se sobrescribe al cargar ni al leer', () => {
	const dir = nuevaCarpeta()
	fs.mkdirSync(path.join(dir, 'data'))
	const completa = { ...defaults(), idioma: 'en', nombre: 'No tocar', ivaPredeterminado: 0.1, terminosCondiciones: 'Texto propio' }
	fs.writeFileSync(rutaConfig(dir), JSON.stringify(completa))
	const bytes = fs.readFileSync(rutaConfig(dir))
	ejecutar(dir, 'cs.loadConfig(); cs.getConfig(); cs.getConfigValue("idioma"); return cs.getTasaImpuesto()')
	assert.ok(fs.readFileSync(rutaConfig(dir)).equals(bytes))
})

test('Un config.json ilegible no se pisa: se usan los valores por defecto en memoria', () => {
	const dir = nuevaCarpeta()
	fs.mkdirSync(path.join(dir, 'data'))
	fs.writeFileSync(rutaConfig(dir), '{ esto no es json')
	const c = ejecutar(dir, 'return cs.loadConfig()')
	assert.equal(c.nombre, 'Mi Empresa')
	assert.equal(fs.readFileSync(rutaConfig(dir), 'utf8'), '{ esto no es json')
})

test('Compatibilidad: updateConfig, setConfigValue, resetConfig y getTasaImpuesto', () => {
	const dir = nuevaCarpeta()
	const r = ejecutar(dir, `
		const inicial = cs.getTasaImpuesto()
		cs.setConfigValue('ivaPredeterminado', 0.0825)
		const tras = cs.getTasaImpuesto()
		const upd = cs.updateConfig({ nombre: 'Nuevo' })
		const set = cs.getConfigValue('nombre')
		const reset = cs.resetConfig()
		return { inicial, tras, upd: upd.nombre, set, resetNombre: reset.nombre, resetIva: cs.getTasaImpuesto() }`)
	assert.deepEqual(r, { inicial: 0.21, tras: 0.0825, upd: 'Nuevo', set: 'Nuevo', resetNombre: 'Mi Empresa', resetIva: 0.21 })
	assert.deepEqual(JSON.parse(fs.readFileSync(rutaConfig(dir), 'utf8')), defaults())
	// validación existente de términos y condiciones sigue activa
	assert.throws(() => execFileSync(process.execPath, ['-e', `require(${JSON.stringify(SERVICE)}).updateConfig({ terminosCondiciones: 'x'.repeat(5001) })`], { cwd: dir, stdio: 'pipe' }))
})
