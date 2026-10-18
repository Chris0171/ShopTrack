// Prueba de empaquetado (lenta: genera el paquete sin instalador). Ejecutar con: npm run test:package
// Todo se hace en carpetas temporales; no se usan datos reales ni se publica nada.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync, spawn } = require('child_process')
const asar = require('@electron/asar')
const sqlite3 = require('sqlite3')

const ROOT = path.join(__dirname, '..', '..')
const pkg = require(path.join(ROOT, 'package.json'))
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shoptrack-pkg-'))
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }))

const platformFlag = process.platform === 'win32' ? '--win' : process.platform === 'darwin' ? '--mac' : '--linux'
let unpacked, asarFile, entradas

test.before(() => {
	const out = path.join(tmp, 'release')
	execFileSync(
		process.platform === 'win32' ? 'npx.cmd' : 'npx',
		['electron-builder', '--dir', platformFlag, `-c.directories.output=${out}`, '--publish', 'never'],
		{ cwd: ROOT, stdio: 'pipe', timeout: 570000 },
	)
	unpacked = fs.readdirSync(out).map((d) => path.join(out, d)).find((d) => /-unpacked$|^.*mac.*$/.test(d) && fs.statSync(d).isDirectory())
	asarFile = path.join(unpacked, 'resources', 'app.asar')
	entradas = asar.listPackage(asarFile).map((e) => e.replace(/\\/g, '/'))
})

test('El CSS compilado (dist/output.css) corresponde a la fuente actual', () => {
	const fresco = path.join(tmp, 'fresh.css')
	execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['@tailwindcss/cli', '-i', './assets/css/styles.css', '-o', fresco], { cwd: ROOT, stdio: 'pipe' })
	assert.ok(fs.readFileSync(fresco).equals(fs.readFileSync(path.join(ROOT, 'dist/output.css'))), 'ejecuta npm run build:css')
})

test('El paquete no incluye datos locales, tests ni archivos de desarrollo', () => {
	const prohibidos = [/^\/data(\/|$)/, /^\/tests(\/|$)/, /^\/portable\.txt$/, /^\/README\.md$/, /^\/tailwind\.config\.js$/, /^\/backend\/services\/test-pdf\.js$/, /\.pdf$/i, /\.db$/i, /^\/release(\/|$)/]
	for (const re of prohibidos) {
		const hallados = entradas.filter((e) => re.test(e) && !e.startsWith('/node_modules/'))
		assert.deepEqual(hallados, [], `no debería empaquetarse: ${re}`)
	}
})

test('El paquete conserva los recursos necesarios para ejecutar, facturar y abrir archivos', () => {
	const necesarios = [
		'/main.js', '/preload.js', '/renderer.js', '/index.html', '/package.json',
		'/dist/output.css', '/backend/db/database.sql', '/backend/db/initDatabase.js', '/backend/db/schema-init.js',
		'/backend/services/pdf-service.js', '/backend/services/file-opener.js', '/backend/services/backup-service.js',
		'/backend/services/money-utils.js', '/backend/ipcs/general.ipc.js',
		'/assets/locales/es.json', '/assets/locales/en.json', '/assets/locales/pt.json',
		'/assets/js/nueva_venta.js', '/assets/js/descarga_pdf.js', '/assets/css/styles.css',
		'/views/nueva_venta.html', '/views/configuracion.html', '/views/historial_ventas.html',
		'/node_modules/pdfkit/package.json', '/node_modules/electron-log/package.json',
		'/node_modules/@fortawesome/fontawesome-free/css/all.min.css',
	]
	for (const e of necesarios) assert.ok(entradas.includes(e), `falta ${e}`)
	const unpackedSqlite = path.join(unpacked, 'resources', 'app.asar.unpacked', 'node_modules', 'sqlite3')
	assert.ok(fs.existsSync(unpackedSqlite), 'sqlite3 nativo debe ir desempaquetado')
})

test('La versión empaquetada es la de package.json y la identidad de la app no cambia', () => {
	const dentro = JSON.parse(asar.extractFile(asarFile, 'package.json').toString())
	assert.equal(dentro.version, pkg.version)
	assert.equal(dentro.name, 'shoptrack')
	assert.equal(pkg.version, '1.0.5')
	assert.deepEqual(pkg.build.publish, [{ provider: 'github', owner: 'Chris0171', repo: 'ShopTrack' }])
	assert.equal(pkg.build.appId, undefined) // sin appId nuevo: se conserva la identidad de la 1.0.4
})

test('La app empaquetada arranca sin archivos de desarrollo y migra una base de la 1.0.4 (datos aislados)', { skip: process.platform !== 'linux' || !process.env.DISPLAY }, async () => {
	// Base "1.0.4" aislada en un XDG_CONFIG_HOME temporal (userData de la app instalada)
	const xdg = path.join(tmp, 'xdg')
	const userData = path.join(xdg, 'shoptrack')
	fs.mkdirSync(userData, { recursive: true })
	const sql = fs.readFileSync(path.join(ROOT, 'backend/db/database.sql'), 'utf8')
		.replace(/^labor REAL NOT NULL DEFAULT 0,\r?\n/m, '').replace(/^tasaImpuesto REAL,\r?\n/m, '')
	const legacy = new sqlite3.Database(path.join(userData, 'shoptrack.db'))
	await new Promise((res, rej) => legacy.exec(sql + "INSERT INTO Clientes (nombre) VALUES ('X'); INSERT INTO Venta (idCliente, subtotal, impuestos, total) VALUES (1, 10, 1, 11);", (e) => (e ? rej(e) : res())))
	await new Promise((res) => legacy.close(res))
	fs.writeFileSync(path.join(userData, 'config.json'), JSON.stringify({ ivaPredeterminado: 0.0825, idiomaFactura: 'en' }))
	const cwd = path.join(tmp, 'cwd') // sin portable.txt: debe usar userData
	fs.mkdirSync(cwd)

	const bin = path.join(unpacked, pkg.name)
	const salida = await new Promise((resolve) => {
		let buf = ''
		const p = spawn(bin, ['--no-sandbox'], { cwd, env: { ...process.env, XDG_CONFIG_HOME: xdg } })
		p.stdout.on('data', (d) => (buf += d))
		p.stderr.on('data', (d) => (buf += d))
		const fin = () => { p.kill('SIGKILL'); resolve(buf) }
		const iv = setInterval(() => { if (/Config enviada al renderer/.test(buf)) { clearInterval(iv); setTimeout(fin, 500) } }, 250)
		setTimeout(() => { clearInterval(iv); fin() }, 40000)
	})
	assert.ok(salida.includes(`SQLite conectado en: ${path.join(userData, 'shoptrack.db')}`), salida)
	assert.ok(salida.includes('Columna Venta.labor añadida'))
	assert.ok(salida.includes('Columna Venta.tasaImpuesto añadida'))
	assert.ok(!/Error exec SQL|UNIQUE constraint|Cannot find module|ENOENT/.test(salida), salida)
	assert.ok(salida.includes('Config enviada al renderer'))
	const db = new sqlite3.Database(path.join(userData, 'shoptrack.db'), sqlite3.OPEN_READONLY)
	const filas = await new Promise((res, rej) => db.all('SELECT total, labor, tasaImpuesto FROM Venta', (e, r) => (e ? rej(e) : res(r))))
	await new Promise((res) => db.close(res))
	assert.deepEqual(filas.map((f) => ({ ...f })), [{ total: 11, labor: 0, tasaImpuesto: null }])
})
