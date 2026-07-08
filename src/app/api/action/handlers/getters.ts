import { getSheetData, getCompaniesMap } from '@/lib/sheets';
import { authenticateUser } from './auth';

export async function getPoliticaEmpresa(empresaId: string) {
  try {
    const rows = await getSheetData('Politicas');
    for (const row of rows) {
      if (String(row[0] || '').trim() === String(empresaId).trim()) {
        return {
          montoMaxSinAuth: Number(row[1] || 0),
          feeVuelo:        Number(row[2] || 0),
          feeHotel:        Number(row[3] || 0),
          feeBus:          Number(row[4] || 0),
          feeOtro:         Number(row[5] || 0),
          aplicaIVA:       row[7] !== false && row[7] !== 'FALSE' && row[7] !== 'NO' && row[7] !== 0
        };
      }
    }
  } catch (e) {}
  return null;
}

export async function handleGetNotificaciones(authParams: any, data: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth || userAuth.role !== 'super') return { status: 'error', message: 'Sin permisos.' };

  const notifRows = await getSheetData('Notificaciones');
  const companiesMap = await getCompaniesMap();

  const usuarios = await getSheetData('Usuarios');
  const ejecutivos = usuarios
    .filter(u => ['indipris', 'super'].includes(String(u[2] || '').trim()))
    .map(u => ({ username: u[0], email: u[4] || '', telefono: u[5] || '' }));

  const empNotifs: Record<string, any[]> = {};
  notifRows.forEach((row, idx) => {
    const empId = String(row[0] || '').trim();
    if (!empId) return;
    if (!empNotifs[empId]) empNotifs[empId] = [];
    empNotifs[empId].push({
      rowIndex: idx + 2,
      ejecutivoUsername: String(row[1] || '').trim(),
      CREACION: row[2] === true || row[2] === 'TRUE' || row[2] === 1 || row[2] === 'true',
      AUTORIZADO: row[3] === true || row[3] === 'TRUE' || row[3] === 1 || row[3] === 'true',
      RECHAZADO: row[4] === true || row[4] === 'TRUE' || row[4] === 1 || row[4] === 'true',
      CANCELADO: row[5] === true || row[5] === 'TRUE' || row[5] === 1 || row[5] === 'true'
    });
  });

  const solicitudes = await getSheetData('Solicitudes');
  const empresasConTickets: Record<string, boolean> = {};
  solicitudes.forEach(s => {
    const empIdSol = String(s[3] || '').trim();
    if (empIdSol) empresasConTickets[empIdSol] = true;
  });

  const empresas = [];
  const compKeys = Object.keys(companiesMap);
  for (const cid of compKeys) {
    const ejList = empNotifs[cid] || [];
    if (!empresasConTickets[cid] && ejList.length === 0) continue;
    empresas.push({ empresaId: cid, empresaNombre: companiesMap[cid], sinConfig: ejList.length === 0, ejecutivos: ejList });
  }

  empresas.sort((a, b) => a.empresaNombre.localeCompare(b.empresaNombre));

  const todasEmpresas = compKeys.map(id => ({ id, nombre: companiesMap[id] }));
  todasEmpresas.sort((a, b) => a.nombre.localeCompare(b.nombre));

  return { status: 'success', data: { empresas, ejecutivos, todasEmpresas } };
}

export async function handleGetLogsWhatsapp(authParams: any, data: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth || userAuth.role !== 'super') return { status: 'error', message: 'Sin permisos.' };

  const rows = await getSheetData('Logs_Whatsapp');
  const logs = [];

  const inicio = Math.max(0, rows.length - 500);
  for (let i = rows.length - 1; i >= inicio; i--) {
    logs.push({
      timestamp: rows[i][0],
      telefono: String(rows[i][1] || ''),
      nombre: String(rows[i][2] || ''),
      mensaje: String(rows[i][3] || ''),
      evento: String(rows[i][4] || ''),
      idTicket: String(rows[i][5] || ''),
      enviadoPor: String(rows[i][6] || ''),
      status: String(rows[i][7] || '')
    });
  }

  return { status: 'success', data: { logs } };
}

export async function handleGetDashboard(authParams: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth) return { status: 'error', message: 'Sesión inválida.' };

  let solicitudes = await getSheetData('Solicitudes');
  const servicios = await getSheetData('Servicios_Detalle');
  const companiesMap = await getCompaniesMap();

  if (userAuth.role === 'viajero' || userAuth.role === 'admin') {
    const empUserIds = String(userAuth.empresa || '').toLowerCase().trim().split(',').map(s => s.trim());
    solicitudes = solicitudes.filter(row => {
      const empId = String(row[3] || '').trim().toLowerCase();
      return empUserIds.includes(empId);
    });
  }

  let totalAutorizado = 0;
  if (userAuth.role === 'admin' || userAuth.role === 'super') {
    solicitudes.forEach(row => {
      if (row[4] === 'Autorizado' || row[4] === 'Comprado') {
        totalAutorizado += Number(row[6] || 0);
      }
    });
  }

  solicitudes = solicitudes.map(row => {
    const r = [...row];
    const empId = String(r[3] || '').trim();
    const resolved = companiesMap[empId];
    if (resolved) {
      r[3] = resolved;
    } else {
      // Log to help debug mismatches
      console.log(`[Dashboard] No company name found for ID: "${empId}". Available IDs: ${Object.keys(companiesMap).slice(0, 5).join(', ')}`);
    }
    r[10] = empId; // always keep raw ID in col 10
    return r;
  });

  const solicitudesMap: Record<string, boolean> = {};
  solicitudes.forEach(s => { solicitudesMap[s[0]] = true; });
  const serviciosResumen = servicios.filter(s => solicitudesMap[s[0]]);

  const pasajeros = await getSheetData('Pasajeros');
  const pasajerosResumen: Record<string, string[]> = {};
  pasajeros.forEach(p => {
    const tk = String(p[0] || '');
    if (!solicitudesMap[tk]) return;
    if (!pasajerosResumen[tk]) pasajerosResumen[tk] = [];
    const nombre = String(p[1] || '').trim();
    if (nombre) pasajerosResumen[tk].push(nombre);
  });

  return {
    status: 'success',
    data: {
      solicitudes,
      serviciosResumen,
      pasajerosResumen,
      totalAutorizado
    }
  };
}

export async function handleGetTicketDetails(authParams: any, data: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth) return { status: 'error', message: 'Sesión inválida.' };

  const idTicket = data.idTicket;
  const allTickets = await getSheetData('Solicitudes');
  let ticket = null;
  for (const row of allTickets) {
    if (String(row[0]) === String(idTicket)) {
      ticket = row;
      break;
    }
  }
  if (!ticket) return { status: 'error', message: 'Ticket no encontrado.' };

  const companiesMap = await getCompaniesMap();
  const empId = String(ticket[3] || '').trim();
  const empNombre = companiesMap[empId] ? companiesMap[empId] : empId;

  if (userAuth.role === 'viajero' || userAuth.role === 'admin') {
    const empUser = String(userAuth.empresa || '').toLowerCase().trim();
    const matchId = empId.toLowerCase() === empUser;
    const matchNombre = empNombre.toLowerCase() === empUser;
    if (!matchId && !matchNombre) return { status: 'error', message: 'Acceso denegado.' };
  }

  const ticketEnr = [...ticket];
  ticketEnr[3] = empNombre;

  const servicios = (await getSheetData('Servicios_Detalle')).filter(s => String(s[0]) === String(idTicket));
  const pasajeros = (await getSheetData('Pasajeros')).filter(p => String(p[0]) === String(idTicket));
  const opciones = (await getSheetData('Opciones_Cotizacion')).filter(o => String(o[0]) === String(idTicket));

  const politica = await getPoliticaEmpresa(empId);

  return {
    status: 'success',
    data: {
      ticket: ticketEnr,
      servicios,
      pasajeros,
      opciones,
      politica
    }
  };
}

export async function handleGetCompanies(authParams: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth) return { status: 'error', message: 'Sesión inválida.' };

  const lista = [];
  const map = await getCompaniesMap();
  const keys = Object.keys(map);
  for (const key of keys) {
    lista.push({ id: key, nombre: map[key] });
  }
  lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
  return { status: 'success', data: lista };
}

export async function handleGetCatalogos(authParams: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth) return { status: 'error', message: 'Sesión inválida.' };

  const solicitudes = await getSheetData('Solicitudes');
  const pasajeros = await getSheetData('Pasajeros');

  const ticketEmpresa: Record<string, string> = {};
  solicitudes.forEach(s => {
    ticketEmpresa[s[0]] = String(s[3] || '').toLowerCase().trim();
  });

  const userEmp = String(userAuth.empresa || '').toLowerCase().trim();
  const isViajeroOrAdmin = (userAuth.role === 'viajero' || userAuth.role === 'admin');

  const vistos: Record<string, boolean> = {};
  const paxsFinales: any[] = [];

  pasajeros.forEach(p => {
    const idTicket = p[0];
    const empTicket = ticketEmpresa[idTicket] || '';
    if (isViajeroOrAdmin && empTicket !== userEmp) return;

    const n = String(p[1] || '').trim();
    if (n && !vistos[n]) {
      vistos[n] = true;
      paxsFinales.push({
        nombre: n,
        nacimiento: p[2] || '',
        asiento: p[3] || '',
        equipaje: p[4] || ''
      });
    }
  });

  let userEmpIds: string[] = [];
  if (userAuth.empresa) {
    userEmpIds = String(userAuth.empresa).split(',').map(s => s.trim().toLowerCase());
  }
  const isSuperOrIndipris = (userAuth.role === 'super' || userAuth.role === 'indipris');

  const eventos: string[] = [];
  const evtVistos: Record<string, boolean> = {};

  try {
    const evtRows = await getSheetData('Eventos');
    for (const row of evtRows) {
      const evNombre = String(row[0] || '').trim();
      const evEmpresa = String(row[1] || '').trim().toLowerCase();
      if (!evNombre || evtVistos[evNombre]) continue;
      if (!isSuperOrIndipris && evEmpresa && !userEmpIds.includes(evEmpresa)) continue;
      evtVistos[evNombre] = true;
      eventos.push(evNombre);
    }
  } catch (e) {}

  solicitudes.forEach(s => {
    const ev = String(s[9] || '').trim();
    if (!ev || evtVistos[ev]) return;
    if (!isSuperOrIndipris) {
      const ticketEmp = String(s[3] || '').trim().toLowerCase();
      if (!userEmpIds.includes(ticketEmp)) return;
    }
    evtVistos[ev] = true;
    eventos.push(ev);
  });

  eventos.sort();

  return {
    status: 'success',
    data: {
      pasajeros: paxsFinales,
      eventos
    }
  };
}

export async function handleGetFinanzas(authParams: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth) return { status: 'error', message: 'Sesión inválida.' };

  const companiesMap = await getCompaniesMap();
  let solicitudes = (await getSheetData('Solicitudes')).filter(s => s[4] === 'Autorizado' || s[4] === 'Comprado');

  if (userAuth.role === 'admin') {
    const empUser = String(userAuth.empresa || '').toLowerCase().trim();
    solicitudes = solicitudes.filter(s => {
      const empId = String(s[3] || '').trim();
      const empNombre = companiesMap[empId] ? companiesMap[empId].toLowerCase().trim() : '';
      return empId.toLowerCase() === empUser || empNombre === empUser;
    });
  }

  return {
    status: 'success',
    data: {
      solicitudes
    }
  };
}
