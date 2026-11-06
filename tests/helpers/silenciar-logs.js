// Los servicios escriben con console.log; mezclado con los eventos del ejecutor de node:test provoca fallos intermitentes ("Unable to deserialize cloned data").
// console.error y console.warn no se tocan; SHOPTRACK_TEST_LOGS=1 desactiva el silencio para depurar.
if (!process.env.SHOPTRACK_TEST_LOGS) {
	console.log = () => {}
	console.info = () => {}
}
