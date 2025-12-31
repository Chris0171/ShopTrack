# Path Service - Manejo de Rutas de la Aplicación

## Descripción

`path-service.js` es un servicio centralizado para el manejo de rutas en ShopTrack. Gestiona automáticamente las diferencias entre:

- **Modo Desarrollo**: Usa rutas relativas al proyecto
- **Modo Portable**: Usa carpeta `data/` en el directorio de la aplicación
- **Modo Instalador**: Usa `userData` de Electron (AppData en Windows)

## Detección Automática

El servicio detecta el modo de ejecución buscando un archivo `portable.txt` en el directorio raíz:

- ✅ `portable.txt` existe → **Modo Portable**
- ❌ `portable.txt` NO existe → **Modo Instalador**

## Uso

```javascript
const pathService = require('./backend/services/path-service')

// Obtener rutas base
const userDataPath = pathService.getUserDataPath()
const dbPath = pathService.getDatabasePath()
const configPath = pathService.getConfigPath()

// Rutas de imágenes de productos
const imagesDir = pathService.getProductImagesPath()
const imagePath = pathService.getProductImagePath('producto1.jpg')
// Resultado: C:\Users\...\AppData\Roaming\ShopTrack\images\productos\producto1.jpg

// Rutas de facturas PDF
const invoicesDir = pathService.getInvoicesPath()
const invoicePath = pathService.getInvoicePath('Factura_001.pdf')

// Rutas de backups
const backupsDir = pathService.getBackupsPath()

// Utilidades
pathService.fileExists(imagePath) // true/false
pathService.ensureDir('/some/path') // Crea directorio si no existe
```

## Métodos Disponibles

### Rutas Base

- `getUserDataPath()` - Directorio base de datos de usuario
- `getDatabasePath()` - Ruta completa de la base de datos SQLite
- `getConfigPath()` - Ruta del archivo config.json

### Imágenes de Productos

- `getProductImagesPath()` - Directorio de imágenes (se crea automáticamente)
- `getProductImagePath(nombreImagen)` - Ruta completa de una imagen específica

### Facturas

- `getInvoicesPath()` - Directorio de facturas (se crea automáticamente)
- `getInvoicePath(nombreFactura)` - Ruta completa de una factura específica

### Backups

- `getBackupsPath()` - Directorio de backups (se crea automáticamente)

### Utilidades

- `fileExists(filePath)` - Verifica si un archivo existe
- `ensureDir(dirPath)` - Crea un directorio si no existe
- `checkIfPortable()` - Verifica si la app está en modo portable

## Estructura de Directorios

### Modo Portable

```text
ShopTrack/
├── portable.txt          ← Marcador de modo portable
├── ShopTrack.exe
└── data/
    ├── shoptrack.db
    ├── config.json
    ├── images/
    │   └── productos/
    │       ├── producto1.jpg
    │       └── producto2.jpg
    ├── facturas/
    │   └── Factura_001.pdf
    └── backups/
```

### Modo Instalador (Windows)

```text
C:\Users\Usuario\AppData\Roaming\ShopTrack\
├── shoptrack.db
├── config.json
├── images/
│   └── productos/
│       ├── producto1.jpg
│       └── producto2.jpg
├── facturas/
│   └── Factura_001.pdf
└── backups/
```

## Integración con Base de Datos

La tabla `ProductoFotos` ahora almacena solo el **nombre del archivo** (no la ruta completa):

```sql
CREATE TABLE ProductoFotos (
    id INTEGER PRIMARY KEY,
    idProducto INTEGER,
    nombreImagen TEXT NOT NULL,  -- Solo el nombre: 'producto1.jpg'
    esPrincipal INTEGER,
    orden INTEGER
);
```

Para obtener la ruta completa:

```javascript
// En el backend
const foto = { nombreImagen: 'producto1.jpg' }
const rutaCompleta = pathService.getProductImagePath(foto.nombreImagen)

// En el frontend (necesitarás un IPC handler)
ipcRenderer.invoke('get-product-image-path', 'producto1.jpg')
```

## Beneficios

✅ **Portabilidad**: La base de datos no depende de rutas absolutas  
✅ **Flexibilidad**: Funciona en modo portable o instalado sin cambios  
✅ **Mantenibilidad**: Cambiar ubicaciones solo requiere modificar el servicio  
✅ **Seguridad**: Los directorios se crean automáticamente si no existen

## Notas para Desarrollo

- Los directorios se crean automáticamente al llamar `get*Path()`
- El servicio es un **singleton** (una sola instancia compartida)
- En desarrollo, la BD se guarda en `backend/db/database.db` por defecto
- Para producción, agrega `portable.txt` para modo portable o déjalo sin el archivo para usar userData

## Crear Versión Portable

Para distribuir ShopTrack como portable:

1. Compila la aplicación normalmente
2. Crea un archivo vacío `portable.txt` junto al ejecutable:

   ```bash
   echo. > portable.txt
   ```

3. La aplicación creará automáticamente la carpeta `data/` en su ubicación

## Crear Versión Instalador

Para distribuir ShopTrack como instalador:

1. Compila la aplicación normalmente
2. **NO incluyas** el archivo `portable.txt`
3. La aplicación usará automáticamente `AppData\Roaming\ShopTrack\`
