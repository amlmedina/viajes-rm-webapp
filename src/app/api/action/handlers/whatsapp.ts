import { getSheetData, appendRow } from '@/lib/sheets';
import { authenticateUser } from './auth';

// ─────────────────────────────────────────────────────────────────────────────
// GET CONFIG WA — returns apiKey + templates from Config_Whatsapp sheet
// ─────────────────────────────────────────────────────────────────────────────
export async function handleGetConfigWA(authParams: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth) return { status: 'error', message: 'Sesión inválida.' };
  if (!['super', 'indipris', 'admin'].includes(userAuth.role)) {
    return { status: 'error', message: 'Sin permisos.' };
  }

  const defaults = {
    apiKey: process.env.WHATSAPP_API_KEY || '',
    templates: {
      CREACION_admin:   '*Indipris Travel*\nHola, {solicitante} creó la solicitud *({idTicket})*.\nAsignada a: *{asignado}*\n{link}',
      CREACION_indy:    '*NUEVA SOLICITUD*\nTicket: {idTicket}\nDe: {solicitante} ({empresa})\nAsignada a: *{asignado}*\n{link}',
      COTIZADO_admin:   '*Indipris Travel*\n¡Tus opciones están listas para *{idTicket}*!\n{link}',
      COTIZADO_indy:    '*OPCIONES ENVIADAS*\nTicket {idTicket} cotizado para {empresa}.',
      AUTORIZADO_admin: '*Indipris Travel*\nAutorizaste el ticket *{idTicket}*.\n{link}',
      AUTORIZADO_indy:  '*AUTORIZADO*\n{empresa} autorizó {idTicket}. Proceder a compra.\n{link}',
      RECHAZADO_admin:  '*Indipris Travel*\nRechazaste opciones de *{idTicket}*.\nMotivo: "{motivo}"',
      RECHAZADO_indy:   '*RECHAZADO*\n{empresa} rechazó {idTicket}.\nMotivo: {motivo}\n{link}',
      COMPRADO_admin:   '*Indipris Travel*\n¡Confirmado! Servicios de *{idTicket}* emitidos.\n{link}',
      COMPRADO_indy:    '*COMPRADO*\nTicket {idTicket} emitido.',
      CANCELADO_admin:  '*Indipris Travel*\nSolicitud *{idTicket}* cancelada.\nMotivo: "{motivo}"',
      CANCELADO_indy:   '*CANCELADO*\n{idTicket} cancelado por {empresa}.\nMotivo: {motivo}',
      EXTRA_admin:      '*Indipris Travel*\nSe agregó un extra a *{idTicket}*.\n{motivo}\n{link}'
    }
  };

  try {
    const rows = await getSheetData('Config_Whatsapp');
    if (!rows || rows.length === 0) return { status: 'success', data: defaults };

    const config: { apiKey: string; templates: Record<string, string> } = { apiKey: '', templates: {} };
    for (const row of rows) {
      const clave = String(row[0] || '').trim();
      const valor = String(row[1] || '').trim();
      if (clave === 'API_KEY') config.apiKey = valor;
      else if (clave) config.templates[clave] = valor;
    }

    // Merge defaults
    if (!config.apiKey) config.apiKey = defaults.apiKey;
    for (const k of Object.keys(defaults.templates)) {
      if (!config.templates[k]) config.templates[k] = (defaults.templates as any)[k];
    }

    return { status: 'success', data: config };
  } catch {
    return { status: 'success', data: defaults };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET CONTACTOS NOTIFICACION — returns admin + indipris contacts for a ticket's company
// ─────────────────────────────────────────────────────────────────────────────
export async function handleGetContactosNotificacion(authParams: any, data: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth) return { status: 'error', message: 'Sesión inválida.' };

  const empresa = String(data.empresaTicket || data.empresaId || '').toLowerCase().trim();
  const evento  = String(data.evento || '').toUpperCase();

  const [users, notifRows] = await Promise.all([
    getSheetData('Usuarios'),
    getSheetData('Notificaciones').catch(() => [] as any[])
  ]);

  // Build per-user notification config for this company
  const notifConfig: Record<string, Record<string, boolean>> = {};
  for (const row of notifRows) {
    const nEmpId = String(row[0] || '').trim().toLowerCase();
    if (nEmpId !== empresa) continue;
    const nUser = String(row[1] || '').trim();
    if (!notifConfig[nUser]) notifConfig[nUser] = {};
    notifConfig[nUser].CREACION   = row[2] === true || row[2] === 'TRUE' || row[2] === 1 || row[2] === 'true';
    notifConfig[nUser].AUTORIZADO = row[3] === true || row[3] === 'TRUE' || row[3] === 1 || row[3] === 'true';
    notifConfig[nUser].RECHAZADO  = row[4] === true || row[4] === 'TRUE' || row[4] === 1 || row[4] === 'true';
    notifConfig[nUser].CANCELADO  = row[5] === true || row[5] === 'TRUE' || row[5] === 1 || row[5] === 'true';
  }
  const hasConfig = Object.keys(notifConfig).length > 0;

  const admins: { nombre: string; telefono: string }[] = [];
  const indipris: { nombre: string; telefono: string }[] = [];

  for (const u of users) {
    const nombre  = String(u[0] || '').trim();
    const rol     = String(u[2] || '').trim();
    const empCSV  = String(u[3] || '').toLowerCase().trim();
    const tel     = String(u[5] || '').trim();
    if (!tel) continue;

    if (rol === 'admin' && empCSV === empresa) {
      admins.push({ nombre, telefono: tel });
    }

    if (rol === 'indipris' || rol === 'super') {
      if (hasConfig) {
        if (notifConfig[nombre] && notifConfig[nombre][evento]) {
          indipris.push({ nombre, telefono: tel });
        }
      } else {
        // Fallback: notify all indipris/super
        indipris.push({ nombre, telefono: tel });
      }
    }
  }

  return {
    status: 'success',
    data: {
      admins:            admins.map(a => a.telefono),
      indipris:          indipris.map(i => i.telefono),
      adminContactos:    admins,
      indiprisContactos: indipris
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SEND WHATSAPP — sends messages via textmebot.com and logs results
// ─────────────────────────────────────────────────────────────────────────────
export async function handleSendWhatsapp(authParams: any, data: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth) return { status: 'error', message: 'Sesión inválida.' };

  const { contactos, mensaje, evento, idTicket } = data;
  const apiKey = process.env.WHATSAPP_API_KEY || '';
  if (!apiKey) return { status: 'error', message: 'API Key de WhatsApp no configurada.' };
  if (!contactos || contactos.length === 0) return { status: 'success', data: { sent: 0 } };

  const timestamp = new Date().toISOString();
  let sent = 0;

  for (const c of contactos) {
    const phone  = typeof c === 'string' ? c : c.telefono;
    const nombre = typeof c === 'string' ? '' : (c.nombre || '');
    if (!phone) continue;

    // Normalize phone: remove spaces/dashes, ensure starts with +
    const tel = phone.replace(/[\s\-()]/g, '').replace(/^00/, '+').replace(/^(?!\+)/, '+');

    let statusResult = 'ok';
    let success = false;
    let attempts = 0;
    const maxAttempts = 20;

    // Pausa inicial para no saturar la API (evita el envío demasiado rápido entre múltiples contactos)
    await new Promise(r => setTimeout(r, 1000));

    while (!success && attempts < maxAttempts) {
      attempts++;
      try {
        const url = `https://api.textmebot.com/send.php?recipient=${encodeURIComponent(tel)}&apikey=${apiKey}&text=${encodeURIComponent(mensaje)}`;
        const res = await fetch(url, { method: 'GET' });
        
        if (!res.ok) {
          statusResult = `HTTP ${res.status}`;
          // Si falló, esperamos 2 segundos antes de volver a intentar
          if (attempts < maxAttempts) await new Promise(r => setTimeout(r, 2000));
        } else {
          sent++;
          success = true;
          statusResult = attempts > 1 ? `ok (intento ${attempts})` : 'ok';
        }
      } catch (e: any) {
        statusResult = e.message || 'error';
        // Si hubo error de red/fetch, esperamos 2 segundos antes de reintentar
        if (attempts < maxAttempts) await new Promise(r => setTimeout(r, 2000));
      }
    }

    // Log to Logs_Whatsapp sheet
    try {
      await appendRow('Logs_Whatsapp', [
        timestamp,
        tel,
        nombre,
        mensaje,
        evento || '',
        idTicket || '',
        userAuth.name,
        statusResult
      ]);
    } catch { /* log failure shouldn't block */ }
  }

  return { status: 'success', data: { sent } };
}
