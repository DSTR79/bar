let mesaId          = null;
let productos       = [];
let lineas          = [];
let lineasIniciales = [];
let comandaId       = null;
let lineasAnteriores = [];
let familias        = [];
let subfamilias     = [];
let familiaActiva   = '__TODAS__';
let categoriaActiva = '__TODAS__';
let favoritos       = JSON.parse(localStorage.getItem('bar_favoritos') || '[]');

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
  const data = await API.getDetalleMesa(mesaId, comandaId);
  document.getElementById('mesaNombre').textContent = data.mesa.NOMBRE_MESA;
  
  const todas = data.lineas;
  lineas = todas.filter(l => parseInt(l.comanda_id) === parseInt(comandaId));
  lineasAnteriores = todas.filter(l => parseInt(l.comanda_id) !== parseInt(comandaId));
  
  lineasIniciales = JSON.parse(JSON.stringify(lineas));
  renderizarPedido();
  renderizarProductos();
}

async function cargarProductos() {
  const [dataProductos, dataCats] = await Promise.all([
    API.getProductos(),
    API.getCategorias()
  ]);
  productos   = dataProductos;
  familias    = dataCats.familias;
  subfamilias = dataCats.subfamilias;
  renderizarFamilias();
  renderizarProductos();
}

function renderizarFamilias() {
  const container = document.getElementById('categoriasTabs');
  const todasBtn = `
  <div class="cat-tab cat-familia ${familiaActiva === '__TODAS__' && categoriaActiva !== '__FAV__' ? 'active' : ''}"
       onclick="setFamilia('__TODAS__')">Todas</div>`;

  const favBtn = `
    <div class="cat-tab cat-familia ${categoriaActiva === '__FAV__' ? 'active' : ''}"
         onclick="setFamilia('__FAV__')">⭐ Favoritos</div>`;

  const famBtns = familias.map(f => `
    <div class="cat-tab cat-familia ${familiaActiva === f.FAMILIA && categoriaActiva !== '__FAV__' ? 'active' : ''}"
         onclick="setFamilia(${f.FAMILIA})">${escHtml(f.TEXTO_FAMILIA)}</div>
  `).join('');

  container.innerHTML = todasBtn + favBtn + famBtns;

  renderizarSubfamilias();
}

function renderizarSubfamilias() {
  let subContainer = document.getElementById('subfamiliasTabs');
  if (!subContainer) {
    subContainer = document.createElement('div');
    subContainer.id = 'subfamiliasTabs';
    subContainer.className = 'categorias-tabs subfamilias-tabs';
    document.getElementById('categoriasTabs').after(subContainer);
  }

  if (!familiaActiva || categoriaActiva === '__FAV__') {
    subContainer.style.display = 'none';
    return;
  }

  const subs = subfamilias.filter(s => s.FAMILIA_SUBF === familiaActiva);
  if (subs.length === 0) {
    subContainer.style.display = 'none';
    return;
  }

  subContainer.style.display = 'flex';
  const todasBtn = `
    <div class="cat-tab cat-sub ${categoriaActiva === '__TODAS__' ? 'active' : ''}"
         onclick="setSubfamilia('__TODAS__')">Todas</div>`;

  subContainer.innerHTML = todasBtn + subs.map(s => `
    <div class="cat-tab cat-sub ${parseInt(categoriaActiva) === s.SUBFAMILIA ? 'active' : ''}"
         onclick="setSubfamilia(${s.SUBFAMILIA})">${escHtml(s.TEXTO_SUBFAMILIA)}</div>
  `).join('');
}

function setFamilia(familiaId) {
  if (familiaId === '__FAV__') {
    categoriaActiva = '__FAV__';
    familiaActiva   = null;
  } else if (familiaId === '__TODAS__') {
    familiaActiva   = '__TODAS__';
    categoriaActiva = '__TODAS__';
  } else {
    familiaActiva   = familiaId;
    categoriaActiva = '__TODAS__';
  }
  renderizarFamilias();
  renderizarProductos();
}

function setSubfamilia(subId) {
  categoriaActiva = subId;
  renderizarSubfamilias();
  renderizarProductos();
}

function renderizarProductos() {
  const lista = document.getElementById('productosLista');
  if (!lista) return;

  let filtrados = productos.filter(p => {
    if (categoriaActiva === '__FAV__') return favoritos.includes(p.REF);

    if (categoriaActiva === '__TODAS__' && familiaActiva === '__TODAS__') return true;

    if (categoriaActiva === '__TODAS__' && familiaActiva !== null) {
      const subIds = subfamilias
        .filter(s => s.FAMILIA_SUBF === familiaActiva)
        .map(s => s.SUBFAMILIA);
      return subIds.includes(p.SUBFAMILIA_ART);
    }

    return p.SUBFAMILIA_ART === parseInt(categoriaActiva);
  });

  if (filtrados.length === 0) {
    lista.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-light);font-size:14px">Sin resultados</div>`;
    return;
  }

  lista.innerHTML = filtrados.map(p => {
    const lineaActual = lineas.find(l => parseInt(l.producto_id) === parseInt(p.REF));
    const qty         = lineaActual ? parseInt(lineaActual.cantidad) : 0;
    const esFav       = favoritos.includes(p.REF);

    return `
      <div class="producto-row ${qty > 0 ? 'en-pedido' : ''}" id="prod-row-${p.REF}">
        <div class="prod-info">
          <div class="prod-nombre">${escHtml(p.TEXTO_ARTICULO)}</div>
          <div class="prod-cat">${escHtml(p.categoria)}</div>
        </div>
        <button class="fav-btn ${esFav ? 'fav-activo' : ''}" onclick="toggleFavorito(${p.REF})" title="Favorito">★</button>
        <div class="prod-precio">${parseFloat(p.PV).toFixed(2).replace('.',',')} €</div>
        <div class="qty-control">
          <button class="qty-btn minus" onclick="cambiarCantidad(${p.REF}, -1)" ${qty === 0 ? 'disabled' : ''}>−</button>
          <span class="qty-val" id="qty-${p.REF}">${qty}</span>
          <button class="qty-btn plus" onclick="cambiarCantidad(${p.REF}, 1)">+</button>
        </div>
      </div>`;
  }).join('');
}

function toggleFavorito(ref) {
  const idx = favoritos.indexOf(ref);
  if (idx === -1) {
    favoritos.push(ref);
  } else {
    favoritos.splice(idx, 1);
  }
  localStorage.setItem('bar_favoritos', JSON.stringify(favoritos));
  renderizarProductos();
}

function renderizarPedido() {
  const lista = document.getElementById('pedidoLista');

  const badge = document.getElementById('tabBadge');
  if (badge) {
    const totalItems = lineas.reduce((s, l) => s + parseInt(l.cantidad), 0);
    badge.textContent = totalItems;
    badge.style.display = totalItems > 0 ? 'inline' : 'none';
  }

  const estadoTag = (estado) => {
    const mapa = {
      'EN CURSO': ['estado-tag-en-curso',  '🟡 En curso'],
      'LISTO':    ['estado-tag-listo',     '🔵 Listo'],
      'SERVIDO':  ['estado-tag-servido',   '✅ Servido'],
    };
    const [cls, label] = mapa[estado] || ['', estado];
    return `<span class="estado-tag ${cls}">${label}</span>`;
  };

  const renderLineaActual = (l) => `
    <div class="pedido-linea" id="linea-${l.id}">
      <div class="pedido-linea-top">
        <div class="pedido-linea-qty">${parseInt(l.cantidad)}</div>
        <div class="pedido-linea-nombre">${escHtml(l.producto_nombre)}</div>
        <div class="pedido-linea-subtotal">${parseFloat(l.subtotal).toFixed(2).replace('.',',')} €</div>
        <button class="pedido-linea-del" onclick="eliminarLinea(${l.producto_id})" title="Eliminar">✕</button>
      </div>
      <div class="pedido-linea-bottom">
        <div class="comentario-row">
          <input class="comentario-input" type="text" placeholder="Comentario"
            value="${escHtml(l.comentario || '')}"
            onblur="cambiarComentario(${l.id}, this.value)" maxlength="255"/>
        </div>
      </div>
    </div>`;

  const renderLineaAnterior = (l) => `
    <div class="pedido-linea linea-bloqueada" id="linea-${l.id}">
      <div class="pedido-linea-top">
        <div class="pedido-linea-qty">${parseInt(l.cantidad)}</div>
        <div class="pedido-linea-nombre">${escHtml(l.producto_nombre)}</div>
        <div class="pedido-linea-subtotal">${parseFloat(l.subtotal).toFixed(2).replace('.',',')} €</div>
        <div style="width:22px"></div>
      </div>
      <div class="pedido-linea-bottom">
        ${estadoTag(l.estado)}
        ${l.comentario ? `<div class="comentario-label">${escHtml(l.comentario)}</div>` : ''}
      </div>
    </div>`;

  const totalActual   = lineas.reduce((s, l) => s + parseFloat(l.subtotal), 0);
  const totalAnterior = lineasAnteriores.reduce((s, l) => s + parseFloat(l.subtotal), 0);

  lista.innerHTML = `
    <div class="pedido-tabs">
      <button class="pedido-tab active" id="ptabActual" onclick="switchPedidoTab('actual')">
        🟢 Actual <span class="pedido-tab-badge">${lineas.length}</span>
      </button>
      <button class="pedido-tab" id="ptabAnterior" onclick="switchPedidoTab('anterior')">
        📋 Anterior <span class="pedido-tab-badge">${lineasAnteriores.length}</span>
      </button>
    </div>

    <div id="pedidoActual" style="display:flex;flex-direction:column;gap:6px">
      ${lineas.length === 0
        ? '<div class="pedido-empty"><div class="pedido-empty-icon">🛒</div><p>Sin artículos todavía.</p></div>'
        : lineas.map(l => renderLineaActual(l)).join('')
      }
    </div>

    <div id="pedidoAnterior" style="display:none;flex-direction:column;gap:6px">
      ${lineasAnteriores.length === 0
        ? '<div class="pedido-empty"><div class="pedido-empty-icon">📋</div><p>No hay pedidos anteriores.</p></div>'
        : lineasAnteriores.map(l => renderLineaAnterior(l)).join('')
      }
    </div>
  `;

  actualizarTotal(totalActual + totalAnterior);
}

function switchPedidoTab(tab) {
  document.getElementById('pedidoActual').style.display   = tab === 'actual'   ? 'flex' : 'none';
  document.getElementById('pedidoAnterior').style.display = tab === 'anterior' ? 'flex' : 'none';
  document.getElementById('ptabActual').classList.toggle('active',   tab === 'actual');
  document.getElementById('ptabAnterior').classList.toggle('active', tab === 'anterior');
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
    lineas = await API.actualizarLinea(mesaId, productoId, nuevaCant, comandaId);
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
    lineas = await API.actualizarLinea(mesaId, productoId, 0, comandaId);
    renderizarPedido();
    actualizarFilaProducto(productoId);
  } catch (err) {
    mostrarToast('Error: ' + err.message, 'error');
  }
}

async function abrirCobrar() {
  setLoader(true);
  try {
    const data = await API.getLineasCobro(mesaId);
    renderizarModalCobro(data.lineas, data.total_pte, data.total);
    abrirModal('modalCobrar');
  } catch (err) {
    mostrarToast('Error: ' + err.message, 'error');
  } finally {
    setLoader(false);
  }
}

function renderizarModalCobro(lineas, totalPte, totalMesa) {
  document.getElementById('cobroTotalPte').textContent =
    parseFloat(totalPte).toFixed(2).replace('.', ',') + ' €';
  document.getElementById('cobroTotalSel').textContent = '0,00 €';
  document.getElementById('btnCobrarSeleccion').disabled = true;

  const container = document.getElementById('cobroLineas');

  const lineasCobrable = lineas.filter(l => l.estado !== 'EN CURSO');

  if (lineasCobrable.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-light)">No hay líneas pendientes de cobro</div>';
    return;
  }

  const comandas = {};
  lineasCobrable.forEach(l => {
    if (!comandas[l.comanda_id]) comandas[l.comanda_id] = [];
    comandas[l.comanda_id].push(l);
  });

  container.innerHTML = Object.entries(comandas).map(([cId, cls]) => `
    <div class="cobro-grupo">
      <div class="cobro-grupo-header" onclick="toggleGrupoCobro(${cId})">
        <span>Comanda #${cId}</span>
        <span>${cls.reduce((s, l) => s + parseFloat(l.subtotal), 0).toFixed(2).replace('.', ',')} €</span>
      </div>
      ${cls.map(l => `
        <div class="cobro-linea ${parseInt(l.seleccionado) ? 'seleccionada' : ''}"
             id="cobro-linea-${l.id}"
             onclick="toggleLineaCobro(${l.id}, ${parseFloat(l.subtotal)})">
          <input type="checkbox" id="chk-${l.id}" ${parseInt(l.seleccionado) ? 'checked' : ''}
                 onclick="event.stopPropagation(); toggleLineaCobro(${l.id}, ${parseFloat(l.subtotal)})"/>
          <div class="cobro-linea-info">
            <div class="cobro-linea-nombre">${escHtml(l.producto_nombre)}</div>
            <div class="cobro-linea-meta">${parseInt(l.cantidad)} ud. × ${parseFloat(l.precio_unitario).toFixed(2).replace('.', ',')} €</div>
          </div>
          <div class="cobro-linea-precio">${parseFloat(l.subtotal).toFixed(2).replace('.', ',')} €</div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function toggleGrupoCobro(comandaId) {
  const lineas = document.querySelectorAll(`[id^="cobro-linea-"]`);
}

function toggleLineaCobro(lineaId, subtotal) {
  const linea = document.getElementById(`cobro-linea-${lineaId}`);
  const chk   = document.getElementById(`chk-${lineaId}`);
  linea.classList.toggle('seleccionada');
  chk.checked = linea.classList.contains('seleccionada');
  actualizarTotalSeleccion();
}

function actualizarTotalSeleccion() {
  const seleccionadas = document.querySelectorAll('.cobro-linea.seleccionada');
  let total = 0;
  seleccionadas.forEach(el => {
    const precio = el.querySelector('.cobro-linea-precio').textContent;
    total += parseFloat(precio.replace(',', '.'));
  });
  document.getElementById('cobroTotalSel').textContent =
    total.toFixed(2).replace('.', ',') + ' €';
  document.getElementById('btnCobrarSeleccion').disabled = seleccionadas.length === 0;
}

async function cobrarSeleccion() {
  const seleccionadas = document.querySelectorAll('.cobro-linea.seleccionada');
  if (seleccionadas.length === 0) return;

  const ids   = Array.from(seleccionadas).map(el => parseInt(el.id.replace('cobro-linea-', '')));
  const total = parseFloat(document.getElementById('cobroTotalSel').textContent.replace(',', '.'));

  setLoader(true);
  try {
    await API.cobrarMesa(mesaId, ids, total, false);
    cerrarModal('modalCobrar');
    mostrarToast(`Cobrado ${total.toFixed(2).replace('.', ',')} €`, 'success');
  } catch (err) {
    mostrarToast('Error: ' + err.message, 'error');
  } finally {
    setLoader(false);
  }
}

async function cobrarTodo() {
  setLoader(true);
  try {
    await API.cobrarMesa(mesaId, [], 0, true);
    cerrarModal('modalCobrar');
    mostrarToast('¡Mesa cobrada completamente!', 'success');
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

async function crearNuevaMesa() {
  try {
    const data = await API.nuevaMesa();

    const mesaId = data.r_mesa;
    const comandaId = data.r_comanda;

    window.location.href =
      `mesa.html?id=${mesaId}&comanda=${comandaId}`;

  } catch (err) {
    console.error(err);
  }
}
async function confirmarSalirCancelando() {
  setLoader(true);
  try {
    await API.borrarLineasCanceladas(mesaId, comandaId);
    cerrarModal('modalSalir');
    window.location.href = 'index.html';
  } catch (err) {
    mostrarToast('Error: ' + err.message, 'error');
    setTimeout(() => window.location.href = 'index.html', 1500);
  } finally {
    setLoader(false);
  }
}

window.crearNuevaMesa = async function () {
  const nombre = document.getElementById('inputNombreMesa').value || 'Mesa sin nombre';

  try {
    const data = await API._fetch(`${API.base}api/nueva_mesa.php`, {
      method: 'POST',
      headers: API._headers(),
      body: JSON.stringify({ nombre })
    });

    const mesaId = data.r_mesa;
    const comandaId = data.r_comanda;

    window.location.href =
      `mesa.html?id=${mesaId}&comanda=${comandaId}`;

  } catch (err) {
    console.error(err);
    alert(err.message);
  }
  };
  
function bindEventos() {
  const btnSalir = document.getElementById('btnSalir');
  if (btnSalir) btnSalir.addEventListener('click', confirmarSalirCancelando);

  const btnGuardar = document.getElementById('btnGuardar');
  if (btnGuardar) btnGuardar.addEventListener('click', confirmarSalir);

  const btnCobrar = document.getElementById('btnCobrar');
  if (btnCobrar) btnCobrar.addEventListener('click', abrirCobrar);

  const btnCancelarCobrar = document.getElementById('btnCancelarCobrar');
  if (btnCancelarCobrar) btnCancelarCobrar.addEventListener('click', () => cerrarModal('modalCobrar'));

  const btnCobrarSeleccion = document.getElementById('btnCobrarSeleccion');
  if (btnCobrarSeleccion) btnCobrarSeleccion.addEventListener('click', cobrarSeleccion);

  const btnCobrarTodo = document.getElementById('btnCobrarTodo');
  if (btnCobrarTodo) btnCobrarTodo.addEventListener('click', cobrarTodo);
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