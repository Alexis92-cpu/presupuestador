/* ===================================================
   NETPOINT – app.js v3.5 (Supabase Auto-Engine)
   =================================================== */
'use strict';

const SUPABASE_URL = "https://wrvjdyvwaejuguedqwsa.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndydmpkeXZ3YWVqdWd1ZWRxd3NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTEwNzksImV4cCI6MjA4ODQ4NzA3OX0.irf_mFgAaAoNWachMKpwf5WWUHSVMIf3_j5LA5O9lSI";
let supabase = null;

function initSupabase() {
  try {
    if (window.supabase) {
      if (!supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("Supabase inicializado ✓");
      }
      return supabase;
    }
  } catch (e) {
    console.error("Error al iniciar Supabase:", e);
  }
  return null;
}

const DB_KEY = 'netpoint_db';
const TABLE_NAME = 'app_data';
const DATA_ID = 'main_config';

function getDB() {
  try {
    const local = localStorage.getItem(DB_KEY);
    return local ? JSON.parse(local) : {};
  } catch (e) { return {}; }
}

async function saveDB(db) {
  if (!db || !db.usuarios) return; // Protección: No guardar si la DB está corrupta

  // Guardar localmente
  localStorage.setItem(DB_KEY, JSON.stringify(db));

  const client = initSupabase();
  if (client) {
    try {
      // Añadimos una marca de tiempo para saber qué versión es la más nueva
      db.lastUpdate = Date.now();
      await client.from(TABLE_NAME).upsert({ id: DATA_ID, data: db });
    } catch (e) { console.error("Error nube:", e); }
  }
}

async function syncFromCloud() {
  const client = initSupabase();
  if (!client) {
    console.warn("Motor de red no disponible. Operando en modo local.");
    updateCloudStatus('offline');
    return getDB();
  }

  updateCloudStatus('syncing');

  try {
    // Timeout de 10 segundos para no quedarse buscando eternamente
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout: la nube no responde')), 10000)
    );

    const fetchPromise = client
      .from(TABLE_NAME)
      .select('data')
      .eq('id', DATA_ID)
      .single();

    const { data: result, error } = await Promise.race([fetchPromise, timeoutPromise]);

    if (error && error.code !== 'PGRST116') throw error;

    const localData = getDB();

    if (result && result.data) {
      const cloudData = result.data;

      // Lógica de Fusión Segura:
      if (!localData.lastUpdate || (cloudData.lastUpdate > localData.lastUpdate)) {
        console.log("Descargando datos reales de la nube...");
        localStorage.setItem(DB_KEY, JSON.stringify(cloudData));
        updateCloudStatus('online');
        if (currentUser) {
          renderPresupuestos();
          renderProductos();
          renderClientes();
          renderUsuarios();
        }
        return cloudData;
      } else if (localData.lastUpdate > cloudData.lastUpdate) {
        console.log("Subiendo cambios locales más nuevos...");
        await saveDB(localData);
        updateCloudStatus('online');
      } else {
        // Mismo timestamp, ya están sincronizados
        updateCloudStatus('online');
      }
    } else {
      // Nube vacía
      if (localData.lastUpdate) {
        console.log("Nube vacía, inicializando con tus datos locales...");
        await saveDB(localData);
      }
      updateCloudStatus('online');
    }
  } catch (err) {
    console.error("Error sync:", err);
    updateCloudStatus('error', err.message);
    // Intentar reconectar en 30 segundos
    setTimeout(() => {
      console.log("Reintentando conexión con la nube...");
      syncFromCloud();
    }, 30000);
  }
  return getDB();
}

function updateCloudStatus(status, extra = '') {
  const badge = document.getElementById('cloudStatusBadge');
  if (!badge) return;

  if (status === 'syncing') {
    badge.innerHTML = '🔄 Buscando nube...';
    badge.className = 'cloud-status syncing';
  } else if (status === 'online') {
    badge.innerHTML = '⚡ Nivelado con Nube';
    badge.className = 'cloud-status online';
  } else if (status === 'offline') {
    badge.innerHTML = '📶 Solo Modo Local';
    badge.className = 'cloud-status offline';
  } else {
    badge.innerHTML = '⚠️ Nube parada (Local OK)';
    badge.className = 'cloud-status error';
  }
}

function startRealtime() {
  const client = initSupabase();
  if (!client) return;

  client.channel('any')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: TABLE_NAME }, payload => {
      if (payload.new && payload.new.id === DATA_ID) {
        const cloudData = payload.new.data;
        const localData = getDB();

        // Solo actualizar si la nube tiene cambios que no tenemos
        if (cloudData.lastUpdate > (localData.lastUpdate || 0)) {
          localStorage.setItem(DB_KEY, JSON.stringify(cloudData));
          if (currentUser) {
            showToast("Actualizado ⚡", "info");
            renderPresupuestos();
            renderProductos();
            renderClientes();
            renderUsuarios();
          }
        }
      }
    }).subscribe();
}

// Iniciar tiempo real en 5s para no saturar el arranque
setTimeout(startRealtime, 5000);

// Inicializa la base de datos con datos de ejemplo
function initDB() {
  let db = getDB();

  if (!db.initialized || !db.usuarios || db.usuarios.length === 0) {
    db.usuarios = [
      { id: 1, username: 'admin', password: btoa('admin123'), nombre: 'Administrador', rol: 'admin', estado: 'activo' },
      { id: 2, username: 'vendedor1', password: btoa('venta123'), nombre: 'Juan Pérez', rol: 'vendedor', estado: 'activo' }
    ];
    db.productos = db.productos || [
      { id: 1, codigo: 'SERV-001', nombre: 'Consultoría IT (hora)', categoria: 'Servicios', unidad: 'horas', precioARS: 15000, descripcion: 'Consultoría técnica por hora' },
      { id: 2, codigo: 'SERV-002', nombre: 'Desarrollo Web', categoria: 'Servicios', unidad: 'servicio', precioARS: 350000, descripcion: 'Desarrollo de sitio web completo' },
      { id: 3, codigo: 'HW-001', nombre: 'Notebook HP 15"', categoria: 'Hardware', unidad: 'unidad', precioARS: 890000, descripcion: 'Notebook HP 15-dy i5 16GB 512SSD' },
      { id: 4, codigo: 'HW-002', nombre: 'Monitor 24" LED', categoria: 'Hardware', unidad: 'unidad', precioARS: 320000, descripcion: 'Monitor Full HD IPS' },
      { id: 5, codigo: 'SW-001', nombre: 'Licencia Office 365', categoria: 'Software', unidad: 'unidad', precioARS: 45000, descripcion: 'Licencia anual Office 365 Business' },
    ];
    db.clientes = [
      { id: 1, nombre: 'Empresa Demo S.A.', cuit: '30-12345678-9', email: 'contacto@demo.com', telefono: '+54 11 4000-0000', empresa: 'Demo S.A.', condIva: 'Responsable Inscripto', direccion: 'Av. Corrientes 1234, CABA' },
      { id: 2, nombre: 'Carlos Martínez', cuit: '20-30000000-1', email: 'carlos@gmail.com', telefono: '+54 9 11 5555-4444', empresa: '', condIva: 'Consumidor Final', direccion: 'Mendoza 456, Rosario' }
    ];
    db.presupuestos = [
      {
        id: 1,
        numero: 'PRES-0001',
        clienteId: 1,
        clienteNombre: 'Empresa Demo S.A.',
        fecha: '2026-03-02',
        validez: 15,
        estado: 'enviado',
        observaciones: 'Presupuesto de ejemplo',
        aplicaIva: false,
        items: [
          { productoId: 3, nombre: 'Notebook HP 15"', cantidad: 2, precioUnit: 890000, descuento: 5 },
          { productoId: 5, nombre: 'Licencia Office 365', cantidad: 2, precioUnit: 45000, descuento: 0 }
        ],
        dolarBlueAtCreacion: 0,
        dolarOficialAtCreacion: 0
      }
    ];
    db.nextId = { presupuestos: 2, productos: 6, clientes: 3, usuarios: 3 };
    db.initialized = true;
    // IMPORTANTE: Ya no llamamos a saveDB(db) aquí para no sobreescribir la nube 
    // con datos dummy al abrir una pestaña incógnito.
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }
  return db;
}

// Estado global de la sesión
let currentUser = null;
let dollarRates = { oficial: 0, lastUpdate: null };
let currentPresupuestoItems = [];
let editingPresupuestoId = null;
let editingProductoId = null;
let editingClienteId = null;
let editingUsuarioId = null;

// =====================================================
// AUTH
// =====================================================
function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const db = getDB();

  const user = (db.usuarios || []).find(u =>
    u.username === username &&
    u.password === btoa(password) &&
    u.estado === 'activo'
  );

  const loginError = document.getElementById('loginError');

  if (user) {
    loginError.classList.add('hidden');
    currentUser = user;
    sessionStorage.setItem('presupuestopro_user', JSON.stringify(user));
    enterApp();
  } else {
    loginError.classList.remove('hidden');
    document.getElementById('loginPass').value = '';
    document.getElementById('loginPass').focus();
    // Shake animation
    const card = document.querySelector('.login-card');
    card.style.animation = 'none';
    card.offsetHeight; // reflow
    card.style.animation = 'shake 0.4s ease';

    // Debug info si estamos en desarrollo
    console.log("Intento de login fallido para:", username);
    console.log("Usuarios disponibles en DB local:", (db.usuarios || []).map(u => u.username));
  }
}

function handleLogout() {
  if (!confirm('¿Deseas cerrar sesión?')) return;
  currentUser = null;
  sessionStorage.removeItem('presupuestopro_user');
  document.getElementById('appScreen').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('loginScreen').classList.add('active');
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  showSection('presupuestos');
}

function togglePassword() {
  const inp = document.getElementById('loginPass');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function enterApp() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('active');
  document.getElementById('appScreen').classList.remove('hidden');
  document.getElementById('appScreen').classList.add('active');

  // Actualizar UI de usuario
  document.getElementById('userAvatar').textContent = (currentUser.nombre || currentUser.username)[0].toUpperCase();
  document.getElementById('userNameDisplay').textContent = currentUser.nombre || currentUser.username;

  // Ocultar sección usuarios si no es admin
  const navUsuarios = document.getElementById('nav-usuarios');
  if (currentUser.rol !== 'admin') {
    navUsuarios.style.display = 'none';
  }

  loadDollarRates();
  renderPresupuestos();
  renderProductos();
  renderClientes();
  renderUsuarios();
  updateCategoriasDatalist();
}

// =====================================================
// DOLLAR RATES – BNA (Banco Nación) & Blue
// =====================================================
async function loadDollarRates() {
  try {
    // Usamos DolarApi.com que es muy estable
    const respOficial = await fetch('https://dolarapi.com/v1/dolares/oficial');
    const respBlue = await fetch('https://dolarapi.com/v1/dolares/blue');

    const dataOficial = await respOficial.json();
    const dataBlue = await respBlue.json();

    dollarRates.oficial = dataOficial?.venta || 0; // Valor Venta BNA
    dollarRates.lastUpdate = new Date();
    updateDollarUI();
  } catch (err) {
    console.error('Error cargando dólares:', err);
    // Fallback: API alternativa bluelytics
    try {
      const resp2 = await fetch('https://api.bluelytics.com.ar/v2/latest');
      const data2 = await resp2.json();
      dollarRates.oficial = data2?.oficial?.value_sell || 0;
      dollarRates.lastUpdate = new Date();
      updateDollarUI();
    } catch {
      document.getElementById('dolarOficial').textContent = '—';
    }
  }

  // Recargar cada 5 minutos
  setTimeout(loadDollarRates, 5 * 60 * 1000);
}

function updateDollarUI() {
  const fmtARS = (n) => n ? `$${fmt(n, 0)}` : '—';
  document.getElementById('dolarOficial').textContent = fmtARS(dollarRates.oficial);
  const upd = document.getElementById('dollarUpdate');
  if (dollarRates.lastUpdate) {
    upd.textContent = `Act. ${dollarRates.lastUpdate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
    upd.style.display = 'block';
  }
  // Recalcular totales abiertos
  calcTotales();
}

// =====================================================
// NAVIGATION
// =====================================================
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const section = document.getElementById('section-' + name);
  if (section) section.classList.add('active');
  const nav = document.getElementById('nav-' + name);
  if (nav) nav.classList.add('active');
  closeSidebar();

  if (name === 'presupuestos') renderPresupuestos();
  if (name === 'productos') renderProductos();
  if (name === 'clientes') renderClientes();
  if (name === 'usuarios') renderUsuarios();
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('visible');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('visible');
}

// =====================================================
// FORMATTERS
// =====================================================
function fmt(n, decimals = 2) {
  if (n === null || n === undefined || isNaN(n)) return '0' + (decimals > 0 ? ',' + '0'.repeat(decimals) : '');
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtARS(n) { return `$ ${fmt(n)}`; }
function fmtUSD(n) { return `U$S ${fmt(n)}`; }
function toUSD(arsAmount, rate) { return rate > 0 ? arsAmount / rate : 0; }

function statusLabel(s) {
  const map = { borrador: 'Borrador', enviado: 'Enviado', aprobado: 'Aprobado', rechazado: 'Rechazado' };
  return map[s] || s;
}
function statusClass(s) {
  return `card-status status-${s}`;
}
function statusBadge(s) {
  const cls = { borrador: 'muted', enviado: 'info', aprobado: 'success', rechazado: 'danger' };
  return `<span class="badge badge-${cls[s] || 'muted'}">${statusLabel(s)}</span>`;
}

function rolLabel(r) {
  return { admin: 'Administrador', vendedor: 'Vendedor', viewer: 'Solo lectura' }[r] || r;
}

// =====================================================
// PRESUPUESTOS
// =====================================================
function renderPresupuestos() {
  const db = getDB();
  const search = (document.getElementById('searchPresupuestos')?.value || '').toLowerCase();
  const estado = document.getElementById('filterEstado')?.value || '';

  let list = (db.presupuestos || []).filter(p => {
    const matchSearch = !search ||
      p.numero.toLowerCase().includes(search) ||
      p.clienteNombre.toLowerCase().includes(search);
    const matchEstado = !estado || p.estado === estado;
    return matchSearch && matchEstado;
  }).sort((a, b) => b.id - a.id);

  const container = document.getElementById('presupuestosList');
  const empty = document.getElementById('emptyPresupuestos');

  if (list.length === 0) {
    container.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  const oficial = dollarRates.oficial;

  container.innerHTML = list.map(p => {
    const total = calcPresupuestoTotal(p);
    const totalUSD = toUSD(total, oficial);
    const canEdit = currentUser.rol !== 'viewer';
    return `
    <div class="budget-card ${p.estado}" onclick="openEditPresupuesto(${p.id})">
      <div class="card-top">
        <span class="card-num">${p.numero}</span>
        <span class="${statusClass(p.estado)}">${statusLabel(p.estado)}</span>
      </div>
      <div class="card-client">${p.clienteNombre || '—'}</div>
      <div class="card-date">📅 ${formatDate(p.fecha)} &nbsp;·&nbsp; Validez: ${p.validez} días</div>
      <div class="card-total">
        <div>
          <div class="card-total-label">Total</div>
          <div class="card-total-ars">${fmtARS(total)}</div>
          ${oficial > 0 ? `<div class="card-total-usd">${fmtUSD(totalUSD)}</div>` : ''}
        </div>
        <div class="card-actions" onclick="event.stopPropagation()">
          ${canEdit ? `<button class="btn-icon" onclick="openEditPresupuesto(${p.id})" title="Editar">✏️</button>` : ''}
          <button class="btn-icon" onclick="previewPresupuesto(${p.id})" title="Imprimir">🖨️</button>
          ${canEdit ? `<button class="btn-icon danger" onclick="deletePresupuesto(${p.id})" title="Eliminar">🗑️</button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

function filterPresupuestos() { renderPresupuestos(); }

function calcPresupuestoTotal(p) {
  let sub = (p.items || []).reduce((acc, item) => {
    // Subtotal base con descuento
    const base = item.cantidad * item.precioUnit * (1 - (item.descuento || 0) / 100);
    // Aplicar ganancia interna
    const subtotal = base * (1 + (item.ganancia || 0) / 100);
    return acc + subtotal;
  }, 0);
  if (p.aplicaIva) sub = sub * 1.21;
  return sub;
}

function openNuevoPresupuesto() {
  if (currentUser.rol === 'viewer') { showToast('Sin permisos para crear presupuestos', 'error'); return; }
  editingPresupuestoId = null;
  currentPresupuestoItems = [];
  document.getElementById('modalPresupuestoTitle').textContent = 'Nuevo Presupuesto';

  const db = getDB();
  const nextNum = String(db.nextId?.presupuestos || 1).padStart(4, '0');
  document.getElementById('presNumero').value = `PRES-${nextNum}`;
  document.getElementById('presFecha').value = todayISO();
  document.getElementById('presValidez').value = 15;
  document.getElementById('presFormaPago').value = 'Contado';
  document.getElementById('presObservaciones').value = '';
  document.getElementById('presEstado').value = 'borrador';
  document.getElementById('aplicaIva').checked = false;

  fillClientesDatalist();
  fillItemProductoSelect();
  renderPresItems();
  calcTotales();
  openModal('modalPresupuesto');
}

function openEditPresupuesto(id) {
  const db = getDB();
  const p = (db.presupuestos || []).find(x => x.id === id);
  if (!p) return;

  editingPresupuestoId = id;
  currentPresupuestoItems = JSON.parse(JSON.stringify(p.items || []));

  document.getElementById('modalPresupuestoTitle').textContent = `Editar ${p.numero}`;
  document.getElementById('presNumero').value = p.numero;
  document.getElementById('presFecha').value = p.fecha;
  document.getElementById('presValidez').value = p.validez;
  document.getElementById('presFormaPago').value = p.formaPago || 'Contado';
  document.getElementById('presObservaciones').value = p.observaciones || '';
  document.getElementById('presEstado').value = p.estado;
  document.getElementById('aplicaIva').checked = p.aplicaIva || false;

  fillClientesDatalist();
  fillItemProductoSelect();
  renderPresItems();
  calcTotales();
  openModal('modalPresupuesto');
}

function fillClientesDatalist() {
  const db = getDB();
  const dl = document.getElementById('clientesDatalist');
  dl.innerHTML = (db.clientes || []).map(c =>
    `<option value="${c.nombre}">${c.empresa ? ' · ' + c.empresa : ''}</option>`
  ).join('');

  // Si estamos editando, poner el nombre actual
  if (editingPresupuestoId) {
    const p = db.presupuestos.find(x => x.id === editingPresupuestoId);
    if (p) document.getElementById('presClienteBusqueda').value = p.clienteNombre;
  } else {
    document.getElementById('presClienteBusqueda').value = '';
  }
}

function fillItemProductoSelect() {
  const db = getDB();
  const sel = document.getElementById('itemProducto');
  sel.innerHTML = '<option value="">— Seleccionar producto —</option>' +
    (db.productos || []).map(p =>
      `<option value="${p.id}" data-precio="${p.precioARS}">${p.nombre} (${p.codigo || '—'}) — ${fmtARS(p.precioARS)}</option>`
    ).join('');
}

function onItemProductoChange() {
  const sel = document.getElementById('itemProducto');
  const opt = sel.options[sel.selectedIndex];
  const precio = opt?.dataset?.precio || '';
  document.getElementById('itemPrecio').value = precio;
}

function addItemToPresupuesto() {
  const prodId = parseInt(document.getElementById('itemProducto').value);
  const cantidad = parseFloat(document.getElementById('itemCantidad').value) || 1;
  const precio = parseFloat(document.getElementById('itemPrecio').value) || 0;
  const descuento = parseFloat(document.getElementById('itemDesc').value) || 0;
  const ganancia = parseFloat(document.getElementById('itemGanancia').value) || 0;

  if (!prodId) { showToast('Seleccioná un producto', 'error'); return; }
  if (precio <= 0) { showToast('Ingresá un precio válido', 'error'); return; }

  const db = getDB();
  const prod = (db.productos || []).find(p => p.id === prodId);

  currentPresupuestoItems.push({
    productoId: prodId,
    nombre: prod?.nombre || 'Producto',
    cantidad,
    precioUnit: precio,
    descuento,
    ganancia
  });

  // Reset fields
  document.getElementById('itemProducto').value = '';
  document.getElementById('itemCantidad').value = 1;
  document.getElementById('itemPrecio').value = '';
  document.getElementById('itemDesc').value = 0;
  document.getElementById('itemGanancia').value = 0;

  renderPresItems();
  calcTotales();
}

function removeItemFromPresupuesto(idx) {
  currentPresupuestoItems.splice(idx, 1);
  renderPresItems();
  calcTotales();
}

function renderPresItems() {
  const tbody = document.getElementById('presItemsBody');
  if (!currentPresupuestoItems.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-muted" style="text-align:center;padding:20px">No hay ítems agregados</td></tr>`;
    return;
  }
  const oficial = dollarRates.oficial;
  tbody.innerHTML = currentPresupuestoItems.map((item, i) => {
    const baseARS = item.cantidad * item.precioUnit * (1 - item.descuento / 100);
    const subtotalARS = baseARS * (1 + (item.ganancia || 0) / 100);
    const subtotalUSD = toUSD(subtotalARS, oficial);
    return `<tr>
      <td>${i + 1}</td>
      <td class="td-primary">${item.nombre}</td>
      <td>${fmt(item.cantidad, 0)}</td>
      <td>${fmtARS(item.precioUnit)}</td>
      <td>${item.descuento > 0 ? `<span class="text-success">${item.descuento}%</span>` : '—'}</td>
      <td class="text-warning">${item.ganancia > 0 ? `${item.ganancia}%` : '—'}</td>
      <td class="td-money">${fmtARS(subtotalARS)}</td>
      <td class="td-usd">${oficial > 0 ? fmtUSD(subtotalUSD) : '—'}</td>
      <td><button class="btn-icon danger" onclick="removeItemFromPresupuesto(${i})" title="Quitar">✕</button></td>
    </tr>`;
  }).join('');
}

function calcTotales() {
  const subtotal = currentPresupuestoItems.reduce((acc, item) => {
    const base = item.cantidad * item.precioUnit * (1 - item.descuento / 100);
    return acc + (base * (1 + (item.ganancia || 0) / 100));
  }, 0);

  const aplicaIva = document.getElementById('aplicaIva')?.checked;
  const iva = aplicaIva ? subtotal * 0.21 : 0;
  const total = subtotal + iva;
  const oficial = dollarRates.oficial;

  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('totalSubtotal', fmtARS(subtotal));
  el('totalIVA', fmtARS(iva));
  el('totalARS', fmtARS(total));
  el('totalUSDOficial', oficial > 0 ? fmtUSD(toUSD(total, oficial)) : '—');
}

function updatePresupuestoCliente() { }

async function savePresupuesto(skipClose = false) {
  const db = getDB();
  const clienteNombreInput = document.getElementById('presClienteBusqueda').value.trim();

  if (!clienteNombreInput) { showToast('Ingrese el nombre del cliente', 'error'); return false; }

  let cliente = (db.clientes || []).find(c => c.nombre.toLowerCase() === clienteNombreInput.toLowerCase());
  let clienteId = cliente ? cliente.id : null;

  if (!clienteId) {
    const confirmAdd = confirm(`El cliente "${clienteNombreInput}" no existe en el apartado clientes. ¿Desea agregarlo?`);
    if (confirmAdd) {
      // Crear nuevo cliente rápido
      if (!db.clientes) db.clientes = [];
      if (!db.nextId) db.nextId = {};
      clienteId = db.nextId.clientes || 1;
      const nuevoCliente = {
        id: clienteId,
        nombre: clienteNombreInput,
        cuit: '',
        email: '',
        telefono: '',
        empresa: '',
        condIva: 'Consumidor Final',
        direccion: ''
      };
      db.clientes.push(nuevoCliente);
      db.nextId.clientes = clienteId + 1;
      saveDB(db);
      showToast('Cliente agregado y guardado', 'success');
      renderClientes(); // Actualizar lista de clientes si está abierta
    } else {
      showToast('Debe seleccionar un cliente existente o permitir agregarlo', 'warning');
      return false;
    }
  }

  if (currentPresupuestoItems.length === 0) { showToast('Agregá al menos un ítem', 'error'); return false; }

  const data = {
    clienteId,
    clienteNombre: clienteNombreInput,
    numero: document.getElementById('presNumero').value,
    fecha: document.getElementById('presFecha').value,
    validez: parseInt(document.getElementById('presValidez').value) || 15,
    formaPago: document.getElementById('presFormaPago').value,
    observaciones: document.getElementById('presObservaciones').value,
    estado: document.getElementById('presEstado').value,
    aplicaIva: document.getElementById('aplicaIva').checked,
    items: JSON.parse(JSON.stringify(currentPresupuestoItems)),
    dolarOficialAtCreacion: dollarRates.oficial
  };

  if (editingPresupuestoId) {
    const idx = (db.presupuestos || []).findIndex(p => p.id === editingPresupuestoId);
    if (idx !== -1) {
      db.presupuestos[idx] = { ...db.presupuestos[idx], ...data };
    }
  } else {
    if (!db.presupuestos) db.presupuestos = [];
    if (!db.nextId) db.nextId = {};
    const newId = db.nextId.presupuestos || 1;
    db.presupuestos.push({ id: newId, ...data });
    db.nextId.presupuestos = newId + 1;
  }

  saveDB(db);
  if (!skipClose) {
    closeModal('modalPresupuesto');
  }
  renderPresupuestos();
  showToast(editingPresupuestoId ? 'Presupuesto actualizado ✓' : 'Presupuesto creado ✓', 'success');
  return true;
}

function deletePresupuesto(id) {
  if (!confirm('¿Eliminar este presupuesto?')) return;
  const db = getDB();
  db.presupuestos = (db.presupuestos || []).filter(p => p.id !== id);
  saveDB(db);
  renderPresupuestos();
  showToast('Presupuesto eliminado', 'info');
}

function previewPresupuestoFromModal() {
  // Validaciones básicas
  const clienteNombreInput = document.getElementById('presClienteBusqueda').value.trim();
  if (!clienteNombreInput) { showToast('Ingrese el nombre del cliente', 'error'); return; }
  if (currentPresupuestoItems.length === 0) { showToast('Agregá al menos un ítem', 'error'); return; }

  const db = getDB();

  // Buscar o crear cliente
  let cliente = (db.clientes || []).find(c => c.nombre.toLowerCase() === clienteNombreInput.toLowerCase());
  let clienteId = cliente ? cliente.id : null;

  if (!clienteId) {
    const confirmAdd = confirm(`El cliente "${clienteNombreInput}" no existe. ¿Desea agregarlo?`);
    if (confirmAdd) {
      if (!db.clientes) db.clientes = [];
      if (!db.nextId) db.nextId = {};
      clienteId = db.nextId.clientes || 1;
      db.clientes.push({ id: clienteId, nombre: clienteNombreInput, cuit: '', email: '', telefono: '', empresa: '', condIva: 'Consumidor Final', direccion: '' });
      db.nextId.clientes = clienteId + 1;
    } else {
      return;
    }
  }

  // Armar datos del presupuesto
  const data = {
    clienteId,
    clienteNombre: clienteNombreInput,
    numero: document.getElementById('presNumero').value,
    fecha: document.getElementById('presFecha').value,
    validez: parseInt(document.getElementById('presValidez').value) || 15,
    formaPago: document.getElementById('presFormaPago').value,
    observaciones: document.getElementById('presObservaciones').value,
    estado: document.getElementById('presEstado').value,
    aplicaIva: document.getElementById('aplicaIva').checked,
    items: JSON.parse(JSON.stringify(currentPresupuestoItems)),
    dolarOficialAtCreacion: dollarRates.oficial
  };

  // Guardar en la DB
  if (editingPresupuestoId) {
    const idx = (db.presupuestos || []).findIndex(p => p.id === editingPresupuestoId);
    if (idx !== -1) db.presupuestos[idx] = { ...db.presupuestos[idx], ...data };
  } else {
    if (!db.presupuestos) db.presupuestos = [];
    if (!db.nextId) db.nextId = {};
    const newId = db.nextId.presupuestos || 1;
    db.presupuestos.push({ id: newId, ...data });
    db.nextId.presupuestos = newId + 1;
  }

  // Guardar local + nube (sin await, no bloqueamos)
  saveDB(db);
  renderPresupuestos();

  const previewId = editingPresupuestoId || (db.presupuestos?.slice(-1)[0]?.id);

  // Cerrar el editor y abrir la preview
  closeModal('modalPresupuesto');

  // Pequeño delay para que el DOM se actualice antes de abrir el siguiente modal
  setTimeout(() => {
    if (previewId) previewPresupuesto(previewId);
  }, 100);
}

function previewPresupuesto(id) {
  const db = getDB();
  const p = (db.presupuestos || []).find(x => x.id === id);
  if (!p) return;

  const oficial = p.dolarOficialAtCreacion > 0 ? p.dolarOficialAtCreacion : dollarRates.oficial;
  const cliente = (db.clientes || []).find(c => c.id === p.clienteId) || {};

  let sub = 0;
  const rowsHTML = (p.items || []).map((item, i) => {
    // Calculamos el precio con ganancia incluida pero ocultamos el desglose de ganancia
    const precioBaseConDesc = item.precioUnit * (1 - item.descuento / 100);
    const precioConGanancia = precioBaseConDesc * (1 + (item.ganancia || 0) / 100);
    const st = item.cantidad * precioConGanancia;

    sub += st;
    return `<tr>
      <td>${i + 1}</td>
      <td>${item.nombre}</td>
      <td style="text-align:center">${fmt(item.cantidad, 0)}</td>
      <td style="text-align:right">${fmtARS(precioConGanancia)}</td>
      <td style="text-align:center">—</td>
      <td style="text-align:right;font-weight:600">${fmtARS(st)}</td>
    </tr>`;
  }).join('');

  const iva = p.aplicaIva ? sub * 0.21 : 0;
  const total = sub + iva;
  const validezDate = addDays(p.fecha, p.validez);

  // Almacenamos el número para el nombre del archivo PDF
  window.currentBudgetNumber = p.numero;

  const html = `
  <div class="print-doc" id="budgetPrintArea">
    <div class="print-header">
      <div class="print-company">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px">
           <img src="logo.png" alt="Logo" style="height:50px; width:auto">
           <div style="display:flex; flex-direction:column">
               <div class="print-company-name">NETPOINT</div>
               <div class="print-company-sub" style="margin-top:-2px">soluciones tecnológicas</div>
           </div>
        </div>
        <div class="print-company-sub" style="margin-top:8px">Fecha: ${formatDate(p.fecha)}</div>
        <div class="print-company-sub">Válido hasta: ${formatDate(validezDate)}</div>
        <div class="print-company-sub">Forma de pago: ${p.formaPago || 'Contado'}</div>
      </div>
      <div class="print-budget-title">
        <div class="print-budget-num">${p.numero}</div>
        <div style="margin-top:6px">${statusBadge(p.estado)}</div>
      </div>
    </div>

    <div class="print-section">
      <h4>Datos del cliente</h4>
      <table style="width:100%;font-size:13px">
        <tr>
          <td><strong>Nombre:</strong> ${cliente.nombre || p.clienteNombre || '—'}</td>
          <td><strong>CUIT/DNI:</strong> ${cliente.cuit || '—'}</td>
        </tr>
        <tr>
          <td><strong>Email:</strong> ${cliente.email || '—'}</td>
          <td><strong>Teléfono:</strong> ${cliente.telefono || '—'}</td>
        </tr>
        <tr>
          <td><strong>Empresa:</strong> ${cliente.empresa || '—'}</td>
          <td><strong>Condición IVA:</strong> ${cliente.condIva || '—'}</td>
        </tr>
        ${cliente.direccion ? `<tr><td colspan="2"><strong>Dirección:</strong> ${cliente.direccion}</td></tr>` : ''}
      </table>
    </div>

    ${p.observaciones ? `<div class="print-section"><h4>Observaciones</h4><p style="font-size:13px">${p.observaciones}</p></div>` : ''}

    <div class="print-section">
      <h4>Detalle de ítems</h4>
      <table class="print-table">
        <thead>
          <tr>
            <th>#</th><th>Descripción</th><th style="text-align:center">Cant.</th>
            <th style="text-align:right">Precio unit.</th>
            <th style="text-align:center">Desc.</th>
            <th style="text-align:right">Subtotal</th>
          </tr>
        </thead>
        <tbody>${rowsHTML}</tbody>
      </table>
    </div>

    <div class="print-totales">
      <div class="print-totales-row"><span>Subtotal:</span><span>${fmtARS(sub)}</span></div>
      ${p.aplicaIva ? `<div class="print-totales-row"><span>IVA (21%):</span><span>${fmtARS(iva)}</span></div>` : ''}
      <div class="print-totales-row print-total-final"><span>TOTAL ARS:</span><span>${fmtARS(total)}</span></div>
      ${oficial > 0 ? `<div class="print-totales-row" style="color:#00d4aa"><span>Total USD:</span><span>${fmtUSD(toUSD(total, oficial))}</span></div>` : ''}
      ${oficial > 0 ? `<div style="font-size:11px;color:#aaa;margin-top:6px">Tipo cambio: $${fmt(oficial, 0)} (BNA)</div>` : ''}
    </div>

    <div class="print-footer">
      <p>Presupuesto generado el ${new Date().toLocaleDateString('es-AR')} — válido por ${p.validez} días.</p>
      <p>Este presupuesto no tiene validez como factura.</p>
    </div>
  </div>`;

  document.getElementById('printContent').innerHTML = html;
  openModal('modalPrint');
}

function downloadPDF() {
  const element = document.getElementById('budgetPrintArea');
  const opt = {
    margin: 10,
    filename: `Presupuesto_${window.currentBudgetNumber || 'Netpoint'}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  showToast('Generando PDF...', 'info');
  html2pdf().set(opt).from(element).save()
    .then(() => showToast('PDF descargado ✓', 'success'))
    .catch(err => {
      console.error(err);
      showToast('Error al generar PDF', 'error');
    });
}

// =====================================================
// PRODUCTOS
// =====================================================
function renderProductos() {
  const db = getDB();
  const search = (document.getElementById('searchProductos')?.value || '').toLowerCase();
  const cat = document.getElementById('filterCategoria')?.value || '';

  let list = (db.productos || []).filter(p => {
    const ms = !search || p.nombre.toLowerCase().includes(search) || (p.codigo || '').toLowerCase().includes(search) || (p.categoria || '').toLowerCase().includes(search);
    const mc = !cat || p.categoria === cat;
    return ms && mc;
  });

  const tbody = document.getElementById('productosBody');
  const empty = document.getElementById('emptyProductos');
  const oficial = dollarRates.oficial;

  if (!list.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  const canEdit = currentUser.rol !== 'viewer';
  tbody.innerHTML = list.map(p => {
    const usd = toUSD(p.precioARS, oficial);
    return `<tr>
      <td class="text-muted">${p.codigo || '—'}</td>
      <td class="td-primary">${p.nombre}${p.descripcion ? `<br><small class="text-muted">${p.descripcion.substring(0, 60)}${p.descripcion.length > 60 ? '…' : ''}</small>` : ''}</td>
      <td><span class="badge badge-info">${p.categoria || '—'}</span></td>
      <td class="td-money">${fmtARS(p.precioARS)}</td>
      <td class="td-usd">${oficial > 0 ? fmtUSD(usd) : '—'}</td>
      <td>
        ${canEdit ? `<button class="btn-icon" onclick="openProductoModal(${p.id})" title="Editar">✏️</button>
        <button class="btn-icon danger" onclick="deleteProducto(${p.id})" title="Eliminar">🗑️</button>` : '—'}
      </td>
    </tr>`;
  }).join('');
}

function filterProductos() { renderProductos(); }

function updateCategoriasDatalist() {
  const db = getDB();
  const cats = [...new Set((db.productos || []).map(p => p.categoria).filter(Boolean))];
  const sel = document.getElementById('filterCategoria');
  if (sel) {
    const current = sel.value;
    sel.innerHTML = '<option value="">Todas las categorías</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
    if (current) sel.value = current;
  }
  const dl = document.getElementById('categoriasDatalist');
  if (dl) dl.innerHTML = cats.map(c => `<option value="${c}">`).join('');
}

function openProductoModal(id = null) {
  if (currentUser.rol === 'viewer') { showToast('Sin permisos', 'error'); return; }
  editingProductoId = id;
  const db = getDB();
  const p = id ? (db.productos || []).find(x => x.id === id) : null;

  document.getElementById('modalProductoTitle').textContent = p ? 'Editar Producto' : 'Nuevo Producto';
  document.getElementById('prodId').value = p?.id || '';

  // Dividir el código en prefijo y número si existe
  const parts = (p?.codigo || '').split('-');
  document.getElementById('prodPrefijo').value = parts[0] || '';
  document.getElementById('prodNumero').value = parts[1] || '';

  document.getElementById('prodNombre').value = p?.nombre || '';
  document.getElementById('prodCategoria').value = p?.categoria || '';
  document.getElementById('prodUnidad').value = p?.unidad || 'unidad';
  document.getElementById('prodPrecioARS').value = p?.precioARS || '';
  document.getElementById('prodDescripcion').value = p?.descripcion || '';

  if (p?.precioARS && dollarRates.oficial > 0) {
    document.getElementById('prodPrecioUSD').value = (p.precioARS / dollarRates.oficial).toFixed(2);
  } else {
    document.getElementById('prodPrecioUSD').value = '';
  }
  openModal('modalProducto');
}

function calcProdUSD() {
  const ars = parseFloat(document.getElementById('prodPrecioARS').value) || 0;
  if (dollarRates.oficial > 0 && ars > 0) {
    document.getElementById('prodPrecioUSD').value = (ars / dollarRates.oficial).toFixed(2);
  }
}

function calcProdARS() {
  const usd = parseFloat(document.getElementById('prodPrecioUSD').value) || 0;
  if (dollarRates.oficial > 0 && usd > 0) {
    document.getElementById('prodPrecioARS').value = (usd * dollarRates.oficial).toFixed(2);
  }
}

function updateNextProdNumber() {
  const prefix = document.getElementById('prodPrefijo').value.trim().toUpperCase();
  if (!prefix) {
    document.getElementById('prodNumero').value = '';
    return;
  }

  const db = getDB();
  const prods = db.productos || [];

  // Escapar caracteres para regex
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^${escapedPrefix}-(\\d+)$`, 'i');

  let max = 0;
  prods.forEach(p => {
    if (p.codigo) {
      const match = p.codigo.match(regex);
      if (match) {
        const num = parseInt(match[1]);
        if (num > max) max = num;
      }
    }
  });

  const next = max + 1;
  document.getElementById('prodNumero').value = next.toString().padStart(3, '0');
}

function saveProducto() {
  const nombre = document.getElementById('prodNombre').value.trim();
  const precioARS = parseFloat(document.getElementById('prodPrecioARS').value) || 0;

  if (!nombre) { showToast('El nombre es obligatorio', 'error'); return; }
  if (precioARS <= 0) { showToast('Ingresá un precio válido', 'error'); return; }

  const prefix = document.getElementById('prodPrefijo').value.trim().toUpperCase();
  const num = document.getElementById('prodNumero').value.trim();
  const codigo = num ? `${prefix}-${num}` : prefix;

  const data = {
    codigo,
    nombre,
    categoria: document.getElementById('prodCategoria').value.trim(),
    unidad: document.getElementById('prodUnidad').value,
    precioARS,
    descripcion: document.getElementById('prodDescripcion').value.trim()
  };

  const db = getDB();
  if (editingProductoId) {
    const idx = (db.productos || []).findIndex(p => p.id === editingProductoId);
    if (idx !== -1) db.productos[idx] = { ...db.productos[idx], ...data };
  } else {
    if (!db.productos) db.productos = [];
    if (!db.nextId) db.nextId = {};
    const newId = db.nextId.productos || 1;
    db.productos.push({ id: newId, ...data });
    db.nextId.productos = newId + 1;
  }

  saveDB(db);
  closeModal('modalProducto');
  renderProductos();
  updateCategoriasDatalist();
  showToast(editingProductoId ? 'Producto actualizado ✓' : 'Producto creado ✓', 'success');
}

function deleteProducto(id) {
  if (!confirm('¿Eliminar este producto?')) return;
  const db = getDB();
  db.productos = (db.productos || []).filter(p => p.id !== id);
  saveDB(db);
  renderProductos();
  updateCategoriasDatalist();
  showToast('Producto eliminado', 'info');
}

// =====================================================
// CLIENTES
// =====================================================
function renderClientes() {
  const db = getDB();
  const search = (document.getElementById('searchClientes')?.value || '').toLowerCase();

  let list = (db.clientes || []).filter(c =>
    !search || c.nombre.toLowerCase().includes(search) ||
    (c.email || '').toLowerCase().includes(search) ||
    (c.empresa || '').toLowerCase().includes(search)
  );

  const tbody = document.getElementById('clientesBody');
  const empty = document.getElementById('emptyClientes');

  if (!list.length) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  const canEdit = currentUser.rol !== 'viewer';
  tbody.innerHTML = list.map(c => `<tr>
    <td class="td-primary">${c.nombre}${c.cuit ? `<br><small class="text-muted">${c.cuit}</small>` : ''}</td>
    <td>${c.email || '—'}</td>
    <td>${c.telefono || '—'}</td>
    <td>${c.empresa || '—'}</td>
    <td>
      ${canEdit ? `<button class="btn-icon" onclick="openClienteModal(${c.id})" title="Editar">✏️</button>
      <button class="btn-icon danger" onclick="deleteCliente(${c.id})" title="Eliminar">🗑️</button>` : '—'}
    </td>
  </tr>`).join('');
}

function filterClientes() { renderClientes(); }

function openClienteModal(id = null) {
  if (currentUser.rol === 'viewer') { showToast('Sin permisos', 'error'); return; }
  editingClienteId = id;
  const db = getDB();
  const c = id ? (db.clientes || []).find(x => x.id === id) : null;

  document.getElementById('modalClienteTitle').textContent = c ? 'Editar Cliente' : 'Nuevo Cliente';
  document.getElementById('cliId').value = c?.id || '';
  document.getElementById('cliNombre').value = c?.nombre || '';
  document.getElementById('cliCuit').value = c?.cuit || '';
  document.getElementById('cliEmail').value = c?.email || '';
  document.getElementById('cliTelefono').value = c?.telefono || '';
  document.getElementById('cliEmpresa').value = c?.empresa || '';
  document.getElementById('cliIva').value = c?.condIva || 'Consumidor Final';
  document.getElementById('cliDireccion').value = c?.direccion || '';
  openModal('modalCliente');
}

function saveCliente() {
  const nombre = document.getElementById('cliNombre').value.trim();
  if (!nombre) { showToast('El nombre es obligatorio', 'error'); return; }

  const data = {
    nombre,
    cuit: document.getElementById('cliCuit').value.trim(),
    email: document.getElementById('cliEmail').value.trim(),
    telefono: document.getElementById('cliTelefono').value.trim(),
    empresa: document.getElementById('cliEmpresa').value.trim(),
    condIva: document.getElementById('cliIva').value,
    direccion: document.getElementById('cliDireccion').value.trim()
  };

  const db = getDB();
  if (editingClienteId) {
    const idx = (db.clientes || []).findIndex(c => c.id === editingClienteId);
    if (idx !== -1) db.clientes[idx] = { ...db.clientes[idx], ...data };
  } else {
    if (!db.clientes) db.clientes = [];
    if (!db.nextId) db.nextId = {};
    const newId = db.nextId.clientes || 1;
    db.clientes.push({ id: newId, ...data });
    db.nextId.clientes = newId + 1;
  }

  saveDB(db);
  closeModal('modalCliente');
  renderClientes();
  showToast(editingClienteId ? 'Cliente actualizado ✓' : 'Cliente creado ✓', 'success');
}

function deleteCliente(id) {
  if (!confirm('¿Eliminar este cliente?')) return;
  const db = getDB();
  db.clientes = (db.clientes || []).filter(c => c.id !== id);
  saveDB(db);
  renderClientes();
  showToast('Cliente eliminado', 'info');
}

// =====================================================
// USUARIOS
// =====================================================
function renderUsuarios() {
  if (currentUser.rol !== 'admin') return;
  const db = getDB();

  const tbody = document.getElementById('usuariosBody');
  tbody.innerHTML = (db.usuarios || []).map(u => `<tr>
    <td class="td-primary">${u.username}</td>
    <td>${u.nombre || '—'}</td>
    <td><span class="badge badge-info">${rolLabel(u.rol)}</span></td>
    <td>${u.estado === 'activo' ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-danger">Inactivo</span>'}</td>
    <td>
      <button class="btn-icon" onclick="openUsuarioModal(${u.id})" title="Editar">✏️</button>
      ${u.id !== currentUser.id ? `<button class="btn-icon danger" onclick="deleteUsuario(${u.id})" title="Eliminar">🗑️</button>` : ''}
    </td>
  </tr>`).join('');
}

function openUsuarioModal(id = null) {
  if (currentUser.rol !== 'admin') { showToast('Sin permisos', 'error'); return; }
  editingUsuarioId = id;
  const db = getDB();
  const u = id ? (db.usuarios || []).find(x => x.id === id) : null;

  document.getElementById('modalUsuarioTitle').textContent = u ? 'Editar Usuario' : 'Nuevo Usuario';
  document.getElementById('usuId').value = u?.id || '';
  document.getElementById('usuUsername').value = u?.username || '';
  document.getElementById('usuNombre').value = u?.nombre || '';
  document.getElementById('usuPassword').value = '';
  document.getElementById('usuPasswordConf').value = '';
  document.getElementById('usuRol').value = u?.rol || 'vendedor';
  document.getElementById('usuEstado').value = u?.estado || 'activo';

  // Si editando, la contraseña es opcional
  document.getElementById('passRequired').textContent = u ? '(opcional)' : '*';
  openModal('modalUsuario');
}

function saveUsuario() {
  const username = document.getElementById('usuUsername').value.trim();
  const nombre = document.getElementById('usuNombre').value.trim();
  const pass = document.getElementById('usuPassword').value;
  const passConf = document.getElementById('usuPasswordConf').value;

  if (!username) { showToast('El usuario es obligatorio', 'error'); return; }
  if (!editingUsuarioId && !pass) { showToast('La contraseña es obligatoria', 'error'); return; }
  if (pass && pass !== passConf) { showToast('Las contraseñas no coinciden', 'error'); return; }
  if (pass && pass.length < 4) { showToast('La contraseña debe tener al menos 4 caracteres', 'error'); return; }

  const db = getDB();

  // Verificar username duplicado
  const exists = (db.usuarios || []).find(u => u.username === username && u.id !== editingUsuarioId);
  if (exists) { showToast('El nombre de usuario ya existe', 'error'); return; }

  const data = {
    username,
    nombre,
    rol: document.getElementById('usuRol').value,
    estado: document.getElementById('usuEstado').value,
  };
  if (pass) data.password = btoa(pass);

  if (editingUsuarioId) {
    const idx = (db.usuarios || []).findIndex(u => u.id === editingUsuarioId);
    if (idx !== -1) db.usuarios[idx] = { ...db.usuarios[idx], ...data };
  } else {
    if (!db.usuarios) db.usuarios = [];
    if (!db.nextId) db.nextId = {};
    const newId = db.nextId.usuarios || 1;
    db.usuarios.push({ id: newId, ...data });
    db.nextId.usuarios = newId + 1;
  }

  saveDB(db);
  closeModal('modalUsuario');
  renderUsuarios();
  showToast(editingUsuarioId ? 'Usuario actualizado ✓' : 'Usuario creado ✓', 'success');
}

function deleteUsuario(id) {
  if (id === currentUser.id) { showToast('No podés eliminar tu propio usuario', 'error'); return; }
  if (!confirm('¿Eliminar este usuario?')) return;
  const db = getDB();
  db.usuarios = (db.usuarios || []).filter(u => u.id !== id);
  saveDB(db);
  renderUsuarios();
  showToast('Usuario eliminado', 'info');
}

// =====================================================
// MODAL HELPERS
// =====================================================
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  document.body.style.overflow = '';
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', function (e) {
    if (e.target === this) closeModal(this.id);
  });
});

// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => closeModal(m.id));
  }
});

// =====================================================
// TOAST
// =====================================================
function showToast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
  document.getElementById('toastContainer').appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}

// =====================================================
// DATE HELPERS
// =====================================================
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function addDays(dateStr, days) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setDate(d.getDate() + parseInt(days));
  return d.toISOString().split('T')[0];
}

// =====================================================
// ADD SHAKE ANIMATION
// =====================================================
const style = document.createElement('style');
style.textContent = `
@keyframes shake {
  0%,100%{transform:translateX(0)}
  20%{transform:translateX(-10px)}
  40%{transform:translateX(10px)}
  60%{transform:translateX(-8px)}
  80%{transform:translateX(8px)}
}`;
document.head.appendChild(style);

// =====================================================
// INIT
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  // 1. Inicializar DB local inmediatamente (evita pantalla blanca)
  initDB();

  // 2. Intentar sincronizar en SEGUNDO PLANO (no bloquea el inicio)
  syncFromCloud();

  // Restaurar sesión si existe
  const savedUser = sessionStorage.getItem('presupuestopro_user');
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      const db = getDB();
      const found = (db.usuarios || []).find(u => u.id === user.id && u.estado === 'activo');
      if (found) {
        currentUser = found;
        enterApp();
        return;
      }
    } catch { }
  }

  // Mostrar login
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('loginScreen').classList.add('active');
  document.getElementById('loginUser').focus();
});
