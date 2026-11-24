CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(12,2) NOT NULL,
    stock INTEGER NOT NULL
);

INSERT INTO products (name, description, price, stock)
VALUES
('Teclado mecánico', 'Teclado USB para computador', 120000, 10),
('Mouse inalámbrico', 'Mouse óptico inalámbrico', 65000, 15),
('Audífonos', 'Audífonos con micrófono', 95000, 8),
('Memoria USB 64GB', 'Almacenamiento USB 3.0', 35000, 20),
('Monitor 24 pulgadas', 'Monitor Full HD para computador', 520000, 6),
('Webcam HD', 'Cámara web para videollamadas', 110000, 12),
('Parlantes USB', 'Parlantes estéreo para PC', 75000, 10),
('Disco SSD 480GB', 'Unidad de almacenamiento SSD', 180000, 7),
('Memoria RAM 8GB', 'Memoria RAM DDR4 para PC', 135000, 9),
('Cable HDMI', 'Cable HDMI de alta definición', 30000, 25);