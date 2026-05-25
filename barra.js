const REFRESH_MS = 5000;
let intervalo = null;

document.addEventListener('DOMContentLoaded', () => {
  cargar();
  intervalo = setInterval(cargar, REFRESH_MS);
});

async function cargar() {
  try {
    const data = await API._fetch('api/barra.php');
    renderizar(data);
  } catch (err) {
    mostrarToast('Error: ' + err.message, 'error');
  }
}

function renderizar(lineas) {
  const main  = document.getElementById('barraMain');

  if (!lineas.length) {
    main.innerHTML = `
      <div class="barra-empty">
        <div style="font-size:64px;opacity:.3">🍽️</div>
        <h3>Sin pedidos pendientes</h3>
      </div>`;
    return;
  }

  const mesas = {};
  lineas.forEach(l => {
    if (!mesas[l.mesa_id]) mesas[l.mesa_id] = { nombre: l.mesa_nombre, lineas: [] };
    mesas[l.mesa_id].lineas.push(l);
  });

  main.innerHTML = Object.entries(mesas).map(([mesaId, m]) => `
    <div class="barra-mesa" id="barra-mesa-${mesaId}">
      <div class="barra-mesa-header">
        <span class="barra-mesa-nombre">${escHtml(m.nombre)}</span>
        <button class="barra-btn-todo" onclick="servirTodo(${mesaId})">✅ Llevar todo</button>
      </div>
      <div class="barra-lineas">
        ${m.lineas.map(l => `
          <div class="barra-linea" id="barra-linea-${l.linea_id}" onclick="servirLinea(${l.linea_id}, ${mesaId})">
            <span class="barra-qty">${parseInt(l.cantidad)}</span>
            <span class="barra-prod">${escHtml(l.producto)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

async function servirLinea(lineaId, mesaId) {
  const el = document.getElementById(`barra-linea-${lineaId}`);
  if (el) el.classList.add('sirviendo');
  try {
    await API._fetch('api/barra_servir.php', {
      method: 'POST',
      body: JSON.stringify({ linea_id: lineaId, mesa_id: mesaId, todo: false })
    });
    await cargar();
  } catch (err) {
    mostrarToast('Error: ' + err.message, 'error');
    if (el) el.classList.remove('sirviendo');
  }
}

async function servirTodo(mesaId) {
  const el = document.getElementById(`barra-mesa-${mesaId}`);
  if (el) el.classList.add('sirviendo');
  try {
    await API._fetch('api/barra_servir.php', {
      method: 'POST',
      body: JSON.stringify({ mesa_id: mesaId, todo: true })
    });
    await cargar();
  } catch (err) {
    mostrarToast('Error: ' + err.message, 'error');
    if (el) el.classList.remove('sirviendo');
  }
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}