// =====================================================================
// LECTURA DE DATOS
// =====================================================================

// ─── EXISTENTES ──────────────────────────────────────────────────────

function handleGetDashboard(userAuth) {
  var solicitudes  = getSheetData(CONFIG.SHEETS.SOLICITUDES);
  var servicios    = getSheetData(CONFIG.SHEETS.SERVICIOS);
  var companiesMap = getCompaniesMap();

  if (userAuth.role === 'viajero' || userAuth.role === 'admin') {
    var empUserIds = String(userAuth.empresa || '').toLowerCase().trim().split(',').map(function(s){return s.trim();});
    solicitudes = solicitudes.filter(function(row) {
      var empId = String(row[3] || '').trim().toLowerCase();
      return empUserIds.indexOf(empId) !== -1;
    });
  }

  var totalAutorizado = 0;
  if (userAuth.role === 'admin' || userAuth.role === 'super') {
    solicitudes.forEach(function(row) {
      if (row[4] === 'Autorizado' || row[4] === 'Comprado') {
        totalAutorizado += Number(row[6] || 0);
      }
    });
  }

  solicitudes = solicitudes.map(function(row) {
    var r = row.slice();
    var empId = String(r[3] || '').trim();
    if (companiesMap[empId]) r[3] = companiesMap[empId];
    r[10] = empId;
    return r;
  });

  var solicitudesMap = {};
  solicitudes.forEach(function(s) { solicitudesMap[s[0]] = true; });
  var serviciosResumen = servicios.filter(function(s) { return solicitudesMap[s[0]]; });

  // Construir resumen de pasajeros por ticket: { "TK-123": ["Nombre1", "Nombre2"] }
  var pasajeros = getSheetData(CONFIG.SHEETS.PASAJEROS);
  var pasajerosResumen = {};
  pasajeros.forEach(function(p) {
    var tk = String(p[0] || '');
    if (!solicitudesMap[tk]) return;
    if (!pasajerosResumen[tk]) pasajerosResumen[tk] = [];
    var nombre = String(p[1] || '').trim();
    if (nombre) pasajerosResumen[tk].push(nombre);
  });

  return jsonResponse("success", {
    solicitudes:      solicitudes,
    serviciosResumen: serviciosResumen,
    pasajerosResumen: pasajerosResumen,
    totalAutorizado:  totalAutorizado
  });
}

function handleGetTicketDetails(userAuth, data) {
  var idTicket   = data.idTicket;
  var allTickets = getSheetData(CONFIG.SHEETS.SOLICITUDES);
  var ticket     = null;
  for (var i = 0; i < allTickets.length; i++) {
    if (String(allTickets[i][0]) === String(idTicket)) { ticket = allTickets[i]; break; }
  }
  if (!ticket) return jsonResponse("error", "Ticket no encontrado.");

  var companiesMap = getCompaniesMap();
  var empId     = String(ticket[3] || '').trim();
  var empNombre = companiesMap[empId] ? companiesMap[empId] : empId;

  if (userAuth.role === 'viajero' || userAuth.role === 'admin') {
    var empUser     = String(userAuth.empresa || '').toLowerCase().trim();
    var matchId     = empId.toLowerCase()     === empUser;
    var matchNombre = empNombre.toLowerCase() === empUser;
    if (!matchId && !matchNombre) return jsonResponse("error", "Acceso denegado.");
  }

  var ticketEnr = ticket.slice();
  ticketEnr[3]  = empNombre;

  var servicios = getSheetData(CONFIG.SHEETS.SERVICIOS).filter(function(s) {
    return String(s[0]) === String(idTicket);
  });
  var pasajeros = getSheetData(CONFIG.SHEETS.PASAJEROS).filter(function(p) {
    return String(p[0]) === String(idTicket);
  });
  var opciones = getSheetData(CONFIG.SHEETS.OPCIONES).filter(function(o) {
    return String(o[0]) === String(idTicket);
  });

  var politica = getPoliticaEmpresa(empId);

  return jsonResponse("success", {
    ticket:    ticketEnr,
    servicios: servicios,
    pasajeros: pasajeros,
    opciones:  opciones,
    politica:  politica
  });
}

function handleGetFinanzas(userAuth) {
  if (userAuth.role !== 'admin' && userAuth.role !== 'super' && userAuth.role !== 'indipris') {
    return jsonResponse("error", "No tienes permisos.");
  }

  var companiesMap = getCompaniesMap();

  var solicitudes = getSheetData(CONFIG.SHEETS.SOLICITUDES).filter(function(s) {
    return s[4] === 'Autorizado' || s[4] === 'Comprado';
  });

  if (userAuth.role === 'admin') {
    var empUser = String(userAuth.empresa || '').toLowerCase().trim();
    solicitudes = solicitudes.filter(function(s) {
      var empId = String(s[3] || '').trim();
      var empNombre = companiesMap[empId] ? companiesMap[empId].toLowerCase().trim() : '';
      return empId.toLowerCase() === empUser || empNombre === empUser;
    });
  }

  // Resolver nombres de empresa y guardar empresaId en posición 10
  solicitudes = solicitudes.map(function(row) {
    var r = row.slice();
    var empId = String(r[3] || '').trim();
    r[10] = empId;
    if (companiesMap[empId]) r[3] = companiesMap[empId];
    return r;
  });

  var solicitudesMap = {};
  solicitudes.forEach(function(s) { solicitudesMap[s[0]] = true; });
  var opciones = getSheetData(CONFIG.SHEETS.OPCIONES).filter(function(o) {
    return solicitudesMap[o[0]] && (o[6] === 'Autorizada' || o[6] === 'Comprado' || o[6] === 'Extra');
  });

  return jsonResponse("success", { solicitudes: solicitudes, opciones: opciones });
}

function handleGetUsuarios(userAuth) {
  if (userAuth.role !== 'super') return jsonResponse("error", "No tienes permisos.");

  var companiesMap = getCompaniesMap();
  var usuarios = getSheetData(CONFIG.SHEETS.USUARIOS);

  // Resolver nombres de empresa (u[3] = CSV de IDs) y agregar en u[9]
  usuarios = usuarios.map(function(u) {
    var r = u.slice();
    var empCSV = String(r[3] || '').trim();
    if (empCSV) {
      var nombres = empCSV.split(',').map(function(id) {
        var idTrim = id.trim();
        return companiesMap[idTrim] || idTrim;
      });
      r[9] = nombres.join(', ');
    } else {
      r[9] = '';
    }
    r[10] = String(r[6] || '').toLowerCase().trim() === 'vacaciones';
    return r;
  });

  return jsonResponse("success", usuarios);
}

function handleGetContactosNotificacion(userAuth, data) {
  var empresa = data.empresaTicket || data.empresaId || '';
  var empLow  = String(empresa || '').toLowerCase().trim();
  var evento  = String(data.evento || '').toUpperCase();
  var users   = getSheetData(CONFIG.SHEETS.USUARIOS);

  // Verificar si hay config de notificaciones para esta empresa/evento
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetNotif = ss.getSheetByName('Notificaciones');
  var notifConfig = {};
  if (sheetNotif) {
    var nRows = sheetNotif.getDataRange().getValues();
    for (var ni = 1; ni < nRows.length; ni++) {
      var nEmpId = String(nRows[ni][0] || '').trim().toLowerCase();
      if (nEmpId === empLow) {
        var nUser = String(nRows[ni][1] || '').trim();
        if (!notifConfig[nUser]) notifConfig[nUser] = {};
        notifConfig[nUser].CREACION   = nRows[ni][2] === true || nRows[ni][2] === 'TRUE' || nRows[ni][2] === 1;
        notifConfig[nUser].AUTORIZADO = nRows[ni][3] === true || nRows[ni][3] === 'TRUE' || nRows[ni][3] === 1;
        notifConfig[nUser].RECHAZADO  = nRows[ni][4] === true || nRows[ni][4] === 'TRUE' || nRows[ni][4] === 1;
        notifConfig[nUser].CANCELADO  = nRows[ni][5] === true || nRows[ni][5] === 'TRUE' || nRows[ni][5] === 1;
      }
    }
  }

  var hasConfig = Object.keys(notifConfig).length > 0;

  var admins = [];
  var indipris = [];

  users.forEach(function(u) {
    var nombre = String(u[0] || '').trim();
    var rol    = String(u[2] || '').trim();
    var empCSV = String(u[3] || '').toLowerCase().trim();
    var tel    = String(u[5] || '').trim();
    if (!tel) return;

    if (rol === 'admin' && empCSV === empLow) {
      admins.push({ nombre: nombre, telefono: tel });
    }

    if (rol === 'indipris' || rol === 'super') {
      if (hasConfig) {
        // Solo notificar si el usuario tiene el evento habilitado para esta empresa
        if (notifConfig[nombre] && notifConfig[nombre][evento]) {
          indipris.push({ nombre: nombre, telefono: tel });
        }
      } else {
        // Sin config → fallback: notificar a todos los indipris/super
        indipris.push({ nombre: nombre, telefono: tel });
      }
    }
  });

  return jsonResponse("success", {
    admins:   admins.map(function(a) { return a.telefono; }),
    indipris: indipris.map(function(i) { return i.telefono; }),
    adminContactos:   admins,
    indiprisContactos: indipris
  });
}

function handleGetCompanies(userAuth) {
  var lista = [];
  var map   = getCompaniesMap();
  var keys  = Object.keys(map);
  for (var i = 0; i < keys.length; i++) {
    lista.push({ id: keys[i], nombre: map[keys[i]] });
  }
  lista.sort(function(a, b) { return a.nombre.localeCompare(b.nombre); });
  return jsonResponse("success", lista);
}


// ─── ACTUALIZADA: handleGetCatalogos (ahora incluye eventos) ─────────

function handleGetCatalogos(userAuth) {
  var solicitudes = getSheetData(CONFIG.SHEETS.SOLICITUDES);
  var pasajeros   = getSheetData(CONFIG.SHEETS.PASAJEROS);

  var ticketEmpresa = {};
  solicitudes.forEach(function(s) {
    ticketEmpresa[s[0]] = String(s[3] || '').toLowerCase().trim();
  });

  var userEmp = String(userAuth.empresa || '').toLowerCase().trim();
  var isViajeroOrAdmin = (userAuth.role === 'viajero' || userAuth.role === 'admin');

  var vistos = {};
  var paxsFinales = [];

  pasajeros.forEach(function(p) {
    var idTicket  = p[0];
    var empTicket = ticketEmpresa[idTicket] || '';
    if (isViajeroOrAdmin && empTicket !== userEmp) return;

    var n = String(p[1] || '').trim();
    if (n && !vistos[n]) {
      vistos[n] = true;
      paxsFinales.push({
        nombre:     n,
        nacimiento: p[2] || '',
        asiento:    p[3] || '',
        equipaje:   p[4] || ''
      });
    }
  });

  // ── Eventos filtrados por empresa del usuario ──
  // Obtener IDs de empresa del usuario
  var userEmpIds = [];
  if (userAuth.empresa) {
    userEmpIds = String(userAuth.empresa).split(',').map(function(s) { return s.trim().toLowerCase(); });
  }
  var isSuperOrIndipris = (userAuth.role === 'super' || userAuth.role === 'indipris');

  var eventos = [];
  var evtVistos = {};
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetEventos = ss.getSheetByName('Eventos');
    if (sheetEventos) {
      var evtRows = sheetEventos.getDataRange().getValues();
      for (var ei = 1; ei < evtRows.length; ei++) {
        var evNombre  = String(evtRows[ei][0] || '').trim();
        var evEmpresa = String(evtRows[ei][1] || '').trim().toLowerCase();
        if (!evNombre || evtVistos[evNombre]) continue;
        // Super e indipris ven todos, otros solo los de su empresa
        if (!isSuperOrIndipris && evEmpresa && userEmpIds.indexOf(evEmpresa) === -1) continue;
        evtVistos[evNombre] = true;
        eventos.push(evNombre);
      }
    }
  } catch (e) { /* hoja no existe aún */ }

  // También extraer eventos de tickets visibles para este usuario
  solicitudes.forEach(function(s) {
    var ev = String(s[9] || '').trim();
    if (!ev || evtVistos[ev]) return;
    // Filtrar por empresa si no es super/indipris
    if (!isSuperOrIndipris) {
      var ticketEmp = String(s[3] || '').trim().toLowerCase();
      if (userEmpIds.indexOf(ticketEmp) === -1) return;
    }
    evtVistos[ev] = true;
    eventos.push(ev);
  });

  eventos.sort();

  return jsonResponse("success", {
    pasajeros: paxsFinales,
    eventos:   eventos
  });
}


// ─── NUEVAS ──────────────────────────────────────────────────────────

// Detalle de un pasajero por nombre (autocompletar formulario)
function handleGetPasajeroDetalle(userAuth, data) {
  var nombre = String(data.nombre || '').trim();
  if (!nombre) return jsonResponse("error", "Nombre requerido.");

  var pasajeros  = getSheetData(CONFIG.SHEETS.PASAJEROS);
  var encontrado = null;

  for (var i = pasajeros.length - 1; i >= 0; i--) {
    if (String(pasajeros[i][1] || '').trim().toLowerCase() === nombre.toLowerCase()) {
      encontrado = pasajeros[i];
      break;
    }
  }

  if (!encontrado) return jsonResponse("error", "Pasajero no encontrado.");

  var asientoVuelo = String(encontrado[3] || '').trim();
  var matchAsiento = asientoVuelo.match(/Vuelo:\s*(\w+)/i);
  if (matchAsiento) asientoVuelo = matchAsiento[1];

  return jsonResponse("success", {
    nombre:       String(encontrado[1] || ''),
    nacimiento:   encontrado[2] || '',
    asientoVuelo: asientoVuelo || 'Indiferente',
    equipaje:     String(encontrado[4] || '') || 'Solo Artículo Personal',
    linkID:       String(encontrado[5] || '')
  });
}


// Detalle de un usuario para el modal de edición
function handleGetUsuarioDetalle(userAuth, data) {
  if (userAuth.role !== 'super') return jsonResponse("error", "Sin permisos.");

  var login = String(data.usuarioLogin || '').trim().toLowerCase();
  if (!login) return jsonResponse("error", "Usuario requerido.");

  var usuarios = getSheetData(CONFIG.SHEETS.USUARIOS);
  var user = null;

  for (var i = 0; i < usuarios.length; i++) {
    if (String(usuarios[i][0] || '').toLowerCase().trim() === login) {
      user = usuarios[i];
      break;
    }
  }

  if (!user) return jsonResponse("error", "Usuario no encontrado.");

  var empresaStr = String(user[3] || '').trim();
  var empresaIds = empresaStr ? empresaStr.split(',').map(function(s) { return s.trim(); }) : [];

  return jsonResponse("success", {
    usuario:    user[0],
    role:       user[2] || 'viajero',
    empresaIds: empresaIds,
    email:      user[4] || '',
    telefono:   user[5] || '',
    vacaciones: String(user[6] || '').toLowerCase().trim() === 'vacaciones'
  });
}


// Métricas de desempeño por ejecutivo (hoja Logs_Estado)
function handleGetMetricasTiempos(userAuth, data) {
  if (userAuth.role !== 'super') return jsonResponse("error", "Sin permisos.");

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetLogs = ss.getSheetByName('Logs_Estado');

  if (!sheetLogs || sheetLogs.getLastRow() <= 1) {
    return jsonResponse("success", { sinDatos: true });
  }

  var logsData     = sheetLogs.getDataRange().getValues();
  var companiesMap = getCompaniesMap();
  var fechaDesde   = data.fechaDesde ? new Date(data.fechaDesde) : null;
  var fechaHasta   = data.fechaHasta ? new Date(data.fechaHasta + 'T23:59:59') : null;

  // Agrupar logs por ticket
  var ticketLogs = {};
  for (var i = 1; i < logsData.length; i++) {
    var row       = logsData[i];
    var idTicket  = String(row[0] || '').trim();
    var estado    = String(row[1] || '').trim();
    var timestamp = new Date(row[2]);
    var asignado  = String(row[5] || '').trim();

    if (!idTicket || isNaN(timestamp)) continue;
    if (fechaDesde && timestamp < fechaDesde) continue;
    if (fechaHasta && timestamp > fechaHasta) continue;

    if (!ticketLogs[idTicket]) {
      ticketLogs[idTicket] = { logs: [], asignadoA: asignado, empresaId: String(row[4] || '').trim() };
    }
    ticketLogs[idTicket].logs.push({ estado: estado, timestamp: timestamp });
    if (asignado) ticketLogs[idTicket].asignadoA = asignado;
  }

  var MS_MIN = 60000;

  // Calcular tiempos por ticket (en minutos)
  var ticketMetrics = {};
  var ticketIds = Object.keys(ticketLogs);

  for (var ti = 0; ti < ticketIds.length; ti++) {
    var tk   = ticketIds[ti];
    var info = ticketLogs[tk];
    var logs = info.logs.sort(function(a, b) { return a.timestamp - b.timestamp; });

    var tiempos = {};
    for (var li = 0; li < logs.length; li++) {
      if (!tiempos[logs[li].estado]) tiempos[logs[li].estado] = logs[li].timestamp;
    }

    var minsACotizar   = (tiempos.Pendiente && tiempos.Cotizado)   ? Math.round((tiempos.Cotizado - tiempos.Pendiente) / MS_MIN)   : null;
    var minsAAutorizar = (tiempos.Cotizado && tiempos.Autorizado)  ? Math.round((tiempos.Autorizado - tiempos.Cotizado) / MS_MIN)  : null;
    var minsAComprar   = (tiempos.Autorizado && tiempos.Comprado)  ? Math.round((tiempos.Comprado - tiempos.Autorizado) / MS_MIN)  : null;
    var minsTotal      = (tiempos.Pendiente && tiempos.Comprado)   ? Math.round((tiempos.Comprado - tiempos.Pendiente) / MS_MIN)   : null;

    var ultimoLog    = logs[logs.length - 1];
    var estadoActual = ultimoLog ? ultimoLog.estado : 'Pendiente';

    ticketMetrics[tk] = {
      idTicket: tk, ejecutivo: info.asignadoA || 'Sin asignar',
      empresaId: info.empresaId, empresaNombre: companiesMap[info.empresaId] || info.empresaId,
      estadoActual: estadoActual,
      minsACotizar: minsACotizar, minsAAutorizar: minsAAutorizar,
      minsAComprar: minsAComprar, minsTotal: minsTotal,
      ultimoTimestamp: ultimoLog ? ultimoLog.timestamp : null
    };
  }

  // Agrupar por ejecutivo
  var ejMap = {};
  var metricsKeys = Object.keys(ticketMetrics);
  for (var mi = 0; mi < metricsKeys.length; mi++) {
    var m  = ticketMetrics[metricsKeys[mi]];
    var ej = m.ejecutivo;
    if (!ejMap[ej]) {
      ejMap[ej] = {
        ejecutivo: ej, tickets: [], totalTickets: 0, completados: 0, enProceso: 0,
        sumACotizar: 0, cntACotizar: 0, sumAAutorizar: 0, cntAAutorizar: 0,
        sumAComprar: 0, cntAComprar: 0, sumTotal: 0, cntTotal: 0
      };
    }
    var e = ejMap[ej];
    e.tickets.push(m);
    e.totalTickets++;
    if (m.estadoActual === 'Comprado') e.completados++;
    else if (m.estadoActual !== 'Cancelado') e.enProceso++;

    if (m.minsACotizar !== null)   { e.sumACotizar   += m.minsACotizar;   e.cntACotizar++;   }
    if (m.minsAAutorizar !== null) { e.sumAAutorizar += m.minsAAutorizar; e.cntAAutorizar++; }
    if (m.minsAComprar !== null)   { e.sumAComprar   += m.minsAComprar;   e.cntAComprar++;   }
    if (m.minsTotal !== null)      { e.sumTotal      += m.minsTotal;      e.cntTotal++;      }
  }

  var ejecutivos = [];
  var ejKeys = Object.keys(ejMap);
  for (var ei = 0; ei < ejKeys.length; ei++) {
    var ev = ejMap[ejKeys[ei]];
    ejecutivos.push({
      ejecutivo: ev.ejecutivo, totalTickets: ev.totalTickets, completados: ev.completados, enProceso: ev.enProceso,
      tickets: ev.tickets,
      promMinsACotizar:   ev.cntACotizar   > 0 ? Math.round(ev.sumACotizar   / ev.cntACotizar)   : null,
      promMinsAAutorizar: ev.cntAAutorizar > 0 ? Math.round(ev.sumAAutorizar / ev.cntAAutorizar) : null,
      promMinsAComprar:   ev.cntAComprar   > 0 ? Math.round(ev.sumAComprar   / ev.cntAComprar)   : null,
      promMinsTotal:      ev.cntTotal      > 0 ? Math.round(ev.sumTotal      / ev.cntTotal)      : null
    });
  }

  ejecutivos.sort(function(a, b) { return b.totalTickets - a.totalTickets; });

  // Tickets stale (sin movimiento) — umbrales en minutos
  var now      = new Date();
  var stale    = [];
  var umbrales = { Pendiente: 2*1440, Cotizado: 5*1440, Autorizado: 3*1440 }; // días * 1440 min

  for (var si = 0; si < metricsKeys.length; si++) {
    var mt     = ticketMetrics[metricsKeys[si]];
    var umbral = umbrales[mt.estadoActual];
    if (!umbral || !mt.ultimoTimestamp) continue;

    var minsSinMov = Math.round((now - mt.ultimoTimestamp) / MS_MIN);
    if (minsSinMov > umbral) {
      stale.push({
        idTicket: mt.idTicket, empresaNombre: mt.empresaNombre, asignadoA: mt.ejecutivo,
        estadoActual: mt.estadoActual, minsSinMovimiento: minsSinMov, umbralMins: umbral
      });
    }
  }

  stale.sort(function(a, b) { return b.minsSinMovimiento - a.minsSinMovimiento; });

  return jsonResponse("success", { ejecutivos: ejecutivos, stale: stale, sinDatos: false });
}


// Configuración de notificaciones por empresa
function handleGetNotificaciones(userAuth, data) {
  if (userAuth.role !== 'super') return jsonResponse("error", "Sin permisos.");

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetNotif = ss.getSheetByName('Notificaciones');

  if (!sheetNotif) {
    sheetNotif = ss.insertSheet('Notificaciones');
    sheetNotif.appendRow(['EmpresaId', 'EjecutivoUsername', 'CREACION', 'AUTORIZADO', 'RECHAZADO', 'CANCELADO']);
  }

  var notifRows    = sheetNotif.getDataRange().getValues();
  var companiesMap = getCompaniesMap();

  // Ejecutivos disponibles (indipris y super)
  var usuarios   = getSheetData(CONFIG.SHEETS.USUARIOS);
  var ejecutivos = [];
  for (var ui = 0; ui < usuarios.length; ui++) {
    var rol = String(usuarios[ui][2] || '').trim();
    if (rol === 'indipris' || rol === 'super') {
      ejecutivos.push({ username: usuarios[ui][0], email: usuarios[ui][4] || '', telefono: usuarios[ui][5] || '' });
    }
  }

  // Agrupar notificaciones por empresa
  var empNotifs = {};
  for (var i = 1; i < notifRows.length; i++) {
    var row   = notifRows[i];
    var empId = String(row[0] || '').trim();
    if (!empId) continue;
    if (!empNotifs[empId]) empNotifs[empId] = [];
    empNotifs[empId].push({
      rowIndex:          i + 1,
      ejecutivoUsername: String(row[1] || '').trim(),
      CREACION:   row[2] === true || row[2] === 'TRUE' || row[2] === 1,
      AUTORIZADO: row[3] === true || row[3] === 'TRUE' || row[3] === 1,
      RECHAZADO:  row[4] === true || row[4] === 'TRUE' || row[4] === 1,
      CANCELADO:  row[5] === true || row[5] === 'TRUE' || row[5] === 1
    });
  }

  // Solo mostrar empresas que tienen al menos un ticket O ya tienen config de notificaciones
  var solicitudes = getSheetData(CONFIG.SHEETS.SOLICITUDES);
  var empresasConTickets = {};
  for (var si = 0; si < solicitudes.length; si++) {
    var empIdSol = String(solicitudes[si][3] || '').trim();
    if (empIdSol) empresasConTickets[empIdSol] = true;
  }

  var empresas = [];
  var compKeys = Object.keys(companiesMap);
  for (var ci = 0; ci < compKeys.length; ci++) {
    var cid = compKeys[ci];
    var ejList = empNotifs[cid] || [];
    // Solo incluir si tiene tickets o ya tiene configuración de notificaciones
    if (!empresasConTickets[cid] && ejList.length === 0) continue;
    empresas.push({ empresaId: cid, empresaNombre: companiesMap[cid], sinConfig: ejList.length === 0, ejecutivos: ejList });
  }

  empresas.sort(function(a, b) { return a.empresaNombre.localeCompare(b.empresaNombre); });

  // Lista completa de empresas para el botón "agregar empresa" manual
  var todasEmpresas = [];
  for (var ti = 0; ti < compKeys.length; ti++) {
    todasEmpresas.push({ id: compKeys[ti], nombre: companiesMap[compKeys[ti]] });
  }
  todasEmpresas.sort(function(a, b) { return a.nombre.localeCompare(b.nombre); });

  return jsonResponse("success", { empresas: empresas, ejecutivos: ejecutivos, todasEmpresas: todasEmpresas });
}

// Obtener políticas de viaje por empresa
function handleGetPoliticas(userAuth, data) {
  if (userAuth.role !== 'super') return jsonResponse("error", "Sin permisos.");

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.POLITICAS);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEETS.POLITICAS);
    sheet.appendRow(['EmpresaId', 'MontoMaxSinAuth', 'FeeVuelo', 'FeeHotel', 'FeeBus', 'FeeOtro', 'Notas']);
  }

  var rows = sheet.getDataRange().getValues();
  var companiesMap = getCompaniesMap();
  var politicas = [];

  for (var i = 1; i < rows.length; i++) {
    var empId = String(rows[i][0] || '').trim();
    if (!empId) continue;
    politicas.push({
      empresaId:       empId,
      empresaNombre:   companiesMap[empId] || empId,
      montoMaxSinAuth: Number(rows[i][1] || 0),
      feeVuelo:        Number(rows[i][2] || 0),
      feeHotel:        Number(rows[i][3] || 0),
      feeBus:          Number(rows[i][4] || 0),
      feeOtro:         Number(rows[i][5] || 0),
      notas:           String(rows[i][6] || ''),
      rowIndex:        i + 1
    });
  }

  // Lista de empresas que no tienen política para el botón de agregar
  var conPolitica = {};
  politicas.forEach(function(p) { conPolitica[p.empresaId] = true; });
  var sinPolitica = [];
  var compKeys = Object.keys(companiesMap);
  for (var ci = 0; ci < compKeys.length; ci++) {
    if (!conPolitica[compKeys[ci]]) {
      sinPolitica.push({ id: compKeys[ci], nombre: companiesMap[compKeys[ci]] });
    }
  }
  sinPolitica.sort(function(a, b) { return a.nombre.localeCompare(b.nombre); });

  return jsonResponse("success", { politicas: politicas, sinPolitica: sinPolitica });
}

// Obtener política de una empresa específica (para validación interna)
function getPoliticaEmpresa(empresaId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.POLITICAS);
  if (!sheet) return null;

  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || '').trim() === String(empresaId).trim()) {
      return {
        montoMaxSinAuth: Number(rows[i][1] || 0),
        feeVuelo:        Number(rows[i][2] || 0),
        feeHotel:        Number(rows[i][3] || 0),
        feeBus:          Number(rows[i][4] || 0),
        feeOtro:         Number(rows[i][5] || 0),
        aplicaIVA:       rows[i][7] !== false && rows[i][7] !== 'FALSE' && rows[i][7] !== 'NO' && rows[i][7] !== 0
      };
    }
  }
  return null;
}

// Obtener logs de WhatsApp
function handleGetLogsWhatsapp(userAuth, data) {
  if (userAuth.role !== 'super') return jsonResponse("error", "Sin permisos.");

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.LOGS_WHATSAPP);

  if (!sheet) {
    return jsonResponse("success", { logs: [] });
  }

  var rows = sheet.getDataRange().getValues();
  var logs = [];

  // Leer de más reciente a más antiguo, máximo 500
  var inicio = Math.max(1, rows.length - 500);
  for (var i = rows.length - 1; i >= inicio; i--) {
    logs.push({
      timestamp:  rows[i][0],
      telefono:   String(rows[i][1] || ''),
      nombre:     String(rows[i][2] || ''),
      mensaje:    String(rows[i][3] || ''),
      evento:     String(rows[i][4] || ''),
      idTicket:   String(rows[i][5] || ''),
      enviadoPor: String(rows[i][6] || ''),
      status:     String(rows[i][7] || '')
    });
  }

  return jsonResponse("success", { logs: logs });
}

// Obtener configuración de WhatsApp (API key + templates)
function handleGetConfigWA(userAuth, data) {
  // Todos los roles que envían notificaciones necesitan acceso de lectura
  if (userAuth.role !== 'super' && userAuth.role !== 'indipris' && userAuth.role !== 'admin') {
    return jsonResponse("error", "Sin permisos.");
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEETS.CONFIG_WA);

  // Defaults si no existe la hoja
  var defaults = {
    apiKey: WHATSAPP_API_KEY || '',
    templates: {
      CREACION_admin:   '*Indipris Travel*\nHola, {solicitante} creo la solicitud *({idTicket})*.\nAsignada a: *{asignado}*\n{link}',
      CREACION_indy:    '*NUEVA SOLICITUD*\nTicket: {idTicket}\nDe: {solicitante} ({empresa})\nAsignada a: *{asignado}*\n{link}',
      COTIZADO_admin:   '*Indipris Travel*\nTus opciones estan listas para *{idTicket}*!\n{link}',
      COTIZADO_indy:    '*OPCIONES ENVIADAS*\nTicket {idTicket} cotizado para {empresa}.',
      AUTORIZADO_admin: '*Indipris Travel*\nAutorizaste el ticket *{idTicket}*.\n{link}',
      AUTORIZADO_indy:  '*AUTORIZADO*\n{empresa} autorizo {idTicket}. Proceder a compra.\n{link}',
      RECHAZADO_admin:  '*Indipris Travel*\nRechazaste opciones de *{idTicket}*.\nMotivo: "{motivo}"',
      RECHAZADO_indy:   '*RECHAZADO*\n{empresa} rechazo {idTicket}.\nMotivo: {motivo}\n{link}',
      COMPRADO_admin:   '*Indipris Travel*\nConfirmado! Servicios de *{idTicket}* emitidos.\n{link}',
      COMPRADO_indy:    '*COMPRADO*\nTicket {idTicket} emitido.',
      CANCELADO_admin:  '*Indipris Travel*\nSolicitud *{idTicket}* cancelada.\nMotivo: "{motivo}"',
      CANCELADO_indy:   '*CANCELADO*\n{idTicket} cancelado por {empresa}.\nMotivo: {motivo}',
      EXTRA_admin:      '*Indipris Travel*\nSe agrego un extra a *{idTicket}*.\n{motivo}\n{link}'
    }
  };

  if (!sheet) {
    return jsonResponse("success", defaults);
  }

  var rows = sheet.getDataRange().getValues();
  var config = { apiKey: '', templates: {} };

  for (var i = 1; i < rows.length; i++) {
    var clave = String(rows[i][0] || '').trim();
    var valor = String(rows[i][1] || '').trim();
    if (clave === 'API_KEY') {
      config.apiKey = valor;
    } else if (clave) {
      config.templates[clave] = valor;
    }
  }

  // Merge con defaults para que no falte ninguno
  if (!config.apiKey) config.apiKey = defaults.apiKey;
  var defKeys = Object.keys(defaults.templates);
  for (var di = 0; di < defKeys.length; di++) {
    if (!config.templates[defKeys[di]]) {
      config.templates[defKeys[di]] = defaults.templates[defKeys[di]];
    }
  }

  return jsonResponse("success", config);
}

// Reporte detallado por pasajero (solo super)
function handleGetReporteDetallado(userAuth, data) {
  if (userAuth.role !== 'super') return jsonResponse("error", "Sin permisos.");

  var solicitudes = getSheetData(CONFIG.SHEETS.SOLICITUDES);
  var servicios   = getSheetData(CONFIG.SHEETS.SERVICIOS);
  var pasajeros   = getSheetData(CONFIG.SHEETS.PASAJEROS);
  var opciones    = getSheetData(CONFIG.SHEETS.OPCIONES);
  var companiesMap = getCompaniesMap();

  // Filtros opcionales
  var desde = data.desde || '';
  var hasta = data.hasta || '';
  var empFilter = data.empresa || '';

  // Indexar solicitudes por ID
  var solMap = {};
  solicitudes.forEach(function(s) {
    var estado = s[4];
    if (estado !== 'Comprado' && estado !== 'Autorizado') return;
    if (desde) { var d = new Date(s[1]); if (isNaN(d) || d < new Date(desde)) return; }
    if (hasta) { var d2 = new Date(s[1]); if (isNaN(d2) || d2 > new Date(hasta + 'T23:59:59')) return; }
    var empId = String(s[3] || '').trim();
    if (empFilter && empId !== empFilter) return;
    solMap[s[0]] = {
      fecha: s[1],
      empresa: companiesMap[empId] || empId,
      empresaId: empId,
      estado: estado,
      asignado: s[8] || ''
    };
  });

  // Indexar opciones compradas por ticket
  var optsByTicket = {};
  opciones.forEach(function(o) {
    var tk = String(o[0]);
    if (!solMap[tk]) return;
    if (o[6] !== 'Comprado' && o[6] !== 'Autorizada' && o[6] !== 'Extra') return;
    if (!optsByTicket[tk]) optsByTicket[tk] = [];
    optsByTicket[tk].push(o);
  });

  // Indexar servicios por ticket
  var svcsByTicket = {};
  servicios.forEach(function(s) {
    var tk = String(s[0]);
    if (!svcsByTicket[tk]) svcsByTicket[tk] = [];
    svcsByTicket[tk].push(s);
  });

  // Construir filas: una por pasajero, acumulando servicios + extras
  var filas = [];
  var ticketIds = Object.keys(solMap);

  for (var ti = 0; ti < ticketIds.length; ti++) {
    var tk  = ticketIds[ti];
    var sol = solMap[tk];
    var paxList = pasajeros.filter(function(p) { return String(p[0]) === tk; });
    var opts = optsByTicket[tk] || [];
    var svcs = svcsByTicket[tk] || [];
    var nPax = paxList.length || 1;

    // Acumular totales del ticket (servicios + extras)
    var totalCosto = 0;
    var totalFee   = 0;

    // Datos del servicio principal (para ruta, aerolinea, PNR, fechas)
    var aerolinea = '';
    var pnr = '';
    var fechaVuelo = '';
    var fechaRegreso = '';
    var origen = '';
    var destino = '';

    for (var oi = 0; oi < opts.length; oi++) {
      var opt = opts[oi];
      var desc = String(opt[2] || '');

      totalCosto += Number(opt[3] || 0);
      totalFee   += Number(opt[4] || 0);

      // Extraer datos solo de opciones no-extra (servicios reales)
      if (opt[6] !== 'Extra') {
        var mAero = desc.match(/Aerol[ií]nea[:\s]*([^<|\n]+)/i);
        if (mAero && !aerolinea) aerolinea = mAero[1].trim();

        var mPnr = desc.match(/PNR[:\s]*([A-Z0-9]+)/i);
        if (mPnr && !pnr) pnr = mPnr[1].trim();

        var svc = svcs.find(function(s) { return s[7] === opt[7]; }) || svcs[0];
        if (svc && !origen) {
          origen  = String(svc[2] || '').toUpperCase();
          destino = String(svc[3] || '').toUpperCase();
          fechaVuelo = svc[4] || '';
          fechaRegreso = svc[5] || '';
        }
      }
    }

    var ruta = (origen && destino) ? origen + ' - ' + destino : '';
    var subtotalTicket = totalCosto + totalFee;
    var ivaTicket      = subtotalTicket * 0.16;
    var granTotal      = subtotalTicket + ivaTicket;

    // Dividir entre pasajeros
    var costoPorPax = Math.round(totalCosto / nPax * 100) / 100;
    var feePorPax   = Math.round(totalFee / nPax * 100) / 100;
    var totalPorPax = Math.round(granTotal / nPax * 100) / 100;

    for (var pi = 0; pi < paxList.length; pi++) {
      var pax = paxList[pi];
      filas.push({
        pasajero:    String(pax[1] || ''),
        fechaSol:    sol.fecha,
        nacimiento:  pax[2] || '',
        idTicket:    tk,
        pnr:         pnr,
        aerolinea:   aerolinea,
        fechaSalida: fechaVuelo,
        fechaRegreso: fechaRegreso,
        ruta:        ruta,
        subtotal:    costoPorPax,
        comision:    feePorPax,
        total:       totalPorPax,
        empresa:     sol.empresa,
        empresaId:   sol.empresaId
      });
    }
  }

  // Ordenar por fecha de solicitud desc, luego por ticket
  filas.sort(function(a, b) {
    var da = new Date(a.fechaSol), db = new Date(b.fechaSol);
    if (!isNaN(da) && !isNaN(db) && da.getTime() !== db.getTime()) return db - da;
    return a.idTicket < b.idTicket ? 1 : -1;
  });

  return jsonResponse("success", { filas: filas });
}