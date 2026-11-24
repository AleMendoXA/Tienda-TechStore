const API = "/api";

const login = document.getElementById("login");
const registro = document.getElementById("registro");
const tienda = document.getElementById("tienda");
const infoUsuario = document.getElementById("info-usuario");
const usuarioInput = document.getElementById("usuario");
const claveInput = document.getElementById("clave");
const mostrarClave = document.getElementById("mostrar-clave");
const btnLogin = document.getElementById("btn-login");
const errorLogin = document.getElementById("error-login");
const nuevoUsuarioInput = document.getElementById("nuevo-usuario");
const nuevaClaveInput = document.getElementById("nueva-clave");
const errorRegistro = document.getElementById("error-registro");
const buscador = document.getElementById("buscador");
const productosDiv = document.getElementById("productos");
const sinResultados = document.getElementById("sin-resultados");
const carritoLista = document.getElementById("carrito-lista");
const carritoVacio = document.getElementById("carrito-vacio");
const contador = document.getElementById("contador");
const totalSpan = document.getElementById("total");
const bienvenida = document.getElementById("bienvenida");
const btnPagar = document.getElementById("btn-pagar");
const mensajePago = document.getElementById("mensaje-pago");

let carrito = [];
let productos = [];
let usuarioActual = "";

function formatoPrecio(valor) {
  return "$" + Number(valor).toLocaleString("es-CO", { maximumFractionDigits: 0 });
}

function mostrarMensaje(elemento, texto, tipo) {
  elemento.textContent = texto;
  elemento.className = `mensaje ${tipo || ""}`.trim();
}

function mostrarLogin() {
  registro.classList.add("oculto");
  login.classList.remove("oculto");
  mostrarMensaje(errorLogin, "", "");
  usuarioInput.focus();
}

function mostrarRegistro() {
  login.classList.add("oculto");
  registro.classList.remove("oculto");
  mostrarMensaje(errorRegistro, "", "");
  nuevoUsuarioInput.focus();
}

async function iniciarSesion() {
  mostrarMensaje(errorLogin, "", "");
  btnLogin.disabled = true;
  btnLogin.textContent = "Entrando...";

  try {
    const respuesta = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: usuarioInput.value.trim(), password: claveInput.value })
    });
    const datos = await respuesta.json();

    if (!respuesta.ok) {
      mostrarMensaje(errorLogin, datos.mensaje || "No se pudo iniciar sesion", "error");
      return;
    }

    usuarioActual = datos.username;
    bienvenida.textContent = `Sesion: ${datos.username} (${datos.rol})`;
    infoUsuario.classList.remove("oculto");
    login.classList.add("oculto");
    tienda.classList.remove("oculto");
    cargarProductos();
  } catch (error) {
    mostrarMensaje(errorLogin, "No hay conexion con el servidor", "error");
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = "Entrar";
  }
}

async function registrarse() {
  mostrarMensaje(errorRegistro, "", "");
  try {
    const respuesta = await fetch(`${API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: nuevoUsuarioInput.value.trim(), password: nuevaClaveInput.value })
    });
    const datos = await respuesta.json();

    if (!respuesta.ok) {
      mostrarMensaje(errorRegistro, datos.mensaje || "No se pudo crear la cuenta", "error");
      return;
    }

    const usuarioCreado = nuevoUsuarioInput.value.trim();
    nuevoUsuarioInput.value = "";
    nuevaClaveInput.value = "";
    mostrarLogin();
    usuarioInput.value = usuarioCreado;
    mostrarMensaje(errorLogin, datos.mensaje, "exito");
  } catch (error) {
    mostrarMensaje(errorRegistro, "No hay conexion con el servidor", "error");
  }
}

async function cargarProductos() {
  try {
    const respuesta = await fetch(`${API}/products`);
    if (!respuesta.ok) throw new Error("No se pudieron cargar los productos");
    productos = await respuesta.json();
    mostrarProductos();
  } catch (error) {
    productosDiv.textContent = "Error al cargar los productos: " + error.message;
  }
}

function mostrarProductos() {
  const texto = buscador.value.trim().toLowerCase();
  const filtrados = productos.filter((p) =>
    p.name.toLowerCase().includes(texto) || (p.description || "").toLowerCase().includes(texto)
  );

  productosDiv.innerHTML = "";
  sinResultados.classList.toggle("oculto", filtrados.length > 0);

  filtrados.forEach((p) => {
    const stockNumero = Number(p.stock);

    const tarjeta = document.createElement("article");
    tarjeta.className = "tarjeta-producto";

    const nombre = document.createElement("h3");
    nombre.textContent = p.name;

    const descripcion = document.createElement("p");
    descripcion.className = "descripcion";
    descripcion.textContent = p.description;

    const precio = document.createElement("p");
    precio.className = "precio";
    precio.textContent = formatoPrecio(p.price);

    const stock = document.createElement("p");
    stock.className = stockNumero <= 5 ? "stock stock-bajo" : "stock";
    stock.textContent = stockNumero <= 5
      ? `Ultimas ${stockNumero} unidades`
      : `Stock disponible: ${stockNumero}`;

    const boton = document.createElement("button");
    boton.className = "boton-agregar";
    boton.textContent = "Agregar al carrito";
    boton.addEventListener("click", () => agregar(p));

    tarjeta.append(nombre, descripcion, precio, stock, boton);
    productosDiv.appendChild(tarjeta);
  });
}

function agregar(producto) {
  mostrarMensaje(mensajePago, "", "");
  const existente = carrito.find((item) => item.id === producto.id);
  if (existente) {
    existente.cantidad++;
  } else {
    carrito.push({ id: producto.id, nombre: producto.name, precio: Number(producto.price), cantidad: 1 });
  }
  mostrarCarrito();
}

function sumarUno(id) {
  const item = carrito.find((i) => i.id === id);
  if (!item) return;
  item.cantidad++;
  mostrarCarrito();
}

function quitarUno(id) {
  const item = carrito.find((i) => i.id === id);
  if (!item) return;
  item.cantidad--;
  if (item.cantidad <= 0) {
    eliminar(id);
    return;
  }
  mostrarCarrito();
}

function eliminar(id) {
  carrito = carrito.filter((item) => item.id !== id);
  mostrarCarrito();
}

function mostrarCarrito() {
  carritoLista.innerHTML = "";
  carritoVacio.classList.toggle("oculto", carrito.length > 0);

  let total = 0;
  let unidades = 0;

  carrito.forEach((item) => {
    total += item.precio * item.cantidad;
    unidades += item.cantidad;

    const li = document.createElement("li");
    li.className = "item-carrito";

    const info = document.createElement("div");
    info.className = "info-item";

    const nombre = document.createElement("strong");
    nombre.textContent = item.nombre;

    const detalle = document.createElement("span");
    detalle.className = "texto-suave";
    detalle.textContent = `${item.cantidad} x ${formatoPrecio(item.precio)} = ${formatoPrecio(item.precio * item.cantidad)}`;

    info.append(nombre, detalle);

    const controles = document.createElement("div");
    controles.className = "controles";

    const btnMenos = document.createElement("button");
    btnMenos.className = "control";
    btnMenos.textContent = "-";
    btnMenos.addEventListener("click", () => quitarUno(item.id));

    const btnMas = document.createElement("button");
    btnMas.className = "control";
    btnMas.textContent = "+";
    btnMas.addEventListener("click", () => sumarUno(item.id));

    const btnEliminar = document.createElement("button");
    btnEliminar.className = "boton-eliminar";
    btnEliminar.textContent = "Eliminar";
    btnEliminar.addEventListener("click", () => eliminar(item.id));

    controles.append(btnMenos, btnMas, btnEliminar);
    li.append(info, controles);
    carritoLista.appendChild(li);
  });

  totalSpan.textContent = formatoPrecio(total);
  contador.textContent = unidades;
  btnPagar.disabled = carrito.length === 0;
}

async function pagar() {
  if (carrito.length === 0) return;

  mostrarMensaje(mensajePago, "", "");
  btnPagar.disabled = true;
  btnPagar.textContent = "Procesando...";

  try {
    const respuesta = await fetch(`${API}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: usuarioActual,
        items: carrito.map((item) => ({ id: item.id, cantidad: item.cantidad }))
      })
    });
    const datos = await respuesta.json();

    if (!respuesta.ok) {
      mostrarMensaje(mensajePago, datos.mensaje || "No se pudo completar el pago", "error");
      return;
    }

    carrito = [];
    mostrarCarrito();
    mostrarMensaje(mensajePago, `Pago aprobado. Pedido #${datos.pedido} por ${formatoPrecio(datos.total)}`, "exito");
    cargarProductos();
  } catch (error) {
    mostrarMensaje(mensajePago, "No hay conexion con el servidor", "error");
  } finally {
    btnPagar.textContent = "Pagar";
    btnPagar.disabled = carrito.length === 0;
  }
}

function cerrarSesion() {
  carrito = [];
  usuarioActual = "";
  claveInput.value = "";
  claveInput.type = "password";
  mostrarClave.checked = false;
  mostrarCarrito();
  mostrarMensaje(mensajePago, "", "");
  tienda.classList.add("oculto");
  infoUsuario.classList.add("oculto");
  mostrarLogin();
}

document.getElementById("btn-login").addEventListener("click", iniciarSesion);
document.getElementById("btn-ir-registro").addEventListener("click", mostrarRegistro);
document.getElementById("btn-registrar").addEventListener("click", registrarse);
document.getElementById("btn-volver-login").addEventListener("click", mostrarLogin);
document.getElementById("btn-salir").addEventListener("click", cerrarSesion);
btnPagar.addEventListener("click", pagar);

usuarioInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") claveInput.focus();
});
claveInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") iniciarSesion();
});
nuevaClaveInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") registrarse();
});
mostrarClave.addEventListener("change", () => {
  claveInput.type = mostrarClave.checked ? "text" : "password";
});
buscador.addEventListener("input", mostrarProductos);

mostrarCarrito();