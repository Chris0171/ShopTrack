<div align="center">

# 🛍️ ShopTrack

### Sistema de Gestión de Ventas e Inventario

[![Electron](https://img.shields.io/badge/Electron-39.2.1-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.1-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)](LICENSE)

_Aplicación de escritorio moderna y completa para la gestión integral de tu negocio_

[Características](#-características) • [Instalación](#-instalación) • [Uso](#-uso) • [Tecnologías](#-tecnologías) • [Contribuir](#-contribuir)

</div>

---

## 📋 Tabla de Contenidos

- [Acerca del Proyecto](#-acerca-del-proyecto)
- [Características](#-características)
- [Capturas de Pantalla](#-capturas-de-pantalla)
- [Tecnologías](#-tecnologías)
- [Instalación](#-instalación)
- [Uso](#-uso)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Configuración](#-configuración)
- [Roadmap](#-roadmap)
- [Contribuir](#-contribuir)
- [Licencia](#-licencia)
- [Contacto](#-contacto)

---

## 🎯 Acerca del Proyecto

**ShopTrack** es una aplicación de escritorio multiplataforma desarrollada con Electron que permite a pequeños y medianos negocios gestionar de manera eficiente sus ventas, inventario y clientes. Con una interfaz moderna e intuitiva, ShopTrack simplifica las operaciones diarias del comercio.

### ¿Por qué ShopTrack?

- ✅ **Sin conexión a Internet**: Funciona completamente offline
- ✅ **Multiplataforma**: Windows, macOS y Linux
- ✅ **Multiidioma**: Soporte para Español, Inglés y Portugués
- ✅ **Gratuito**: Sin costos de suscripción ni licencias
- ✅ **Rápido y ligero**: Base de datos local SQLite
- ✅ **Personalizable**: Configuración adaptable a tu negocio

---

## ✨ Características

### 📊 Dashboard Interactivo

- Visualización de métricas clave con gráficos ECharts
- Resumen de ventas diarias, semanales y mensuales
- Productos más vendidos y análisis de inventario
- Indicadores de rendimiento en tiempo real

### 🛒 Gestión de Productos

- **Crear y editar productos** con imágenes
- **Listado completo** con búsqueda y filtros
- **Control de stock** automático
- **Categorización** flexible
- **Precios y costos** detallados

### 👥 Gestión de Clientes

- Base de datos completa de clientes
- Historial de compras por cliente
- Información de contacto y preferencias
- Análisis de comportamiento de compra

### 💰 Sistema de Ventas

- **Interfaz de punto de venta** intuitiva
- **Cálculo automático** de totales y cambio
- **Gestión de métodos de pago**
- **Descuentos y promociones**
- **Impresión de tickets** y facturas

### 📜 Historial de Ventas

- Registro completo de todas las transacciones
- Búsqueda avanzada por fecha, cliente o producto
- Detalles completos de cada venta
- Exportación de reportes

### 🧾 Generación de Facturas PDF

- Facturas profesionales en formato PDF
- Personalización con logo y datos del negocio
- Generación automática con PDFKit
- Almacenamiento organizado

### 🌍 Internacionalización (i18n)

- **Español** 🇪🇸
- **Inglés** 🇺🇸
- **Portugués** 🇵🇹
- Cambio de idioma en tiempo real

### ⚙️ Configuración Flexible

- Personalización de datos del negocio
- Ajustes de facturación
- Preferencias de idioma
- Configuración de impresión

---

## 📸 Capturas de Pantalla

> **Nota**: Agrega capturas de pantalla de tu aplicación en la carpeta `assets/images/screenshots/` y descomenta las líneas siguientes.

<!--
### Dashboard
![Dashboard](assets/images/screenshots/dashboard.png)

### Gestión de Productos
![Productos](assets/images/screenshots/productos.png)

### Nueva Venta
![Nueva Venta](assets/images/screenshots/nueva-venta.png)

### Historial de Ventas
![Historial](assets/images/screenshots/historial.png)
-->

---

## 🛠️ Tecnologías

### Frontend

- **[Electron](https://www.electronjs.org/)** - Framework para aplicaciones de escritorio
- **[TailwindCSS](https://tailwindcss.com/)** - Framework CSS utility-first
- **[ECharts](https://echarts.apache.org/)** - Librería de gráficos interactivos
- **[Font Awesome](https://fontawesome.com/)** - Iconos vectoriales
- **HTML5 / CSS3 / JavaScript ES6+**

### Backend

- **[Node.js](https://nodejs.org/)** - Entorno de ejecución JavaScript
- **[SQLite3](https://www.sqlite.org/)** - Base de datos relacional ligera
- **[PDFKit](https://pdfkit.org/)** - Generación de documentos PDF
- **IPC (Inter-Process Communication)** - Comunicación entre procesos

### Herramientas de Desarrollo

- **[Standard](https://standardjs.com/)** - Linter de JavaScript
- **[Electron Builder](https://www.electron.build/)** - Empaquetado de aplicaciones

---

## 📦 Instalación

### Requisitos Previos

- **Node.js** (v18 o superior)
- **npm** (v8 o superior)
- **Git**

### Pasos de Instalación

1. **Clonar el repositorio**

   ```bash
   git clone https://github.com/tu-usuario/shoptrack.git
   cd shoptrack
   ```

2. **Instalar dependencias**

   ```bash
   npm install
   ```

3. **Compilar estilos de TailwindCSS**

   ```bash
   npm run build:css
   ```

4. **Inicializar la base de datos**

   ```bash
   node backend/db/initDatabase.js
   ```

5. **Iniciar la aplicación**
   ```bash
   npm start
   ```

### Modo Desarrollo

Para trabajar con recarga automática de estilos:

```bash
npm run dev
```

Esto iniciará el watcher de TailwindCSS que recompilará automáticamente los estilos cuando detecte cambios.

---

## 🚀 Uso

### Inicio Rápido

1. **Configuración inicial**: Al abrir la aplicación por primera vez, ve a la sección de **Configuración** para ingresar los datos de tu negocio.

2. **Agregar productos**: Navega a **Productos → Crear Producto** para empezar a cargar tu inventario.

3. **Registrar clientes**: En la sección **Clientes** puedes agregar información de tus compradores.

4. **Realizar ventas**: Utiliza **Nueva Venta** para procesar transacciones de manera rápida.

5. **Consultar reportes**: Revisa el **Dashboard** y el **Historial de Ventas** para análisis.

### Comandos NPM

| Comando             | Descripción                              |
| ------------------- | ---------------------------------------- |
| `npm start`         | Inicia la aplicación en modo producción  |
| `npm run dev`       | Inicia el watcher de CSS para desarrollo |
| `npm run build:css` | Compila los estilos de TailwindCSS       |
| `npm run watch:css` | Compila los estilos en modo watch        |

---

## 📁 Estructura del Proyecto

```
ShopTrack/
├── 📄 main.js                    # Proceso principal de Electron
├── 📄 preload.js                 # Script de preload para IPC
├── 📄 renderer.js                # Proceso de renderizado
├── 📄 index.html                 # Ventana principal
├── 📁 assets/                    # Recursos estáticos
│   ├── 📁 css/                   # Estilos
│   ├── 📁 images/                # Imágenes y logos
│   ├── 📁 js/                    # Scripts del frontend
│   │   ├── clientes.js
│   │   ├── productos.js
│   │   ├── nueva_venta.js
│   │   ├── dashboard.js
│   │   └── i18n.js               # Internacionalización
│   └── 📁 locales/               # Archivos de traducción
│       ├── es.json
│       ├── en.json
│       └── pt.json
├── 📁 backend/                   # Lógica del servidor
│   ├── 📁 controllers/           # Controladores de negocio
│   ├── 📁 db/                    # Base de datos
│   │   ├── database.sql
│   │   └── initDatabase.js
│   ├── 📁 ipcs/                  # Manejadores IPC
│   └── 📁 services/              # Servicios auxiliares
├── 📁 views/                     # Vistas HTML
│   ├── dashboard.html
│   ├── productos.html
│   ├── nueva_venta.html
│   └── ...
├── 📁 data/                      # Datos de configuración
│   └── config.json
├── 📁 facturas/                  # PDFs generados
└── 📄 package.json               # Configuración del proyecto
```

---

## ⚙️ Configuración

### Archivo de Configuración

El archivo `data/config.json` contiene la configuración global de la aplicación:

```json
{
	"business": {
		"name": "Mi Tienda",
		"address": "Calle Principal 123",
		"phone": "+1 234 567 890",
		"email": "info@mitienda.com",
		"taxId": "123456789"
	},
	"locale": "es",
	"currency": "USD",
	"dateFormat": "DD/MM/YYYY"
}
```

### Base de Datos

ShopTrack utiliza SQLite3 para almacenar toda la información. La base de datos se crea automáticamente en la primera ejecución con el esquema definido en `backend/db/database.sql`.

**Tablas principales:**

- `productos` - Inventario de productos
- `clientes` - Información de clientes
- `ventas` - Registro de transacciones
- `detalle_ventas` - Detalles de cada venta
- `facturas` - Información de facturación

---

## 🗺️ Roadmap

### Versión 1.1 (Próximamente)

- [ ] Sistema de usuarios y permisos
- [ ] Respaldo automático de la base de datos
- [ ] Modo oscuro
- [ ] Integración con lectores de código de barras

### Versión 1.2

- [ ] Reportes avanzados con gráficos personalizables
- [ ] Exportación de datos a Excel/CSV
- [ ] Sistema de notificaciones de stock bajo
- [ ] Módulo de compras y proveedores

### Versión 2.0

- [ ] Sincronización en la nube (opcional)
- [ ] App móvil complementaria
- [ ] Sistema de fidelización de clientes
- [ ] API REST para integraciones

---

## 🤝 Contribuir

Las contribuciones son lo que hacen que la comunidad de código abierto sea un lugar increíble para aprender, inspirar y crear. **Cualquier contribución que hagas será muy apreciada**.

### Cómo Contribuir

1. **Fork** el proyecto
2. Crea tu **Feature Branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. Abre un **Pull Request**

### Reportar Bugs

Si encuentras un bug, por favor abre un [issue](https://github.com/tu-usuario/shoptrack/issues) con:

- Descripción detallada del problema
- Pasos para reproducirlo
- Comportamiento esperado vs actual
- Capturas de pantalla (si aplica)
- Información del sistema operativo

### Sugerencias de Características

¿Tienes una idea para mejorar ShopTrack? Abre un [issue](https://github.com/tu-usuario/shoptrack/issues) con la etiqueta `enhancement`.

---

## 📄 Licencia

Distribuido bajo la Licencia ISC. Ver `LICENSE` para más información.

---

## 👤 Contacto

**Christian** - [@tu-usuario](https://github.com/tu-usuario)

**Link del Proyecto**: [https://github.com/tu-usuario/shoptrack](https://github.com/tu-usuario/shoptrack)

---

## 🙏 Agradecimientos

- [Electron](https://www.electronjs.org/) - Por hacer posible las aplicaciones de escritorio con web technologies
- [TailwindCSS](https://tailwindcss.com/) - Por el increíble framework CSS
- [ECharts](https://echarts.apache.org/) - Por las hermosas visualizaciones de datos
- [Font Awesome](https://fontawesome.com/) - Por los iconos profesionales
- [PDFKit](https://pdfkit.org/) - Por la generación de PDFs

---

<div align="center">

**⭐ Si te gusta este proyecto, considera darle una estrella ⭐**

Hecho con ❤️ por [Christian](https://github.com/tu-usuario)

</div>
