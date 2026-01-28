-- TABLA: Marcas
CREATE TABLE IF NOT EXISTS Marca (
id INTEGER PRIMARY KEY AUTOINCREMENT,
nombre TEXT NOT NULL UNIQUE,
activo INTEGER NOT NULL DEFAULT 1
);

-- TABLA: Producto
CREATE TABLE IF NOT EXISTS Producto (
id INTEGER PRIMARY KEY AUTOINCREMENT,
NroParte TEXT NOT NULL UNIQUE,
Descripcion TEXT NOT NULL, 
Cantidad INTEGER NOT NULL DEFAULT 0,
stockMinimo INTEGER NOT NULL DEFAULT 0,
Precio REAL NOT NULL,
Tasas REAL NOT NULL DEFAULT 0,
activo INTEGER NOT NULL DEFAULT 1,
marcaId INTEGER NOT NULL,
precioCosto REAL DEFAULT 0.00,
ubicacion TEXT,
FOREIGN KEY (marcaId) REFERENCES Marca(id)
);

-- TABLA: Números de Parte Múltiples (nuevo)
CREATE TABLE IF NOT EXISTS ProductoNumerosParte (
id INTEGER PRIMARY KEY AUTOINCREMENT,
idProducto INTEGER NOT NULL,
nroParte TEXT NOT NULL,
esPrincipal INTEGER NOT NULL DEFAULT 0,
FOREIGN KEY (idProducto) REFERENCES Producto(id) ON DELETE CASCADE,
UNIQUE(idProducto, nroParte)
);

-- TABLA: Fotos Múltiples (nuevo)
CREATE TABLE IF NOT EXISTS ProductoFotos (
id INTEGER PRIMARY KEY AUTOINCREMENT,
idProducto INTEGER NOT NULL,
nombreImagen TEXT NOT NULL,
esPrincipal INTEGER NOT NULL DEFAULT 0,
orden INTEGER NOT NULL DEFAULT 0,
FOREIGN KEY (idProducto) REFERENCES Producto(id) ON DELETE CASCADE
);

-- TABLA: Clientes
CREATE TABLE IF NOT EXISTS Clientes (
id INTEGER PRIMARY KEY AUTOINCREMENT,
nombre TEXT NOT NULL,
telefono TEXT,
email TEXT,
direccion TEXT
);

-- TABLA: Venta
CREATE TABLE IF NOT EXISTS Venta (
id INTEGER PRIMARY KEY AUTOINCREMENT,
idCliente INTEGER NOT NULL,
fecha TEXT NOT NULL DEFAULT (datetime('now')),
subtotal REAL NOT NULL,
impuestos REAL NOT NULL,
total REAL NOT NULL,
descuento REAL NOT NULL DEFAULT 0,
motivoDescuento TEXT,

FOREIGN KEY (idCliente) REFERENCES Clientes(id)
);

-- TABLA: DetalleVenta
CREATE TABLE IF NOT EXISTS DetalleVenta (
id INTEGER PRIMARY KEY AUTOINCREMENT,
idVenta INTEGER NOT NULL,
idProducto INTEGER NOT NULL,
cantidad INTEGER NOT NULL,
precioUnitario REAL NOT NULL,
tasaAplicada REAL NOT NULL,
totalLinea REAL NOT NULL,

FOREIGN KEY (idVenta) REFERENCES Venta(id) ON DELETE CASCADE,
FOREIGN KEY (idProducto) REFERENCES Producto(id)
);

-- TABLA: Factura
CREATE TABLE IF NOT EXISTS Factura (
id INTEGER PRIMARY KEY AUTOINCREMENT,
idVenta INTEGER NOT NULL,
numeroFactura TEXT UNIQUE NOT NULL,
fechaEmision TEXT NOT NULL DEFAULT (datetime('now')),
subtotal REAL NOT NULL,
impuestos REAL NOT NULL,
total REAL NOT NULL,
metodoPago TEXT NOT NULL DEFAULT 'efectivo',
observaciones TEXT,
estado TEXT NOT NULL DEFAULT 'emitida',
rutaPDF TEXT,

FOREIGN KEY (idVenta) REFERENCES Venta(id)
);


-- Insertar marcas
INSERT INTO Marca (nombre) VALUES
('Shell Rotella'),
('Mobil Delvac'),
('Delo 400'),
('Fleetguard'),
('Donaldson'),
('Grasa Mystik'),
('SKF'),
('Luber Finer'),
('Refrigerant National'),
('Mobil synthetic oil 75w-90'),
('Torque');
/*

INSERT INTO Producto (NroParte, Descripcion, Cantidad, stockMinimo, Precio, Tasas, activo, marcaId, precioCosto, ubicacion) VALUES
('P-001', 'Cables HDMI de alta velocidad', 25, 5, 12.99, 0.21, 1, 1, 7.50, 'Almacén A-01'),
('P-002', 'Ratón inalámbrico óptico', 14, 4, 8.50, 0.18, 1, 2, 5.00, 'Almacén A-02'),
('P-003', 'Teclado mecánico básico', 50, 10, 22.30, 0.21, 1, 3, 12.00, 'Almacén A-03'),
('P-004', 'Monitor LED 24 pulgadas', 8, 3, 150.00, 0.21, 1, 4, 95.00, 'Almacén A-04'),
('P-005', 'Adaptador USB a Ethernet', 12, 4, 5.99, 0.10, 1, 5, 3.50, 'Almacén B-01'),
('P-006', 'Auriculares con micrófono', 34, 6, 18.75, 0.21, 1, 6, 10.00, 'Almacén B-02'),
('P-007', 'Bolígrafos tinta gel azul (pack 10)', 60, 15, 3.40, 0.10, 1, 7, 1.80, 'Almacén B-03'),
('P-008', 'Disco SSD 512GB NVMe', 20, 5, 99.99, 0.21, 1, 8, 65.00, 'Almacén B-04'),
('P-009', 'Powerbank 20,000 mAh', 15, 5, 45.00, 0.21, 1, 9, 28.00, 'Almacén C-01'),
('P-010', 'Lápices HB (pack 20)', 100, 20, 1.20, 0.10, 1, 10, 0.60, 'Almacén C-02'),
('P-011', 'Cuaderno tapa dura A5', 40, 8, 6.75, 0.18, 1, 11, 3.80, 'Almacén C-03'),
('P-012', 'Tarjeta gráfica gama media', 10, 3, 250.00, 0.21, 1, 1, 165.00, 'Almacén C-04'),
('P-013', 'Goma de borrar escolar', 70, 12, 2.90, 0.10, 1, 2, 1.50, 'Almacén D-01'),
('P-014', 'Regla de plástico 30 cm', 90, 15, 4.50, 0.18, 1, 3, 2.20, 'Almacén D-02'),
('P-015', 'Altavoces USB estéreo', 18, 5, 13.00, 0.21, 1, 4, 7.50, 'Almacén D-03'),
('P-016', 'Memoria USB 32GB', 24, 6, 7.25, 0.18, 1, 5, 4.00, 'Almacén D-04'),
('P-017', 'Router WiFi dual band', 35, 7, 15.80, 0.21, 1, 6, 9.00, 'Almacén E-01'),
('P-018', 'Caja organizadora mediana', 27, 6, 11.40, 0.21, 1, 7, 6.50, 'Almacén E-02'),
('P-019', 'Impresora multifunción láser', 9, 2, 199.99, 0.21, 1, 8, 130.00, 'Almacén E-03'),
('P-020', 'Agenda 2025 semanal', 55, 10, 9.99, 0.18, 1, 9, 5.50, 'Almacén E-04');

-- Insertar números de parte (cada producto tiene su número principal)
INSERT INTO ProductoNumerosParte (idProducto, nroParte, esPrincipal) VALUES
(1, 'P-001', 1),
(2, 'P-002', 1),
(3, 'P-003', 1),
(4, 'P-004', 1),
(5, 'P-005', 1),
(6, 'P-006', 1),
(7, 'P-007', 1),
(8, 'P-008', 1),
(9, 'P-009', 1),
(10, 'P-010', 1),
(11, 'P-011', 1),
(12, 'P-012', 1),
(13, 'P-013', 1),
(14, 'P-014', 1),
(15, 'P-015', 1),
(16, 'P-016', 1),
(17, 'P-017', 1),
(18, 'P-018', 1),
(19, 'P-019', 1),
(20, 'P-020', 1),
-- Ejemplos de números de parte adicionales
(1, 'HDMI-CAB-001', 0),
(1, 'CABLE-HDMI-V2', 0),
(4, 'MON-LED-24-BK', 0),
(8, 'SSD-512-NVMe-M2', 0),
(12, 'GPU-MID-RANGE', 0);

-- Insertar fotos de productos (solo nombres de archivo)
INSERT INTO ProductoFotos (idProducto, nombreImagen, esPrincipal, orden) VALUES
(1, 'producto1.jpg', 1, 0),
(1, 'producto1_alt.jpg', 0, 1),
(2, 'producto2.jpg', 1, 0),
(3, 'producto3.jpg', 1, 0),
(4, 'producto4.jpg', 1, 0),
(4, 'producto4_vista2.jpg', 0, 1),
(5, 'producto5.jpg', 1, 0),
(6, 'producto6.jpg', 1, 0),
(7, 'producto7.jpg', 1, 0),
(8, 'producto8.jpg', 1, 0),
(8, 'producto8_detalle.jpg', 0, 1);


INSERT INTO Clientes (nombre, telefono, email, direccion) VALUES
('Juan Pérez', '600123456', 'juan.perez@example.com', 'Calle Sol 23'),
('María García', '622987654', 'maria.garcia@example.com', 'Av. Libertad 18'),
('Carlos López', '655897441', 'c.lopez@example.com', 'C/ Mayor 12'),
('Ana Torres', '699221345', 'ana.torres@example.com', 'Paseo del Río 77'),
('Luis Fernández', '612445789', 'l.fernandez@example.com', 'C/ Luna 5'),
('Sofía Márquez', '633998722', 'sofia.m@example.com', 'Av. Central 102'),
('Pedro Sánchez', '644112589', 'pedro.s@example.com', 'C/ Jardín 30'),
('Elena Ruiz', '677554421', 'elena.ruiz@example.com', 'C/ Olmos 4'),
('David Gómez', '690775432', 'd.gomez@example.com', 'Av. Andalucía 16'),
('Lucía Delgado', '699880432', 'lucia.delgado@example.com', 'C/ Mar 8');


INSERT INTO Venta (idCliente, fecha, subtotal, impuestos, total) VALUES
(1, datetime('now','-10 days'), 100.57, 19.25, 119.82),
(3, datetime('now','-8 days'), 175.50, 36.09, 211.59),
(5, datetime('now','-5 days'), 199.98, 42.00, 241.98),
(7, datetime('now','-3 days'), 26.50, 3.81, 30.31),
(10, datetime('now','-1 day'), 101.95, 19.91, 121.86);


-- Venta 1
INSERT INTO DetalleVenta (idVenta, idProducto, cantidad, precioUnitario, tasaAplicada, totalLinea) VALUES
(1, 1, 3, 12.99, 0.21, 47.16),
(1, 3, 2, 22.30, 0.21, 53.78),
(1, 7, 5, 3.40, 0.10, 18.70);

-- Venta 2
INSERT INTO DetalleVenta (idVenta, idProducto, cantidad, precioUnitario, tasaAplicada, totalLinea) VALUES
(2, 2, 3, 8.50, 0.18, 30.09),
(2, 4, 1, 150.00, 0.21, 181.50);

-- Venta 3
INSERT INTO DetalleVenta (idVenta, idProducto, cantidad, precioUnitario, tasaAplicada, totalLinea) VALUES
(3, 8, 2, 99.99, 0.21, 241.98);

-- Venta 4
INSERT INTO DetalleVenta (idVenta, idProducto, cantidad, precioUnitario, tasaAplicada, totalLinea) VALUES
(4, 10, 10, 1.20, 0.10, 13.20),
(4, 16, 2, 7.25, 0.18, 17.11);

-- Venta 5
INSERT INTO DetalleVenta (idVenta, idProducto, cantidad, precioUnitario, tasaAplicada, totalLinea) VALUES
(5, 15, 4, 13.00, 0.21, 62.92),
(5, 20, 5, 9.99, 0.18, 58.89);


INSERT INTO Factura (idVenta, numeroFactura, subtotal, impuestos, total, metodoPago, observaciones, estado)
VALUES
(1, 'F-0001', 100.57, 19.25, 119.82, 'tarjeta', 'Pago completado sin incidencias', 'emitida'),
(2, 'F-0002', 175.50, 36.09, 211.59, 'efectivo', NULL, 'emitida'),
(3, 'F-0003', 199.98, 42.00, 241.98, 'transferencia', 'Cliente habitual', 'emitita'),
(4, 'F-0004', 26.50, 3.81, 30.31, 'tarjeta', NULL, 'emitida'),
(5, 'F-0005', 101.95, 19.91, 121.86, 'efectivo', 'Entregado con embalaje especial', 'emitida');

*/