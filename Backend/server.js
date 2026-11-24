const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const nuevo = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(nuevo, "hex"));
}

async function prepararBaseDeDatos() {
  await pool.query(`
    create table if not exists users (
      id serial primary key,
      username varchar(100) unique not null,
      password_hash text not null,
      rol varchar(100) not null
    )
  `);

  await pool.query(`
    create table if not exists orders (
      id serial primary key,
      username varchar(100) not null,
      total numeric(12, 2) not null,
      created_at timestamp default now()
    )
  `);

  await pool.query(`
    create table if not exists order_items (
      id serial primary key,
      order_id integer not null references orders(id),
      product_id integer not null,
      product_name varchar(255) not null,
      price numeric(12, 2) not null,
      cantidad integer not null
    )
  `);

  const resultado = await pool.query("select count(*) from users");
  if (Number(resultado.rows[0].count) === 0) {
    const claveAdmin = process.env.ADMIN_PASSWORD || "admin123";
    await pool.query(
      "insert into users (username, password_hash, rol) values ($1, $2, $3)",
      ["admin", hashPassword(claveAdmin), "ADMINISTRADOR"]
    );
    console.log("Usuario admin creado");
  }
}

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("select 1");
    res.json({ estado: "ok" });
  } catch (error) {
    res.status(500).json({ estado: "error", mensaje: "No hay conexion con la base de datos" });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ mensaje: "Debes escribir usuario y contrasena" });
  }

  try {
    const resultado = await pool.query(
      "select username, password_hash, rol from users where username = $1",
      [username]
    );

    if (resultado.rows.length === 0 || !verifyPassword(password, resultado.rows[0].password_hash)) {
      return res.status(401).json({ mensaje: "Usuario o contrasena incorrectos" });
    }

    const usuario = resultado.rows[0];
    res.json({ username: usuario.username, rol: usuario.rol, mensaje: "Inicio de sesion correcto" });
  } catch (error) {
    res.status(500).json({ mensaje: "Error en el servidor" });
  }
});

app.post("/api/register", async (req, res) => {
  const username = (req.body.username || "").trim();
  const password = req.body.password || "";

  if (!username || !password) {
    return res.status(400).json({ mensaje: "Debes escribir usuario y contrasena" });
  }
  if (password.length < 6) {
    return res.status(400).json({ mensaje: "La contrasena debe tener al menos 6 caracteres" });
  }

  try {
    await pool.query(
      "insert into users (username, password_hash, rol) values ($1, $2, $3)",
      [username, hashPassword(password), "USUARIO"]
    );
    res.status(201).json({ mensaje: "Cuenta creada. Ya puedes iniciar sesion" });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ mensaje: "Ese usuario ya existe" });
    }
    res.status(500).json({ mensaje: "Error al crear la cuenta" });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const resultado = await pool.query("select * from products order by id");
    res.json(resultado.rows);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al consultar los productos" });
  }
});

app.post("/api/orders", async (req, res) => {
  const username = (req.body.username || "").trim();
  const items = Array.isArray(req.body.items) ? req.body.items : [];

  if (!username || items.length === 0) {
    return res.status(400).json({ mensaje: "El carrito esta vacio" });
  }

  const cliente = await pool.connect();
  try {
    await cliente.query("begin");

    const usuario = await cliente.query("select id from users where username = $1", [username]);
    if (usuario.rows.length === 0) {
      await cliente.query("rollback");
      return res.status(401).json({ mensaje: "Usuario no valido" });
    }

    let total = 0;
    const lineas = [];

    for (const item of items) {
      const cantidad = Number(item.cantidad);
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        await cliente.query("rollback");
        return res.status(400).json({ mensaje: "La cantidad de un producto no es valida" });
      }

      const resultado = await cliente.query(
        "select id, name, price, stock from products where id = $1 for update",
        [item.id]
      );
      if (resultado.rows.length === 0) {
        await cliente.query("rollback");
        return res.status(400).json({ mensaje: "Hay un producto que ya no existe" });
      }

      const producto = resultado.rows[0];
      if (Number(producto.stock) < cantidad) {
        await cliente.query("rollback");
        return res.status(400).json({ mensaje: `No hay suficiente stock de ${producto.name}` });
      }

      await cliente.query("update products set stock = stock - $1 where id = $2", [cantidad, producto.id]);

      const precio = Number(producto.price);
      total += precio * cantidad;
      lineas.push({ productId: producto.id, nombre: producto.name, precio, cantidad });
    }

    const pedido = await cliente.query(
      "insert into orders (username, total) values ($1, $2) returning id",
      [username, total]
    );
    const pedidoId = pedido.rows[0].id;

    for (const linea of lineas) {
      await cliente.query(
        "insert into order_items (order_id, product_id, product_name, price, cantidad) values ($1, $2, $3, $4, $5)",
        [pedidoId, linea.productId, linea.nombre, linea.precio, linea.cantidad]
      );
    }

    await cliente.query("commit");
    res.status(201).json({ mensaje: "Pago simulado aprobado", pedido: pedidoId, total });
  } catch (error) {
    await cliente.query("rollback");
    res.status(500).json({ mensaje: "Error al procesar el pedido" });
  } finally {
    cliente.release();
  }
});

prepararBaseDeDatos()
  .then(() => console.log("Base de datos lista"))
  .catch((error) => console.error("Error preparando la base de datos:", error));

app.listen(3000, "0.0.0.0", () => console.log("TechStore backend ejecutandose en el puerto 3000"));