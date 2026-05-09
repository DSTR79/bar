let datosCierre = null;

document.addEventListener('DOMContentLoaded', () => {
  cargarCierre();
  bindEventos();
});

async function cargarCierre() {
  setLoader(true);
  try {
    datosCierre = await API.getCierre();
    renderizarCierre(datosCierre);
  } catch (err) {
    mostrarToast('Error al cargar el cierre: ' + err.message, 'error');
  } finally {
    setLoader(false);
  }
}

function renderizarCierre(data) {
  const alertas   = document.getElementById('alertasContainer');
  const acciones  = document.getElementById('cierreActions');
  const totalEl   = document.getElementById('totalDiaAmount');
  const detalleEl = document.getElementById('totalFinalDetalle');

  totalEl.textContent = parseFloat(data.totalDia).toFixed(2).replace('.', ',') + ' €';
  detalleEl.textContent = `${data.mesasPagadas.length} mesa(s) cobrada(s)`;

  alertas.innerHTML = '';

  if (!data.puedesCerrar) {
    const nombres = data.mesasAbiertas.map(m => `<em>${escHtml(m.NOMBRE_MESA)}</em>`).join(', ');
    alertas.innerHTML += `
      <div class="alert alert-warning">
        <span class="alert-icon">⚠️</span>
        <div class="alert-body">
          <h4>No puedes cerrar el día todavía</h4>
          Hay mesas sin cobrar: ${nombres}. Ciérralas antes de realizar el cierre.
        </div>
      </div>`;
  } else if (data.mesasPagadas.length > 0) {
    alertas.innerHTML += `
      <div class="alert alert-success">
        <span class="alert-icon">✅</span>
        <div class="alert-body">
          <h4>Todo listo para cerrar</h4>
          Todas las mesas están cobradas. Puedes realizar el cierre del día.
        </div>
      </div>`;
  } else {
    alertas.innerHTML += `
      <div class="alert alert-info">
        <span class="alert-icon">ℹ️</span>
        <div class="alert-body">
          <h4>Sin actividad registrada</h4>
          No hay mesas cobradas hoy. Crea mesas desde la pantalla principal.
        </div>
      </div>`;
  }

  const secPend = document.getElementById('seccionPendientes');
  const listPend = document.getElementById('listaMesasPendientes');

  if (data.mesasAbiertas.length > 0) {
    secPend.style.display = 'block';
    listPend.innerHTML = data.mesasAbiertas.map(m => `
    <div class="pendiente-item">
      <span>
        <strong>${escHtml(m.NOMBRE_MESA)}</strong>
        ${m.ABIERTO_POR ? `· 👤 ${escHtml(m.ABIERTO_POR)}` : ''}
      </span>
      <span style="color:var(--danger);font-weight:700">
        ${m.ESTADO === 'OCUPADA' ? '🔴 Ocupada' : '🟡 Disponible'}
        &nbsp;–&nbsp;${parseFloat(m.TOTAL||0).toFixed(2).replace('.',',')} €
      </span>
    </div>`
).join('');
  } else {
    secPend.style.display = 'none';
  }

  const secPag  = document.getElementById('seccionPagadas');
  const listPag = document.getElementById('listaMesasPagadas');

  if (data.mesasPagadas.length > 0) {
    secPag.style.display = 'block';

    listPag.innerHTML = data.mesasPagadas.map(mesa => {
      const lineasDeMesa = data.detalle.filter(d => d.mesa_id === mesa.MESA);
      const totalMesa    = parseFloat(mesa.TOTAL || 0).toFixed(2).replace('.', ',');
      const itemsHtml    = lineasDeMesa.map(l => `
        <div class="cierre-linea-row">
          <span>${escHtml(l.producto_nombre)} × ${parseInt(l.cantidad)}</span>
          <span style="font-weight:700">${parseFloat(l.subtotal).toFixed(2).replace('.',',')} €</span>
        </div>`
      ).join('');

      const infoExtra = mesa.ABIERTO_POR
        ? `<span class="mesa-camarero">Atendida por: ${escHtml(mesa.ABIERTO_POR)}</span>`
        : '';

      return `
    <div class="cierre-mesa-item">
      <div class="cierre-mesa-title" onclick="toggleDetalle(this)">
        <div>
          <h4>${escHtml(mesa.NOMBRE_MESA)}</h4>
          ${infoExtra}
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:12px;color:var(--text-light)">${lineasDeMesa.length} art.</span>
          <span class="cierre-mesa-total-badge">${totalMesa} €</span>
          <span style="color:var(--text-light);font-size:13px">▼</span>
        </div>
      </div>
      <div class="cierre-mesa-lineas">
        ${itemsHtml || '<div style="padding:8px 0;font-size:13px;color:var(--text-muted)">Sin artículos</div>'}
      </div>
    </div>`;
  }).join('');
  } else {
    secPag.style.display = 'none';
  }

  acciones.innerHTML = '';

  if (data.puedesCerrar && data.mesasPagadas.length > 0) {
    acciones.innerHTML += `
      <button class="btn btn-danger btn-lg" id="btnNuevoDia">
        🌅 Nuevo día (limpiar mesas)
      </button>`;
    setTimeout(() => {
      document.getElementById('btnNuevoDia')?.addEventListener('click', () => {
        abrirModal('modalNuevoDia');
      });
    }, 0);
  }

  if (data.mesasAbiertas.length > 0) {
    acciones.innerHTML += `
      <a href="index.html" class="btn btn-outline btn-lg">
        ← Ir al menú para cobrar mesas
      </a>`;
  }
}

function toggleDetalle(titleEl) {
  const lineasEl = titleEl.nextElementSibling;
  lineasEl.classList.toggle('open');
  const arrow = titleEl.querySelector('span:last-child');
  if (arrow) arrow.textContent = lineasEl.classList.contains('open') ? '▲' : '▼';
}

function bindEventos() {
  // Modal nuevo día
  document.getElementById('btnCancelarNuevoDia').addEventListener('click', () => {
    cerrarModal('modalNuevoDia');
  });

  document.getElementById('btnConfirmarNuevoDia').addEventListener('click', async () => {
    setLoader(true);
    try {
      const result = await API.nuevoDia();
      cerrarModal('modalNuevoDia');
      mostrarToast(`Nuevo día iniciado. Total registrado: ${parseFloat(result.total).toFixed(2).replace('.',',')} €`, 'success', 5000);
      setTimeout(() => window.location.href = 'index.html', 2500);
    } catch (err) {
      mostrarToast(err.message, 'error');
    } finally {
      setLoader(false);
    }
  });
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}