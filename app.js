// ============================================================
// GU LEGAL - Lógica Frontend
// ============================================================

const API_URL = 'PEGA_AQUI_TU_URL_EXEC'; // ⚠️ MISMA URL /exec que ya tenías
const LOGO = 'https://i.postimg.cc/PJgdzhf4/Chat-GPT-Image-7-sept-2026-22-19-47.png';

let tokenSesion = null;
let nombreActual = null;
let correoRecuperacion = null;
let eventosCache = [];

// ---------- UTILIDADES ----------
function llamarGU(accion, params) {
  return fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: accion, params: params || [] })
  }).then(function(res) { return res.json(); });
}

let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function() { t.classList.remove('visible'); }, 2600);
}

function escapar(texto) {
  const d = document.createElement('div');
  d.textContent = texto == null ? '' : String(texto);
  return d.innerHTML;
}

function parseFechaISO(iso) {
  const p = String(iso).split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

function etiquetaFecha(iso, hoyISO) {
  if (iso === hoyISO) return 'Hoy';
  if (iso === sumaDiasISO(hoyISO, 1)) return 'Mañana';
  const f = parseFechaISO(iso);
  return f.toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' });
}

function sumaDiasISO(iso, dias) {
  const f = parseFechaISO(iso);
  f.setDate(f.getDate() + dias);
  const y = f.getFullYear();
  const m = String(f.getMonth() + 1).padStart(2, '0');
  const d = String(f.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

const COLORES_TIPO = {
  'Audiencia': '#C0392B',
  'Plazo judicial': '#D4AF37',
  'Reunión': '#2563EB',
  'Diligencia': '#7C3AED',
  'Tarea': '#2E7D32',
  'Cobro': '#0E7490',
  'Otro': '#7A8699'
};

// ---------- ARRANQUE ----------
window.addEventListener('load', function() {
  setTimeout(function() {
    document.getElementById('pantallaSplash').classList.add('oculto');
    const tokenGuardado = localStorage.getItem('gu_token');
    if (tokenGuardado) {
      llamarGU('verificarSesion', [tokenGuardado]).then(function(r) {
        if (r && r.valido) {
          tokenSesion = tokenGuardado;
          if (r.debeCambiarPassword) { mostrarCambioPass(); }
          else { entrarApp(r.nombre, r.rol); }
        } else {
          localStorage.removeItem('gu_token');
          mostrarLogin();
        }
      }).catch(function() { mostrarLogin(); });
    } else {
      mostrarLogin();
    }
  }, 2500);
});

function mostrarLogin() {
  document.getElementById('pantallaLogin').classList.add('visible');
}

function mostrarCambioPass() {
  document.getElementById('pantallaLogin').classList.remove('visible');
  document.getElementById('pantallaCambioPass').classList.add('visible');
}

// ---------- LOGIN ----------
document.getElementById('formLogin').addEventListener('submit', function() {
  const correo = document.getElementById('inputCorreo').value.trim();
  const password = document.getElementById('inputPassword').value;
  const btn = document.getElementById('btnIngresar');
  const err = document.getElementById('msgErrorLogin');
  err.style.display = 'none';

  if (!correo || !password) {
    err.textContent = 'Ingresa tu correo y contraseña';
    err.style.display = 'block';
    return;
  }

  btn.disabled = true; btn.textContent = 'Ingresando...';
  llamarGU('loginUsuario', [correo, password]).then(function(res) {
    btn.disabled = false; btn.textContent = 'Ingresar';
    if (!res.success) { err.textContent = res.mensaje; err.style.display = 'block'; return; }
    tokenSesion = res.token;
    nombreActual = res.nombre;
    localStorage.setItem('gu_token', res.token);
    if (res.debeCambiarPassword) { mostrarCambioPass(); }
    else { entrarApp(nombreActual, res.rol); }
  }).catch(function(e) {
    btn.disabled = false; btn.textContent = 'Ingresar';
    err.textContent = 'Error de conexión: ' + e.message; err.style.display = 'block';
  });
});

document.getElementById('toggleOjoLogin').addEventListener('click', function() {
  const input = document.getElementById('inputPassword');
  input.type = (input.type === 'password') ? 'text' : 'password';
});

// ---------- CAMBIO OBLIGATORIO ----------
document.getElementById('formCambioPass').addEventListener('submit', function() {
  const nueva = document.getElementById('inputNuevaPass').value;
  const confirmar = document.getElementById('inputConfirmarPass').value;
  const btn = document.getElementById('btnGuardarPass');
  const err = document.getElementById('msgErrorCambio');
  err.style.display = 'none';

  if (nueva.length < 6) { err.textContent = 'La contraseña debe tener al menos 6 caracteres'; err.style.display = 'block'; return; }
  if (nueva !== confirmar) { err.textContent = 'Las contraseñas no coinciden'; err.style.display = 'block'; return; }

  btn.disabled = true; btn.textContent = 'Guardando...';
  llamarGU('cambiarPasswordObligatorio', [tokenSesion, nueva]).then(function(res) {
    if (!res.success) {
      btn.disabled = false; btn.textContent = 'Guardar contraseña';
      err.textContent = res.mensaje; err.style.display = 'block';
      return;
    }
    btn.textContent = 'Contraseña guardada ✓';
    document.getElementById('pantallaCambioPass').classList.remove('visible');
    entrarApp(nombreActual, null);
  }).catch(function(e) {
    btn.disabled = false; btn.textContent = 'Guardar contraseña';
    err.textContent = 'Error: ' + e.message; err.style.display = 'block';
  });
});

// ---------- ENTRAR A LA APP ----------
function entrarApp(nombre, rol) {
  document.getElementById('pantallaLogin').classList.remove('visible');
  document.getElementById('nombreBienvenida').textContent = nombre || 'Usuario';
  document.getElementById('pantallaBienvenida').style.display = 'flex';
  setTimeout(function() {
    document.getElementById('pantallaBienvenida').style.display = 'none';
    mostrarDashboard();
  }, 1800);
}

function mostrarDashboard() {
  document.getElementById('pantallaAgenda').style.display = 'none';
  document.getElementById('pantallaDashboard').style.display = 'flex';
  cargarDashboard();
}

function salir() {
  llamarGU('cerrarSesion', [tokenSesion]).finally(function() {
    localStorage.removeItem('gu_token');
    location.reload();
  });
}

// ---------- DASHBOARD ----------
function cargarDashboard() {
  const cont = document.getElementById('listaAgendaHoy');
  cont.innerHTML = '<div class="vacio">Cargando agenda...</div>';

  llamarGU('obtenerResumenDashboard', [tokenSesion]).then(function(r) {
    if (!r.success) { showToast(r.mensaje); return; }

    document.getElementById('nombreDash').textContent = r.nombre || 'Usuario';
    document.getElementById('rolDash').textContent = r.rol === 'Admin' ? '👑 Administradora' : (r.rol || '—');
    document.getElementById('dashAudiencias').textContent = r.audienciasHoy;
    document.getElementById('dashPlazos').textContent = r.plazosPorVencer;
    document.getElementById('dashCausas').textContent = r.causasActivas;

    const tarjetaTeDeben = document.getElementById('tarjetaTeDeben');
    if (r.teDeben === null || r.teDeben === undefined) {
      tarjetaTeDeben.style.display = 'none';
    } else {
      tarjetaTeDeben.style.display = 'block';
      document.getElementById('dashTeDeben').textContent = '$' + Number(r.teDeben).toFixed(2);
    }

    if (!r.eventosHoy || r.eventosHoy.length === 0) {
      cont.innerHTML = '<div class="vacio">⚖️ No tienes eventos para hoy.<br>¡Buen día para avanzar causas!</div>';
      return;
    }

    let html = '';
    r.eventosHoy.forEach(function(ev) {
      const color = COLORES_TIPO[ev.tipo] || COLORES_TIPO['Otro'];
      const hecha = ev.estado === 'Completada';
      html +=
        '<div class="item-evento ' + (hecha ? 'completada' : '') + '" style="border-left-color:' + color + ';">' +
          '<div class="info">' +
            '<div class="tipo" style="color:' + color + ';">' + escapar(ev.tipo) + '</div>' +
            '<div class="titulo-ev">' + escapar(ev.titulo) + '</div>' +
            '<div class="detalle-ev">' + (ev.lugar ? '📍 ' + escapar(ev.lugar) : '') + '</div>' +
          '</div>' +
          (ev.hora ? '<div class="hora-ev">' + escapar(ev.hora) + '</div>' : '') +
          '<button class="check-ev ' + (hecha ? 'hecho' : '') + '" onclick="toggleEvento(\'' + ev.idEvento + '\', \'' + (hecha ? 'Pendiente' : 'Completada') + '\')">✓</button>' +
        '</div>';
    });
    cont.innerHTML = html;
  }).catch(function(e) { showToast('Error de conexión'); });
}

function toggleEvento(idEvento, nuevoEstado) {
  llamarGU('cambiarEstadoEvento', [tokenSesion, idEvento, nuevoEstado]).then(function(r) {
    if (!r.success) { showToast(r.mensaje); return; }
    showToast(nuevoEstado === 'Completada' ? '✅ Completado' : '↩️ Marcado como pendiente');
    cargarDashboard();
  }).catch(function() { showToast('Error de conexión'); });
}

// ---------- AGENDA ----------
function abrirAgenda() {
  document.getElementById('pantallaDashboard').style.display = 'none';
  document.getElementById('pantallaAgenda').style.display = 'flex';
  cargarAgenda();
}

function volverDashboard() {
  document.getElementById('pantallaAgenda').style.display = 'none';
  mostrarDashboard();
}

function cargarAgenda() {
  const cont = document.getElementById('listaAgenda');
  cont.innerHTML = '<div class="vacio">Cargando eventos...</div>';

  llamarGU('obtenerEventos', [tokenSesion]).then(function(r) {
    if (!r.success) { cont.innerHTML = '<div class="vacio">' + escapar(r.mensaje) + '</div>'; return; }
    eventosCache = r.eventos || [];
    const hoy = r.hoy;

    if (eventosCache.length === 0) {
      cont.innerHTML = '<div class="vacio">📅 No hay eventos registrados.<br>Usa el botón <b>+</b> para crear el primero.</div>';
      return;
    }

    let html = '';
    let fechaActual = '';
    eventosCache.forEach(function(ev) {
      if (ev.fecha !== fechaActual) {
        fechaActual = ev.fecha;
        const esHoy = ev.fecha === hoy;
        html += '<div class="grupo-fecha ' + (esHoy ? 'hoy' : '') + '">' + etiquetaFecha(ev.fecha, hoy) + (esHoy ? ' ⭐' : '') + '</div>';
      }
      const color = COLORES_TIPO[ev.tipo] || COLORES_TIPO['Otro'];
      const hecha = ev.estado === 'Completada';
      html +=
        '<div class="item-evento ' + (hecha ? 'completada' : '') + '" style="border-left-color:' + color + ';">' +
          '<div class="info">' +
            '<div class="tipo" style="color:' + color + ';">' + escapar(ev.tipo) + ' · ' + escapar(ev.prioridad) + '</div>' +
            '<div class="titulo-ev">' + escapar(ev.titulo) + '</div>' +
            '<div class="detalle-ev">' +
              (ev.hora ? '🕐 ' + escapar(ev.hora) + ' ' : '') +
              (ev.lugar ? '📍 ' + escapar(ev.lugar) : '') +
            '</div>' +
          '</div>' +
          '<button class="check-ev ' + (hecha ? 'hecho' : '') + '" onclick="toggleEventoAgenda(\'' + ev.idEvento + '\', \'' + (hecha ? 'Pendiente' : 'Completada') + '\')">✓</button>' +
        '</div>';
    });
    cont.innerHTML = html;
  }).catch(function() { cont.innerHTML = '<div class="vacio">Error de conexión</div>'; });
}

function toggleEventoAgenda(idEvento, nuevoEstado) {
  llamarGU('cambiarEstadoEvento', [tokenSesion, idEvento, nuevoEstado]).then(function(r) {
    if (!r.success) { showToast(r.mensaje); return; }
    cargarAgenda();
  }).catch(function() { showToast('Error de conexión'); });
}

// ---------- BOTÓN + (PANEL) ----------
function abrirPanelPlus() {
  document.getElementById('overlayPlus').style.display = 'block';
  document.getElementById('panelPlus').classList.add('abierto');
}
function cerrarPanelPlus() {
  document.getElementById('overlayPlus').style.display = 'none';
  document.getElementById('panelPlus').classList.remove('abierto');
}
function opcionProximamente() {
  cerrarPanelPlus();
  showToast('🔒 Disponible en la próxima fase');
}
function opcionNuevoEvento() {
  cerrarPanelPlus();
  abrirModalEvento();
}

// ---------- MODAL NUEVO EVENTO ----------
function abrirModalEvento() {
  const hoyISO = new Date();
  const y = hoyISO.getFullYear();
  const m = String(hoyISO.getMonth() + 1).padStart(2, '0');
  const d = String(hoyISO.getDate()).padStart(2, '0');
  document.getElementById('inpFecha').value = y + '-' + m + '-' + d;
  document.getElementById('formEvento').reset();
  document.getElementById('inpFecha').value = y + '-' + m + '-' + d;
  document.getElementById('msgErrorEvento').style.display = 'none';
  document.getElementById('modalEvento').classList.add('abierto');
}
function cerrarModalEvento() {
  document.getElementById('modalEvento').classList.remove('abierto');
}

document.getElementById('formEvento').addEventListener('submit', function() {
  const err = document.getElementById('msgErrorEvento');
  const btn = document.getElementById('btnGuardarEvento');
  const datos = {
    tipo: document.getElementById('selTipo').value,
    titulo: document.getElementById('inpTitulo').value.trim(),
    fecha: document.getElementById('inpFecha').value,
    hora: document.getElementById('inpHora').value,
    lugar: document.getElementById('inpLugar').value.trim(),
    descripcion: document.getElementById('inpDescripcion').value.trim(),
    prioridad: document.getElementById('selPrioridad').value,
    responsable: document.getElementById('inpResponsable').value.trim()
  };
  err.style.display = 'none';

  if (!datos.titulo) { err.textContent = 'Escribe un título para el evento'; err.style.display = 'block'; return; }
  if (!datos.fecha) { err.textContent = 'Selecciona una fecha'; err.style.display = 'block'; return; }

  btn.disabled = true; btn.textContent = 'Guardando...';
  llamarGU('crearEvento', [tokenSesion, datos]).then(function(r) {
    btn.disabled = false; btn.textContent = 'Guardar evento';
    if (!r.success) { err.textContent = r.mensaje; err.style.display = 'block'; return; }
    cerrarModalEvento();
    showToast('✅ Evento creado');
    cargarAgenda();
  }).catch(function(e) {
    btn.disabled = false; btn.textContent = 'Guardar evento';
    err.textContent = 'Error: ' + e.message; err.style.display = 'block';
  });
});

// ---------- RECUPERACIÓN DE CONTRASEÑA ----------
function abrirRecuperar() {
  document.getElementById('pantallaLogin').classList.remove('visible');
  correoRecuperacion = null;
  recuperarPaso1();
  document.getElementById('pantallaRecuperar').classList.add('visible');
}

function recuperarPaso1() {
  document.getElementById('contenidoRecuperar').innerHTML =
    '<div class="titulo-marca">Recuperar acceso</div>' +
    '<div class="subtitulo-marca">Ingresa tu correo registrado</div>' +
    '<div class="msg-error" id="msgRec"></div>' +
    '<div class="campo"><label>Correo electrónico</label><input type="email" id="recCorreo"></div>' +
    '<button class="btn-primario" onclick="recPaso1()">Continuar</button>' +
    '<span class="link-secundario" onclick="volverLogin()">Volver al inicio de sesión</span>';
}

function recPaso1() {
  const correo = document.getElementById('recCorreo').value.trim();
  const err = document.getElementById('msgRec');
  if (!correo) { err.textContent = 'Ingresa tu correo'; err.style.display = 'block'; return; }
  correoRecuperacion = correo;
  llamarGU('iniciarRecuperacionPaso1', [correo]).then(recuperarPaso2);
}

function recuperarPaso2() {
  document.getElementById('contenidoRecuperar').innerHTML =
    '<div class="titulo-marca">Verificación</div>' +
    '<div class="subtitulo-marca">Por seguridad, confirma tu primer nombre</div>' +
    '<div class="msg-error" id="msgRec"></div>' +
    '<div class="campo"><label>Primer nombre</label><input type="text" id="recNombre" placeholder="Ej: Gina"></div>' +
    '<button class="btn-primario" id="btnRec2" onclick="recPaso2()">Enviar código</button>' +
    '<span class="link-secundario" onclick="volverLogin()">Volver al inicio de sesión</span>';
}

function recPaso2() {
  const nombre = document.getElementById('recNombre').value.trim();
  const err = document.getElementById('msgRec');
  const btn = document.getElementById('btnRec2');
  if (!nombre) { err.textContent = 'Ingresa tu primer nombre'; err.style.display = 'block'; return; }
  btn.disabled = true; btn.textContent = 'Enviando...';
  llamarGU('verificarNombreYEnviarCodigo', [correoRecuperacion, nombre]).then(function(res) {
    btn.disabled = false; btn.textContent = 'Enviar código';
    if (!res.success) { err.textContent = res.mensaje; err.style.display = 'block'; return; }
    recuperarPaso3(res.mensaje);
  }).catch(function(e) { err.textContent = 'Error: ' + e.message; err.style.display = 'block'; });
}

function recuperarPaso3(mensajeInfo) {
  document.getElementById('contenidoRecuperar').innerHTML =
    '<div class="titulo-marca">Código de verificación</div>' +
    '<div class="subtitulo-marca">Te enviamos un código a tu correo (revisa spam)</div>' +
    '<div class="msg-info" style="display:block;">' + (mensajeInfo || '') + '</div>' +
    '<div class="msg-error" id="msgRec"></div>' +
    '<div class="campo"><label>Código de 4 dígitos</label><input type="text" id="recCodigo" maxlength="4" style="text-align:center;letter-spacing:8px;font-size:20px;"></div>' +
    '<button class="btn-primario" onclick="recPaso3()">Verificar código</button>' +
    '<span class="link-secundario" onclick="recuperarPaso2()">Reenviar / corregir mis datos</span>';
}

function recPaso3() {
  const codigo = document.getElementById('recCodigo').value.trim();
  const err = document.getElementById('msgRec');
  if (!codigo) { err.textContent = 'Ingresa el código'; err.style.display = 'block'; return; }
  llamarGU('verificarCodigoRecuperacion', [correoRecuperacion, codigo]).then(function(res) {
    if (!res.success) { err.textContent = res.mensaje; err.style.display = 'block'; return; }
    recuperarPaso4();
  }).catch(function(e) { err.textContent = 'Error: ' + e.message; err.style.display = 'block'; });
}

function recuperarPaso4() {
  document.getElementById('contenidoRecuperar').innerHTML =
    '<div class="titulo-marca">Nueva contraseña</div>' +
    '<div class="subtitulo-marca">Define tu nueva contraseña de acceso</div>' +
    '<div class="msg-error" id="msgRec"></div>' +
    '<div class="msg-exito" id="msgExitoRec"></div>' +
    '<div class="campo"><label>Nueva contraseña</label><input type="password" id="recPass1"></div>' +
    '<div class="campo"><label>Confirma tu contraseña</label><input type="password" id="recPass2"></div>' +
    '<button class="btn-primario" id="btnRec4" onclick="recPaso4()">Guardar contraseña</button>' +
    '<span class="link-secundario" onclick="volverLogin()">Volver al inicio de sesión</span>';
}

function recPaso4() {
  const p1 = document.getElementById('recPass1').value;
  const p2 = document.getElementById('recPass2').value;
  const err = document.getElementById('msgRec');
  const btn = document.getElementById('btnRec4');
  if (p1.length < 6) { err.textContent = 'La contraseña debe tener al menos 6 caracteres'; err.style.display = 'block'; return; }
  if (p1 !== p2) { err.textContent = 'Las contraseñas no coinciden'; err.style.display = 'block'; return; }
  btn.disabled = true; btn.textContent = 'Guardando...';
  llamarGU('aplicarNuevaPasswordRecuperacion', [correoRecuperacion, codigoActualRecuperacion(), p1])
    .then(function(res) {
      if (!res.success) { btn.disabled = false; btn.textContent = 'Guardar contraseña'; err.textContent = res.mensaje; err.style.display = 'block'; return; }
      err.style.display = 'none';
      const ok = document.getElementById('msgExitoRec');
      ok.textContent = '✅ ' + res.mensaje + ' Ya puedes iniciar sesión.';
      ok.style.display = 'block';
      btn.style.display = 'none';
    })
    .catch(function(e) {
      btn.disabled = false; btn.textContent = 'Guardar contraseña';
      err.textContent = 'Error: ' + e.message; err.style.display = 'block';
    });
}

function codigoActualRecuperacion() {
  const el = document.getElementById('recCodigo');
  return el ? el.value.trim() : '';
}

function volverLogin() {
  document.getElementById('pantallaRecuperar').classList.remove('visible');
  mostrarLogin();
}
