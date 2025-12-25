-- TABLA: Producto
CREATE TABLE IF NOT EXISTS Producto (
id INTEGER PRIMARY KEY AUTOINCREMENT,
NroParte TEXT NOT NULL UNIQUE,
Descripcion TEXT NOT NULL, 
Cantidad INTEGER NOT NULL DEFAULT 0,
Precio REAL NOT NULL,
Tasas REAL NOT NULL DEFAULT 0,
activo INTEGER NOT NULL DEFAULT 1   -- <---- AGREGADO PARA SOFT DELETE
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


INSERT INTO Producto (NroParte, Descripcion, Cantidad, Precio, Tasas) VALUES
('P-001', 'Cables HDMI de alta velocidad', 25, 12.99, 0.21),
('P-002', 'Ratón inalámbrico óptico', 14, 8.50, 0.18),
('P-003', 'Teclado mecánico básico', 50, 22.30, 0.21),
('P-004', 'Monitor LED 24 pulgadas', 8, 150.00, 0.21),
('P-005', 'Adaptador USB a Ethernet', 12, 5.99, 0.10),
('P-006', 'Auriculares con micrófono', 34, 18.75, 0.21),
('P-007', 'Bolígrafos tinta gel azul (pack 10)', 60, 3.40, 0.10),
('P-008', 'Disco SSD 512GB NVMe', 20, 99.99, 0.21),
('P-009', 'Powerbank 20,000 mAh', 15, 45.00, 0.21),
('P-010', 'Lápices HB (pack 20)', 100, 1.20, 0.10),
('P-011', 'Cuaderno tapa dura A5', 40, 6.75, 0.18),
('P-012', 'Tarjeta gráfica gama media', 10, 250.00, 0.21),
('P-013', 'Goma de borrar escolar', 70, 2.90, 0.10),
('P-014', 'Regla de plástico 30 cm', 90, 4.50, 0.18),
('P-015', 'Altavoces USB estéreo', 18, 13.00, 0.21),
('P-016', 'Memoria USB 32GB', 24, 7.25, 0.18),
('P-017', 'Router WiFi dual band', 35, 15.80, 0.21),
('P-018', 'Caja organizadora mediana', 27, 11.40, 0.21),
('P-019', 'Impresora multifunción láser', 9, 199.99, 0.21),
('P-020', 'Agenda 2025 semanal', 55, 9.99, 0.18);


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
(3, 'F-0003', 199.98, 42.00, 241.98, 'transferencia', 'Cliente habitual', 'emitida'),
(4, 'F-0004', 26.50, 3.81, 30.31, 'tarjeta', NULL, 'emitida'),
(5, 'F-0005', 101.95, 19.91, 121.86, 'efectivo', 'Entregado con embalaje especial', 'emitida');

-- Migración: Agregar columna rutaPDF si no existe (para bases de datos existentes)
-- Esta línea es segura ejecutar múltiples veces porque SQLite ignora si la columna ya existe
ALTER TABLE Factura ADD COLUMN rutaPDF TEXT;
