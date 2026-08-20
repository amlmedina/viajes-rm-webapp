import { getSheetData, getCompaniesMap, appendRow, updateCell } from '@/lib/sheets';
import { authenticateUser } from './auth';

function _generateHexId() {
  return Math.random().toString(16).substring(2, 10).toUpperCase();
}

function fmtShort(d: Date | null) {
  if (!d) return '';
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function parseDateExcel(val: any) {
  if (!val) return null;
  let str = String(val).split(' ')[0];
  let parts = str.split('/');
  if (parts.length === 3) {
    let p0 = parseInt(parts[0], 10), p1 = parseInt(parts[1], 10) - 1, p2 = parseInt(parts[2], 10);
    if (p2 < 100) p2 += 2000;
    if (p0 > 31) return new Date(p0, p1, p2);
    return new Date(p2, p1, p0);
  }
  return new Date(val);
}

export async function handleExportarALegacy(authParams: any, data: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth || (userAuth.role !== 'indipris' && userAuth.role !== 'super' && userAuth.role !== 'admin')) {
    return { status: 'error', message: 'Sin permisos.' };
  }

  const idTicket = data.idTicket;
  if (!idTicket) return { status: 'error', message: 'ID de ticket requerido.' };
  const legacyId = process.env.LEGACY_SS_ID;
  if (!legacyId) return { status: 'error', message: 'LEGACY_SS_ID no configurado en el servidor.' };

  const configRes = await handleGetConfigMigracion(authParams);
  const isAPI = configRes.data && configRes.data.metodo === 'API';

  const solicitudes = await getSheetData('Solicitudes');
  const ticket = solicitudes.find(row => String(row[0]) === String(idTicket));
  if (!ticket) return { status: 'error', message: 'Ticket no encontrado.' };

  const allServicios = await getSheetData('Servicios_Detalle');
  const servicios = allServicios.filter(s => String(s[0]) === String(idTicket));

  const allPasajeros = await getSheetData('Pasajeros');
  const pasajeros = allPasajeros.filter(p => String(p[0]) === String(idTicket));

  const allOpciones = await getSheetData('Opciones_Cotizacion');
  const opcionesCompradas = allOpciones.filter(o => {
    const estado = String(o[6] || '').trim();
    return String(o[0]).trim() === String(idTicket).trim() && (estado === 'Comprado' || estado === 'Extra' || estado === 'Autorizada');
  });

  if (opcionesCompradas.length === 0) return { status: 'error', message: 'No hay opciones compradas para exportar.' };

  const empresaId = String(ticket[3] || '').trim();
  const companiesMap = await getCompaniesMap();
  const empresaNombre = companiesMap[empresaId] || empresaId;
  const solicitante = ticket[2];
  const asignadoA = String(ticket[8] || '').trim();
  const evento = String(ticket[9] || '').trim();
  const nPax = pasajeros.length || 1;
  const primerPax = pasajeros.length > 0 ? String(pasajeros[0][1] || '') : solicitante;
  
  const formatter = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const nowParts = formatter.formatToParts(new Date());
  const nowFormatted = `${nowParts.find(p => p.type === 'year')?.value}-${nowParts.find(p => p.type === 'month')?.value}-${nowParts.find(p => p.type === 'day')?.value} ${nowParts.find(p => p.type === 'hour')?.value}:${nowParts.find(p => p.type === 'minute')?.value}:${nowParts.find(p => p.type === 'second')?.value}`;
  
  const destinosUnicos: string[] = [];
  const destVisto: any = {};
  servicios.forEach(s => {
    const d = String(s[3] || '').trim();
    if (d && !destVisto[d.toUpperCase()]) { destVisto[d.toUpperCase()] = true; destinosUnicos.push(d); }
  });
  const destinoPrincipal = destinosUnicos[0] || '';

  let fechaMin: Date | null = null, fechaMax: Date | null = null;
  servicios.forEach(s => {
    const f1 = parseDateExcel(s[4]);
    const f2 = parseDateExcel(s[5]);
    if (f1 && !isNaN(f1.getTime()) && (!fechaMin || f1 < fechaMin)) fechaMin = f1;
    if (f2 && !isNaN(f2.getTime()) && (!fechaMax || f2 > fechaMax)) fechaMax = f2;
    if (f1 && !isNaN(f1.getTime()) && (!fechaMax || f1 > fechaMax)) fechaMax = f1;
  });

  const usuarios = await getSheetData('Usuarios');
  let emailAsignado = '';
  for (let ui = 0; ui < usuarios.length; ui++) {
    if (String(usuarios[ui][0]).toLowerCase() === asignadoA.toLowerCase()) {
      emailAsignado = String(usuarios[ui][4] || '').trim();
      break;
    }
  }
  if (!emailAsignado) {
    const baseName = (asignadoA || userAuth.username || solicitante || '').trim();
    emailAsignado = baseName.includes('@') ? baseName : baseName + '@indipris.com';
  }

  try {
    let contactoId = '';
    if (primerPax) {
      const contactRows = await getSheetData('Contacts', legacyId).catch(() => []);
      const nombreParts = primerPax.trim().split(/\s+/);
      const paxNombre = nombreParts.slice(0, Math.ceil(nombreParts.length / 2)).join(' ');
      const paxApellido = nombreParts.slice(Math.ceil(nombreParts.length / 2)).join(' ');

      for (let ci = 0; ci < contactRows.length; ci++) {
        const cNom = String(contactRows[ci][1] || '').trim().toLowerCase();
        const cApe = String(contactRows[ci][2] || '').trim().toLowerCase();
        if (cNom === paxNombre.toLowerCase() && cApe === paxApellido.toLowerCase()) {
          contactoId = String(contactRows[ci][0]);
          break;
        }
      }

      if (!contactoId) {
        contactoId = _generateHexId();
        const paxNacimiento = pasajeros.length > 0 ? (pasajeros[0][2] || '') : '';
        await appendRow('Contacts', [
          contactoId, paxNombre, paxApellido, empresaId,
          '', '', '', 'Cliente', '', emailAsignado,
          paxNacimiento, 'Mexicano', '', '', '', '', '', '', '', '', '',
          nowFormatted
        ], legacyId).catch(console.error);
      }
    }

    const nombreViaje = destinoPrincipal + ' - ' + empresaNombre + ' - ' + primerPax + ' - ' + fmtShort(fechaMin) + ' - ID Viaje: ' + idTicket;

    const claves: string[] = [];
    opcionesCompradas.forEach(op => {
      const desc = String(op[2] || '');
      const mPnr = desc.match(/PNR:<\/b>\s*(?:<[^>]+>)*\s*([^<]+)/i);
      if (mPnr && mPnr[1].trim() !== 'PENDIENTE') claves.push(mPnr[1].trim());
    });

    let viajePayload: any = null;
    if (isAPI) {
      viajePayload = {
        id_viaje: idTicket,
        nombre_viaje: nombreViaje,
        email_asignado: emailAsignado,
        monto_total: 0,
        empresa_id: empresaId,
        evento: evento || '',
        contacto_id: contactoId,
        destino_principal: destinoPrincipal,
        timestamp: nowFormatted,
        fecha_min: fechaMin ? fmtShort(fechaMin) : '',
        fecha_max: fechaMax ? fmtShort(fechaMax) : '',
        status: 'Crédito',
        claves_reserva: claves.join(' / ') || '',
        oportunidad_hubspot: String(ticket[5] || ''),
        fecha_creacion: nowFormatted,
        solicitud_web: idTicket,
        dueno: userAuth.username
      };
    } else {
      await appendRow('Viajes', [
        idTicket,
        nombreViaje,
        emailAsignado,
        0,
        empresaId,
        evento || '',
        contactoId,
        destinoPrincipal,
        '',
        nowFormatted,
        fechaMin ? fmtShort(fechaMin) : '',
        fechaMax ? fmtShort(fechaMax) : '',
        'Crédito',
        '',
        claves.join(' / ') || '',
        String(ticket[5] || ''),
        '', // 17: Generar PDF
        nowFormatted, // 18: Fecha de creación
        idTicket, // 19: Solicitud web
        userAuth.username // 20: Dueño
      ], legacyId);
    }

    const reservaIds: string[] = [];
    const reservasPayload: any[] = [];
    for (let ri = 0; ri < opcionesCompradas.length; ri++) {
      const op = opcionesCompradas[ri];
      const desc = String(op[2] || '');
      const descLimpia = desc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      const svc = servicios.find(sv => sv[7] === op[7]) || servicios[0];
      const tipoSvc = svc ? String(svc[1] || '').toUpperCase() : '';
      const origen  = svc ? String(svc[2] || '') : '';
      const destino = svc ? String(svc[3] || '') : '';
      const fechaIn = svc && svc[4] ? parseDateExcel(svc[4]) : null;
      const fechaOut = svc && svc[5] ? parseDateExcel(svc[5]) : null;

      let tipoEmoji = '📋 Otro';
      if (tipoSvc === 'VUELO') tipoEmoji = '✈️ Vuelo';
      else if (tipoSvc === 'HOTEL') tipoEmoji = '🏨 Hotel';
      else if (tipoSvc === 'BUS') tipoEmoji = '🚌 Autobús';
      else if (tipoSvc === 'TREN') tipoEmoji = '🚂 Tren';
      else if (tipoSvc === 'TRANSFER') tipoEmoji = '🚐 Transfer';
      if (op[6] === 'Extra') tipoEmoji = '🧳Maleta';

      const descReserva = 'Reserva de ' + tipoEmoji + ' para viaje ' + destinoPrincipal + ' - ' + empresaNombre + ' - ' + primerPax + ' - ' + fmtShort(fechaIn) + ' - ID Viaje: ' + idTicket;

      const precioServicio = Number(op[5] || 0);
      const costoServicio  = Number(op[9] || 0) || Number(op[3] || 0);

      let aerolineaIda = '', horaSalIda = '', horaLlegIda = '', claveIda = '', numVueloIda = '';
      let aerolineaVta = '', horaSalVta = '', horaLlegVta = '', claveVta = '', numVueloVta = '';
      let pnr = '', hotelNombre = '', regreso = '';

      const mPnr = desc.match(/PNR:<\/b>\s*(?:<[^>]+>)*\s*([^<]+)/i);
      if (mPnr && mPnr[1].trim() !== 'PENDIENTE') pnr = mPnr[1].trim();

      const mAero = desc.match(/Aerolinea:<\/b>\s*([^<]+)/i);

      if (tipoSvc === 'VUELO') {
        if (mAero) aerolineaIda = mAero[1].trim();

        const mNumVuelo = desc.match(/Vuelo:<\/b>\s*([A-Z0-9]+)/i);
        if (mNumVuelo) numVueloIda = mNumVuelo[1].trim();

        const mHorario = desc.match(/Horario:<\/b>\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/i);
        if (mHorario) {
          horaSalIda = mHorario[1];
          horaLlegIda = mHorario[2];
        }

        claveIda = pnr;

        const esIda = desc.indexOf('IDA') !== -1;
        const esRegreso = desc.indexOf('REGRESO') !== -1;

        if (esIda || esRegreso) {
          let skip = false;
          for (let pi = 0; pi < opcionesCompradas.length; pi++) {
            if (pi === ri) continue;
            const opPar = opcionesCompradas[pi];
            if (opPar[7] !== op[7]) continue; 
            const descPar = String(opPar[2] || '');
            if (esIda && descPar.indexOf('REGRESO') !== -1) {
              const mAeroR = descPar.match(/Aerolinea:<\/b>\s*([^<]+)/i);
              if (mAeroR) aerolineaVta = mAeroR[1].trim();
              const mHR = descPar.match(/Horario:<\/b>\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/i);
              if (mHR) { horaSalVta = mHR[1]; horaLlegVta = mHR[2]; }
              const mNVR = descPar.match(/Vuelo:<\/b>\s*([A-Z0-9]+)/i);
              if (mNVR) numVueloVta = mNVR[1].trim();
              const mPnrR = descPar.match(/PNR:<\/b>\s*(?:<[^>]+>)*\s*([^<]+)/i);
              if (mPnrR && mPnrR[1].trim() !== 'PENDIENTE') claveVta = mPnrR[1].trim();
              regreso = origen; 
              break;
            }
          }
          if (esRegreso) continue; 
        }
      }

      if (tipoSvc === 'HOTEL') {
        hotelNombre = origen || destino || '';
      }

      const idReserva = _generateHexId();
      reservaIds.push(idReserva);

      if (isAPI) {
        reservasPayload.push({
          id_reserva: idReserva,
          descripcion: descReserva,
          empresa_id: empresaId,
          id_ticket: idTicket,
          timestamp: nowFormatted,
          precio_servicio: precioServicio,
          tipo: tipoEmoji,
          num_pax: nPax,
          aerolinea: aerolineaIda || '',
          origen: origen,
          destino: destino,
          regreso: regreso,
          fecha_in: fechaIn ? fmtShort(fechaIn) : '',
          fecha_out: (fechaOut || fechaIn) ? fmtShort(fechaOut || fechaIn) : '',
          hotel: hotelNombre,
          aerolinea_ida: aerolineaIda,
          hora_salida_ida: horaSalIda,
          hora_llegada_ida: horaLlegIda,
          clave_ida: claveIda,
          vuelo_ida: numVueloIda,
          aerolinea_vta: aerolineaVta,
          hora_salida_vta: horaSalVta,
          hora_llegada_vta: horaLlegVta,
          clave_vta: claveVta,
          vuelo_vta: numVueloVta,
          pnr: pnr || claveIda || '.',
          costo_servicio: costoServicio,
          desc_limpia: descLimpia.substring(0, 200),
          email_asignado: emailAsignado
        });
      } else {
        await appendRow('Reservas', [
          idReserva, descReserva, empresaId, idTicket, nowFormatted, precioServicio, tipoEmoji, nPax, aerolineaIda || '', '', origen, destino, regreso, fechaIn ? fmtShort(fechaIn) : '', (fechaOut || fechaIn) ? fmtShort(fechaOut || fechaIn) : '', hotelNombre, aerolineaIda, horaSalIda, horaLlegIda, claveIda, numVueloIda, aerolineaVta, horaSalVta, horaLlegVta, claveVta, numVueloVta, pnr || claveIda || '.', costoServicio, 7, '', '', '', '', descLimpia.substring(0, 200), emailAsignado, nowFormatted, 1, nowFormatted, ''
        ], legacyId);
      }
    }

    let apiPayload: any = null;
    if (isAPI) {
      // Determine CREATE or EDIT
      let apiAction = "CREATE";
      try {
        const viajesList = await getSheetData('Viajes', legacyId);
        if (viajesList.some(v => String(v[0]).trim() === String(idTicket).trim())) {
          apiAction = "EDIT";
        }
      } catch (e) {
        console.error('Failed to get Viajes for existence check, defaulting to CREATE', e);
      }

      const txId = 'tx_' + Date.now() + '_' + Math.floor(Math.random()*1000);
      apiPayload = {
        header: {
          transaction_id: txId,
          source_system: "railway_backend_crm",
          action: apiAction,
          environment: "prod",
          timestamp: new Date().toISOString()
        },
        payload: {
          viaje: viajePayload,
          reservas: reservasPayload
        }
      };

      const middlewareUrl = process.env.MIDDLEWARE_API_URL || 'https://indipristi.taila4be24.ts.net';
      
      console.log("=== ENVIANDO A SHEETS MIDDLEWARE API ===");
      console.log("URL:", `${middlewareUrl}/api/v1/viajes`);
      console.log("Payload:", JSON.stringify(apiPayload, null, 2));

      const response = await fetch(`${middlewareUrl}/api/v1/viajes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Middleware API Error (${response.status}): ${errorText}`);
      }
    }

    const logMensaje = isAPI ? `Exportó a Middleware API. Payload: ${JSON.stringify(apiPayload)}` : "Exportó a Legacy";
    await appendRow('Logs', [nowFormatted, userAuth.username, idTicket, logMensaje]);

    return {
      status: "success",
      data: {
        mensaje: "Exportado exitosamente.",
        viajes: [idTicket],
        reservas: reservaIds,
        contactos: [contactoId].filter(Boolean)
      }
    };
  } catch (e: any) {
    console.error('Error exportando a legacy:', e);
    return { status: "error", message: "Error al exportar: " + e.message };
  }
}


export async function handleGetConfigMigracion(authParams: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth || !['super', 'indipris', 'admin'].includes(userAuth.role)) {
    return { status: 'error', message: 'Sin permisos.' };
  }
  
  try {
    const rows = await getSheetData('Config_Whatsapp');
    if (rows) {
      for (const row of rows) {
        if (String(row[0] || '').trim() === 'MIGRATION_METHOD') {
          return { status: 'success', data: { metodo: String(row[1] || '').trim() } };
        }
      }
    }
  } catch (e) {
    console.error('Error fetching config migration', e);
  }
  
  return { status: 'success', data: { metodo: 'LEGACY' } };
}

export async function handleSaveConfigMigracion(authParams: any, data: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth || !['super', 'indipris', 'admin'].includes(userAuth.role)) {
    return { status: 'error', message: 'Sin permisos.' };
  }
  
  const metodo = data.metodo === 'API' ? 'API' : 'LEGACY';
  try {
    const rows = await getSheetData('Config_Whatsapp');
    let found = false;
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0] || '').trim() === 'MIGRATION_METHOD') {
        await updateCell('Config_Whatsapp', i + 2, 2, metodo);
        found = true;
        break;
      }
    }
    if (!found) {
      await appendRow('Config_Whatsapp', ['MIGRATION_METHOD', metodo]);
    }
    return { status: 'success', data: { metodo } };
  } catch (e: any) {
    return { status: 'error', message: 'Error saving config migration: ' + e.message };
  }
}
