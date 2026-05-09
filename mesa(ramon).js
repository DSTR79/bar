let mesaId     = null;
let comandaId = null;
let productos  = [];
let lineas     = [];   
let categoriaActiva = 'Todas';
let filtroBusqueda  = '';
let lineasIniciales = [];

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  mesaId   = params.get('id');
  comandaId = params.get('comanda');

  if (!mesaId || !comandaId) {
    window.location.href = 'index.html';
    return;
  }

  bindEventos();

  setLoader(true);
  try {
    await cargarProductos();
    await cargarDetalleMesa();
  } catch (err) {
    mostrarToast('Error al cargar la mesa: ' + err.message, 'error');
    setTimeout(() => window.location.href = 'index.html', 2000);
  } finally {
    setLoader(false);
  }
});

async function cargarDetalleMesa() {
  const data = await API.getDetalleMesa(mesaId);
  document.getElementById('mesaNombre').textContent = data.mesa.NOMBRE_MESA;
  lineas = data.lineas;
  lineasIniciales = JSON.parse(JSON.stringify(data.lineas));
  renderizarPedido();
  renderizarProductos();
}

async function cargarProductos() {
  const data = await API.getProductos();
  productos = data;
  renderizarCategorias();
  renderizarProductos();
}

function renderizarCategorias() {
  const cats = ['Todas', ...new Set(productos.map(p => p.categoria))];
  const container = document.getElementById('categoriasTabs');
  container.innerHTML = cats.map(cat => `
    <div class="cat-tab ${cat === categoriaActiva ? 'active' : ''}"
         onclick="setCategoría('${escHtml(cat)}')">${escHtml(cat)}</div>
  `).join('');
}

function setCategoría(cat) {
  categoriaActiva = cat;
  document.querySelectorAll('.cat-tab').forEach(el => {
    el.classList.toggle('active', el.textContent === cat);
  });
  renderizarProductos();
}

function renderizarProductos() {
  const lista = document.getElementById('productosLista');
  if (!lista) return;
  const filtro = filtroBusqueda.toLowerCase();

  let filtrados = productos.filter(p => {
    const enCat = categoriaActiva === 'Todas' || p.categoria === categoriaActiva;
    const enBusca = !filtro || p.TEXTO_ARTICULO.toLowerCase().includes(filtro) || p.categoria.toLowerCase().includes(filtro);
    return enCat && enBusca;
  });

  if (filtrados.length === 0) {
    lista.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-light);font-size:14px">Sin resultados</div>`;
    return;
  }

  lista.innerHTML = filtrados.map(p => {
  const lineaActual = lineas.find(l => parseInt(l.producto_id) === parseInt(p.REF));
  const qty = lineaActual ? parseInt(lineaActual.cantidad) : 0;
    return `
      <div class="producto-row ${qty > 0 ? 'en-pedido' : ''}" id="prod-row-${p.REF}">
        <div class="prod-info">
          <div class="prod-nombre">${escHtml(p.TEXTO_ARTICULO)}</div>
          <div class="prod-cat">${escHtml(p.SUBFAMILIA_ART)}</div>
        </div>
        <div class="prod-precio">${parseFloat(p.PV).toFixed(2).replace('.',',')} €</div>
        <div class="qty-control">
          <button class="qty-btn minus" onclick="cambiarCantidad(${p.REF}, -1)" ${qty === 0 ? 'disabled' : ''}>−</button>
          <span class="qty-val" id="qty-${p.REF}">${qty}</span>
          <button class="qty-btn plus" onclick="cambiarCantidad(${p.REF}, 1)">+</button>
        </div>
      </div>`;
  }).join('');
}

function renderizarPedido() {
  const lista = document.getElementById('pedidoLista');

  const badge = document.getElementById('tabBadge');
  if (badge) {
    const totalItems = lineas.reduce((s, l) => s + l.cantidad, 0);
    badge.textContent = totalItems;
    badge.style.display = totalItems > 0 ? 'inline' : 'none';
  }

  if (lineas.length === 0) {
    lista.innerHTML = `
      <div class="pedido-empty">
        <div class="pedido-empty-icon">🛒</div>
        <p>Sin artículos todavía.<br/>Añade productos desde la izquierda.</p>
      </div>`;
    actualizarTotal(0);
    return;
  }

  lista.innerHTML = lineas.map(l => `
    <div class="pedido-linea" id="linea-${l.id}">
      <div class="pedido-linea-top">
        <div class="pedido-linea-qty">${parseInt(l.cantidad)}</div>
        <div class="pedido-linea-nombre">${escHtml(l.producto_nombre)}</div>
        <div class="pedido-linea-subtotal">${parseFloat(l.subtotal).toFixed(2).replace('.',',')} €</div>
        <button class="pedido-linea-del" onclick="eliminarLinea(${l.producto_id})" title="Eliminar">✕</button>
      </div>
      <div class="pedido-linea-bottom">
        <div class="estado-btns">
          <button class="estado-btn ${l.estado === 'pedido'     ? 'active pedido'     : ''}" onclick="cambiarEstado(${l.id}, 'pedido')">🟡 Pedido</button>
          <button class="estado-btn ${l.estado === 'preparando' ? 'active preparando' : ''}" onclick="cambiarEstado(${l.id}, 'preparando')">🔵 Preparando</button>
          <button class="estado-btn ${l.estado === 'servido'    ? 'active servido'    : ''}" onclick="cambiarEstado(${l.id}, 'servido')">✅ Servido</button>
        </div>
        <div class="comentario-row">
          <input
            class="comentario-input"
            type="text"
            placeholder="Comentario"
            value="${escHtml(l.comentario || '')}"
            onblur="cambiarComentario(${l.id}, this.value)"
            maxlength="255"
          />
        </div>
      </div>
    </div>`
  ).join('');

  const total = lineas.reduce((s, l) => s + parseFloat(l.subtotal), 0);
  actualizarTotal(total);
}

function actualizarTotal(total) {
  document.getElementById('pedidoTotal').innerHTML =
    `${total.toFixed(2).replace('.',',')} <span class="eur">€</span>`;
}

async function cambiarCantidad(productoId, delta) {
  const lineaActual = lineas.find(l => parseInt(l.producto_id) === parseInt(productoId));
  const cantActual  = lineaActual ? parseInt(lineaActual.cantidad) : 0;
  const nuevaCant   = Math.max(0, cantActual + delta);

  try {
    lineas = await API.actualizarLinea(mesaId, productoId, nuevaCant);
    renderizarPedido();
    actualizarFilaProducto(productoId);
  } catch (err) {
    mostrarToast('Error: ' + err.message, 'error');
  }
}

function actualizarFilaProducto(productoId) {
  const lineaActual = lineas.find(l => parseInt(l.producto_id) === parseInt(productoId));
  const qty = lineaActual ? parseInt(lineaActual.cantidad) : 0;

  const qtyEl = document.getElementById(`qty-${productoId}`);
  const rowEl = document.getElementById(`prod-row-${productoId}`);
  if (qtyEl) qtyEl.textContent = qty;
  if (rowEl) {
    rowEl.classList.toggle('en-pedido', qty > 0);
    const minusBtn = rowEl.querySelector('.qty-btn.minus');
    if (minusBtn) minusBtn.disabled = qty === 0;
  }
}

async function eliminarLinea(productoId) {
  try {
    lineas = await API.actualizarLinea(mesaId, productoId, 0);
    renderizarPedido();
    actualizarFilaProducto(productoId);
  } catch (err) {
    mostrarToast('Error: ' + err.message, 'error');
  }
}

function abrirCobrar() {
  const total = lineas.reduce((s, l) => s + parseFloat(l.subtotal), 0);
  document.getElementById('modalCobrarTotal').textContent =
    total.toFixed(2).replace('.', ',') + ' €';
  abrirModal('modalCobrar');
}

async function confirmarCobro() {
  setLoader(true);
  try {
    await API.cobrarMesa(mesaId);
    cerrarModal('modalCobrar');
    mostrarToast('¡Mesa cobrada correctamente!', 'success');
    setTimeout(() => window.location.href = 'index.html', 1200);
  } catch (err) {
    mostrarToast('Error: ' + err.message, 'error');
  } finally {
    setLoader(false);
  }
}

async function confirmarSalir() {
  setLoader(true);
  try {
    await API.guardarYSalir(mesaId, comandaId);
    cerrarModal('modalSalir');
    window.location.href = 'index.html';
  } catch (err) {
    mostrarToast('Error: ' + err.message, 'error');
    setTimeout(() => window.location.href = 'index.html', 1500);
  } finally {
    setLoader(false);
  }
}

async function confirmarSalirCancelando() {
  setLoader(true);
  try {
    await API.borrarLineasCanceladas(comandaId);

    cerrarModal('modalSalir');
    window.location.href = 'index.html';

  } catch (err) {
    mostrarToast('Error: ' + err.message, 'error');
    setTimeout(() => window.location.href = 'index.html', 1500);
  } finally {
    setLoader(false);
  }
}

  
function bindEventos() {

  const btnNuevaMesa = document.getElementById('btnNuevaMesa');
  if (btnNuevaMesa) {
    btnNuevaMesa.addEventListener('click', () => {
      abrirModal('modalCrearMesa');
    });
  }

  const btnConfirmarCrear = document.getElementById('btnConfirmarCrear');
  if (btnConfirmarCrear) {
    btnConfirmarCrear.addEventListener('click', confirmarCrearMesa);
  }

  const btnCancelarCrear = document.getElementById('btnCancelarCrear');
  if (btnCancelarCrear) {
    btnCancelarCrear.addEventListener('click', () => {
      cerrarModal('modalCrearMesa');
    });
  }

  const btnSalir = document.getElementById('btnSalir');
  if (btnSalir) {
    btnSalir.addEventListener('click', confirmarSalirCancelando);
  }

  const btnGuardar = document.getElementById('btnGuardar');
  if (btnGuardar) {
    btnGuardar.addEventListener('click', confirmarSalir);
  }

  const btnCobrar = document.getElementById('btnCobrar');
  if (btnCobrar) {
    btnCobrar.addEventListener('click', abrirCobrar);
  }

  const btnCancelarCobrar = document.getElementById('btnCancelarCobrar');
  if (btnCancelarCobrar) {
    btnCancelarCobrar.addEventListener('click', () => {
      cerrarModal('modalCobrar');
    });
  }

  const btnConfirmarCobrar = document.getElementById('btnConfirmarCobrar');
  if (btnConfirmarCobrar) {
    btnConfirmarCobrar.addEventListener('click', confirmarCobro);
  }

  const buscarProducto = document.getElementById('buscarProducto');
  if (buscarProducto) {
    buscarProducto.addEventListener('input', e => {
      filtroBusqueda = e.target.value;
      renderizarProductos();
    });
  }

}
function switchTab(tab) {
  const productosPanel = document.querySelector('.productos-panel');
  const pedidoPanel    = document.querySelector('.pedido-panel');
  const tabProductos   = document.getElementById('tabProductos');
  const tabPedido      = document.getElementById('tabPedido');

  if (tab === 'productos') {
    productosPanel.classList.remove('tab-hidden');
    pedidoPanel.classList.add('tab-hidden');
    tabProductos.classList.add('active');
    tabPedido.classList.remove('active');
  } else {
    pedidoPanel.classList.remove('tab-hidden');
    productosPanel.classList.add('tab-hidden');
    tabPedido.classList.add('active');
    tabProductos.classList.remove('active');
  }
}

async function cambiarEstado(lineaId, nuevoEstado) {
  const linea = lineas.find(l => l.id === lineaId);
  if (!linea) return;
  try {
    lineas = await API.actualizarLineaEstado(mesaId, lineaId, nuevoEstado, linea.comentario);
    renderizarPedido();
  } catch (err) {
    mostrarToast('Error: ' + err.message, 'error');
  }
}

async function cambiarComentario(lineaId, nuevoComentario) {
  const linea = lineas.find(l => l.id === lineaId);
  if (!linea) return;
  if ((linea.comentario || '') === nuevoComentario.trim()) return;
  try {
    lineas = await API.actualizarLineaEstado(mesaId, lineaId, linea.estado, nuevoComentario.trim());
    renderizarPedido();
  } catch (err) {
    mostrarToast('Error: ' + err.message, 'error');
  }
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}