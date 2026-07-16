import { getSheetData, getCompaniesMap, appendRow } from '@/lib/sheets';
import { authenticateUser } from './auth';

function _generateHexId() {
  return Math.random().toString(16).substring(2, 10).toUpperCase();
}

function fmtShort(d: Date | null) {
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
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

  const solicitudes = await getSheetData('Solicitudes');
  const ticket = solicitudes.find(row => String(row[0]) === String(idTicket));
  if (!ticket) return { status: 'error', message: 'Ticket no encontrado.' };

  const allServicios = await getSheetData('Servicios');
  const servicios = allServicios.filter(s => String(s[0]) === String(idTicket));

  const allPasajeros = await getSheetData('Pasajeros');
  const pasajeros = allPasajeros.filter(p => String(p[0]) === String(idTicket));

  const allOpciones = await getSheetData('Opciones_Cotizacion');
  const opcionesCompradas = allOpciones.filter(o => 
    String(o[0]) === String(idTicket) && (o[6] === 'Comprado' || o[6] === 'Extra' || o[6] === 'Autorizada')
  );

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
  if (!emailAsignado) emailAsignado = asignadoA + '@indipris.com';

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
      '',
      '',
      nowFormatted,
      idTicket,
      ''
    ], legacyId);

    const reservaIds: string[] = [];
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

      await appendRow('Reservas', [
        idReserva,
        descReserva,
        empresaId,
        idTicket,
        nowFormatted,
        precioServicio,
        tipoEmoji,
        nPax,
        aerolineaIda || '',
        '',
        origen,
        destino,
        regreso,
        fechaIn ? fmtShort(fechaIn) : '',
        (fechaOut || fechaIn) ? fmtShort(fechaOut || fechaIn) : '',
        hotelNombre,
        aerolineaIda,
        horaSalIda,
        horaLlegIda,
        claveIda,
        numVueloIda,
        aerolineaVta,
        horaSalVta,
        horaLlegVta,
        claveVta,
        numVueloVta,
        pnr || claveIda || '.',
        costoServicio,
        7,
        '',
        '',
        '',
        '',
        descLimpia.substring(0, 200),
        emailAsignado,
        nowFormatted,
        1,
        nowFormatted,
        ''
      ], legacyId);
    }

    await appendRow('Logs', [nowFormatted, userAuth.username, idTicket, "Exportó a Legacy"]);

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
