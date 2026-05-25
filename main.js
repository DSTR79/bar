let mesaSeleccionadaId = null; 

const MINUTOS_OCULTAR_PAGADA = 1;

document.addEventListener('DOMContentLoaded', () => {

  if (typeof cargarMesas === 'function') {
    cargarMesas();
    setInterval(cargarMesas, 8000);
  }

  if (typeof bindEventos === 'function') {
    bindEventos();
  }

  const nombreGuardado = localStorage.getItem('bar_nombre_dispositivo');
  const headerNombre = document.getElementById('headerNombreDispositivo');
  if (headerNombre) {
    headerNombre.textContent = nombreGuardado || 'Sin nombre';
  }

});


async function cargarMesas() {
  try {
    const mesas = await API.getMesas();
    renderizarMesas(mesas);
  } catch (err) {
    mostrarToast('Error al cargar las mesas: ' + err.message, 'error');
  }
}

function renderizarMesas(mesas) {
  const grid = document.getElementById('mesasGrid');

  const ahora = Date.now();
  
  const mesasVisibles = mesas.filter(mesa => {
  if (mesa.ESTADO !== 'COBRADA') return true;
  if (!mesa.fecha_cobro) return true;
  const msCobro = new Date(mesa.fecha_cobro).getTime();
  const minutosTranscurridos = (Date.now() - msCobro) / 60000;
  return minutosTranscurridos < MINUTOS_OCULTAR_PAGADA;
});

  if (mesas.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🍽️</div>
        <h3>Sin mesas activas</h3>
        <p>Pulsa <strong>Nueva Mesa</strong> para crear la primera mesa del día.</p>
      </div>`;
    return;
  }

  grid.innerHTML = mesas.map(MESAS => {
    const claseMapa = {
      'DISPONIBLE': 'disponible',
      'OCUPADA':    'bloqueada',
      'COBRADA':    'pagada',
    };
    const claseCSS = claseMapa[MESAS.ESTADO] || 'disponible';

const estadoLabel = {
  'DISPONIBLE': '🟡 Disponible',
  'OCUPADA':    '🔴 Ocupada',
  'COBRADA':    '✅ Cobrada',
}[MESAS.ESTADO] || MESAS.ESTADO;

    const infoHtml = MESAS.ESTADO === 'OCUPADA'
      ? `<div class="camarero"><span>👤</span>${escHtml(MESAS.ABIERTO_POR)}</div>`
      : MESAS.ESTADO === 'COBRADA'
        ? '<div style="color:var(--success);font-size:12px;font-weight:700">Mesa cobrada</div>'
        : '<div style="font-size:12px;color:var(--text-light)">Disponible</div>';

    const totalFormateado = parseFloat(MESAS.TOTAL || 0).toFixed(2).replace('.', ',');
    const numItems = parseInt(MESAS.NUM_ARTICULOS || MESAS.NUM_LINEAS || 0);

    return `
      <div class="mesa-card ${claseCSS}"
           data-id="${MESAS.MESA}"
           data-estado="${MESAS.ESTADO}"
           onclick="clicMesa(${MESAS.MESA}, '${MESAS.ESTADO}')">
        <div class="mesa-card-header">
          <div class="mesa-nombre">${escHtml(MESAS.NOMBRE)}</div>
          <span class="badge badge-${claseCSS}">${estadoLabel}</span>
        </div>
        <div class="mesa-info">${infoHtml}</div>
        <div class="mesa-total">
          ${totalFormateado} €
        </div>
        <div class="mesa-items">${numItems} artículos</div>
      </div>`;
  }).join('');
}

function clicMesa(mesaId, estado) {
  if (estado === 'OCUPADA') {
    mostrarToast('Esta mesa está siendo atendida ahora mismo.', 'warning');
    return;
  }
  if (estado === 'COBRADA') {
    mostrarToast('Esta mesa ya está cobrada.', 'info');
    return;
  }
  mesaSeleccionadaId = mesaId;
  confirmarEntrarMesa();
}

function bindEventos() {
 document.getElementById('btnNuevaMesa').addEventListener('click', () => {
    document.getElementById('inputNombreMesa').value = '';
    abrirModal('modalCrearMesa');
    setTimeout(() => document.getElementById('inputNombreMesa').focus(), 50);
  });

  document.getElementById('btnCancelarCrear').addEventListener('click', () => {
    cerrarModal('modalCrearMesa');
  });

  document.getElementById('btnConfirmarCrear').addEventListener('click', crearNuevaMesa);
  document.getElementById('inputNombreMesa').addEventListener('keydown', e => {
    if (e.key === 'Enter') crearNuevaMesa();
  });

  document.getElementById('btnConfirmarDispositivo').addEventListener('click', confirmarNombreDispositivo);
  document.getElementById('inputNombreDispositivo').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmarNombreDispositivo();
  });

  document.getElementById('btnCambiarDispositivo').addEventListener('click', () => {
    const actual = localStorage.getItem('bar_nombre_dispositivo') || '';
    document.getElementById('inputNombreDispositivo').value = actual;
    abrirModal('modalNombreDispositivo');
    setTimeout(() => document.getElementById('inputNombreDispositivo').focus(), 50);
  });

}

window.crearNuevaMesa = async function () {
  const nombre = document.getElementById('inputNombreMesa').value.trim() || 'Mesa sin nombre';
  try {
    const data = await API.crearMesa(nombre);
    window.location.href = `mesa.html?id=${data.mesa}&comanda=${data.comanda_id}`;
  } catch (err) {
    mostrarToast(err.message, 'error');
  }
};

async function confirmarEntrarMesa() {
  if (!mesaSeleccionadaId) return;
  setLoader(true);
  try {
    const result = await API.entrarMesa(mesaSeleccionadaId);
    console.log('result entrar:', result); // ← añade esto
    window.location.href = `mesa.html?id=${mesaSeleccionadaId}&comanda=${result.comanda_id}`;
  } catch (err) {
    mostrarToast(err.message, 'error');
  } finally {
    setLoader(false);
  }
}

function confirmarNombreDispositivo() {
  const nombre = document.getElementById('inputNombreDispositivo').value.trim();
  if (!nombre) {
    mostrarToast('Introduce un nombre para este dispositivo.', 'warning');
    document.getElementById('inputNombreDispositivo').focus();
    return;
  }
  localStorage.setItem('bar_nombre_dispositivo', nombre);
  const headerNombre = document.getElementById('headerNombreDispositivo');
  if (headerNombre) headerNombre.textContent = nombre;
  cerrarModal('modalNombreDispositivo');
  mostrarToast(`Dispositivo guardado como "${nombre}"`, 'success');
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}