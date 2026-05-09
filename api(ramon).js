
const API = {
  base: '',

  _headers(token) {
    const h = { 'Content-Type': 'application/json' };
    if (token) h['x-mesa-token'] = token;
    return h;
  },

  async _fetch(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text(); 
    try {
      const data = JSON.parse(text);
      if (!res.ok) throw new Error(data.error || 'Error desconocido');
      return data;
    } catch (err) {
      console.error("Respuesta no válida del servidor:", text);
      if (err instanceof SyntaxError) throw new Error("Error del servidor (PHP). Revisa la consola para ver el detalle.");
      throw err;
    }
  },

  getProductos() {
    return this._fetch(`${this.base}api/productos.php`);
  },

  getMesas() {
    return this._fetch(`${this.base}api/mesas.php`);
  },


  nuevaMesa(nombre) {
    return this._fetch(`${this.base}api/nueva_mesa.php`, {
    method: 'POST',
    headers: this._headers(),
    body: JSON.stringify({nombre}),
  });
  },

  guardarMesa(id, comanda) {
    return this._fetch(`${this.base}api/mesas_salir_guardando.php`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify({ id, comanda })
    });
  },

  salirSinGuardar(comanda) {
    return this._fetch(`${this.base}api/mesas_cancelar.php`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify({ comanda })
    });
  },

  entrarMesa(id) {
    const camarero = obtenerNombreDispositivo() || 'Sin nombre';
    return this._fetch(`${this.base}api/mesas_entrar.php`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify({ id, camarero }),
    });
  },


  
  borrarLineasCanceladas(comanda) {
    return this._fetch(`${this.base}api/mesas_cancelar.php`, {
    method: 'POST',
    headers: this._headers(),
    body: JSON.stringify({ comanda })
    });
},

salirMesa(id) {
  return this._fetch(`${this.base}api/prueba.php`, {
    method: 'POST',
    headers: this._headers(),
    body: JSON.stringify({ comanda: id }),
  });
},

  getDetalleMesa(id) {
    return this._fetch(`${this.base}api/mesas_detalle.php?id=${id}`);
  },

  actualizarLinea(id, producto_id, cantidad) {
    return this._fetch(`${this.base}api/mesas_linea.php`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify({ id, producto_id, cantidad }),
    });
  },

  cobrarMesa(id) {
    return this._fetch(`${this.base}api/mesas_cobrar.php`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify({ id }),
    });
  },

  getCierre() {
    return this._fetch(`${this.base}api/cierre.php`);
  },

  nuevoDia() {
    return this._fetch(`${this.base}api/nuevo_dia.php`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify({}),
    });
  },
  cancelarPedido(id, token) {
    return this._fetch(`${this.base}api/mesas_cancelar.php`, {
      method: 'POST',
      headers: this._headers(token),
      body: JSON.stringify({ id }),
    });
  },

  actualizarLineaEstado(id, linea_id, estado, comentario) {
  return this._fetch(`${this.base}api/mesas_linea_estado.php`, {
    method: 'POST',
    headers: this._headers(),
    body: JSON.stringify({ id, linea_id, estado, comentario }),
  });
  },

  restaurarPedido(id, lineas) {
    return this._fetch(`${this.base}api/mesas_restaurar.php`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify({ id, lineas }),
   });
  },
};

function obtenerNombreDispositivo() {
  return localStorage.getItem('bar_nombre_dispositivo') || null;
}

function iniciarReloj(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  function tick() {
    const now = new Date();
    const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const dia  = dias[now.getDay()];
    const fecha = now.toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric' });
    const hora  = now.toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    el.textContent = `${dia}  ${fecha}  ·  ${hora}`;
  }
  tick();
  setInterval(tick, 1000);
}

function mostrarToast(msg, tipo = 'info', duracion = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.innerHTML = `<span>${icons[tipo] || ''}</span> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), duracion);
}

function setLoader(visible) {
  const el = document.getElementById('loader');
  if (el) el.classList.toggle('active', visible);
}

function abrirModal(id)  { document.getElementById(id)?.classList.add('open'); }
function cerrarModal(id) { document.getElementById(id)?.classList.remove('open'); }

document.addEventListener('click', function (e) {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

iniciarReloj('reloj');