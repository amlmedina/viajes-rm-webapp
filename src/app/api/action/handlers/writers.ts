import { authenticateUser } from './auth';
import { appendRow, getSheetData, updateCell, updateRow, getDriveClient, DRIVE_FOLDER_ID } from '@/lib/sheets';
import { registrarLog } from '@/lib/utils';
import { Readable } from 'stream';

// ─────────────────────────────────────────────────────────────────────────────
// CREATE REQUEST (Bulk & single)
// ─────────────────────────────────────────────────────────────────────────────
export async function handleCreateRequest(authParams: any, data: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth) return { status: 'error', message: 'Sesión inválida.' };

  try {
    const { empresa, evento, notas, servicios, pasajeros } = data;
    const idTicket = `REQ-${Math.floor(300000 + Math.random() * 100000)}`;
    const fechaStr = new Date().toISOString().split('T')[0];

    const solicitudRow = [
      idTicket,
      fechaStr,
      userAuth.name,
      empresa || userAuth.empresa,
      'Pendiente',
      notas || '',
      0,
      '',
      '',
      evento || ''
    ];
    await appendRow('Solicitudes', solicitudRow);

    if (servicios && servicios.length > 0) {
      for (const s of servicios) {
        const servicioRow = [
          idTicket,
          s.tipo || 'VUELO',
          s.origen || '',
          s.destino || '',
          s.fechaIn || '',
          s.fechaOut || '',
          s.detalles || '',
          s.idServicio || `SVC-${Date.now()}${Math.floor(Math.random() * 1000)}`
        ];
        await appendRow('Servicios_Detalle', servicioRow);
      }
    }

    if (pasajeros && pasajeros.length > 0) {
      for (const p of pasajeros) {
        const pasajeroRow = [
          idTicket,
          p.nombre || '',
          p.nacimiento || '',
          p.asiento || 'Indiferente',
          p.maletas || 'Solo Artículo Personal',
          p.linkId || '',
          p.viajeroFrecuente || ''
        ];
        await appendRow('Pasajeros', pasajeroRow);
      }
    }

    await registrarLog(userAuth.name, idTicket, 'Creó solicitud');

    return { status: 'success', data: { idTicket, message: 'Solicitud creada con éxito.' } };
  } catch (error: any) {
    console.error('Error creating request:', error);
    return { status: 'error', message: error.message || 'Error al guardar en Google Sheets.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SAVE ALL OPTIONS (Cotización)
// ─────────────────────────────────────────────────────────────────────────────
// Sheet: Opciones_Cotizacion
// Cols: [0]IdOpcion [1]IdTicket [2]IdServicio [3]Costo [4]Fee [5]Total [6]Estado [7]Descripcion [8]Img [9]CostoProveedor [10]Timestamp
export async function handleSaveAllOptions(authParams: any, data: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth) return { status: 'error', message: 'Sesión inválida.' };
  if (userAuth.role !== 'indipris' && userAuth.role !== 'super') {
    return { status: 'error', message: 'Sin permisos para cotizar.' };
  }

  try {
    const { idTicket, opciones } = data;
    if (!idTicket || !opciones || opciones.length === 0) {
      return { status: 'error', message: 'Datos incompletos.' };
    }

    // Load existing options for this ticket
    const existingRows = await getSheetData('Opciones_Cotizacion');
    const allRows = await getSheetData('Opciones_Cotizacion'); // with row positions
    // We need the actual row indices (1-based including header)
    // Row index in sheet = index in existingRows + 2 (1 for header + 1 for 0-based)
    const existingMap: Record<string, number> = {}; // idOpcion -> sheetRowIndex
    existingRows.forEach((row, i) => {
      const idOp = String(row[1] || '').trim();
      const ticketId = String(row[0] || '').trim();
      if (idOp && ticketId === idTicket) {
        existingMap[idOp] = i + 2; // +2 = header row + 0-based
      }
    });

    // Mark all existing options for this ticket as 'Pendiente' (will be overwritten)
    // Then upsert: if existingId provided & found → update, else → append
    const timestamp = new Date().toISOString();

    for (const op of opciones) {
      const idOpcion = op.existingId || `OPT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const row = [
        idTicket,
        idOpcion,
        op.desc || '',
        op.costo || 0,
        op.fee || 0,
        op.total || 0,
        'Propuesta',
        op.idServicio || '',
        op.img || '',
        op.costoProveedor || 0,
        timestamp
      ];

      if (op.existingId && existingMap[op.existingId]) {
        // Update existing row
        await updateRow('Opciones_Cotizacion', existingMap[op.existingId], 1, row);
      } else {
        // Append new row
        await appendRow('Opciones_Cotizacion', row);
      }
    }

    // Update ticket status to 'Cotizado'
    const solicitudes = await getSheetData('Solicitudes');
    for (let i = 0; i < solicitudes.length; i++) {
      if (String(solicitudes[i][0]) === String(idTicket)) {
        await updateCell('Solicitudes', i + 2, 5, 'Cotizado');
        break;
      }
    }

    await registrarLog(userAuth.name, idTicket, `Guardó cotización (${opciones.length} opciones)`);

    return { status: 'success', data: { idTicket } };
  } catch (error: any) {
    console.error('Error saving options:', error);
    return { status: 'error', message: error.message || 'Error al guardar cotización.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD FILE — base64 data URI (stored directly in Sheets cell)
// No Drive quota needed. Client compresses image before sending.
// ─────────────────────────────────────────────────────────────────────────────
export async function handleUploadFile(authParams: any, data: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth) return { status: 'error', message: 'Sesión inválida.' };

  try {
    const { base64, mimeType } = data;
    if (!base64) return { status: 'error', message: 'No se recibió imagen.' };

    const dataUri = `data:${mimeType || 'image/jpeg'};base64,${base64}`;

    // Safety check: Google Sheets cell limit is ~50,000 chars
    if (dataUri.length > 49000) {
      return { status: 'error', message: 'Imagen demasiado grande. Por favor usa una imagen más pequeña o de menor resolución.' };
    }

    return { status: 'success', data: { url: dataUri } };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Error al procesar imagen.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTHORIZE OPTIONS
// ─────────────────────────────────────────────────────────────────────────────
export async function handleAuthorizeOptions(authParams: any, data: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth) return { status: 'error', message: 'Sesión inválida.' };

  try {
    const { idTicket, optionIds, idOpcionesElegidas, seleccion } = data; // optionIds: string[]
    const finalOptionIds = optionIds || idOpcionesElegidas || seleccion || [];
    const rows = await getSheetData('Opciones_Cotizacion');

    for (let i = 0; i < rows.length; i++) {
      const idOp = String(rows[i][1] || '').trim();
      const ticketId = String(rows[i][0] || '').trim();
      if (ticketId !== String(idTicket)) continue;

      const currentState = String(rows[i][6] || '').trim();
      if (currentState === 'Extra' || currentState === 'Eliminado') continue;

      const newStatus = finalOptionIds.includes(idOp) ? 'Autorizada' : 'Rechazada';
      await updateCell('Opciones_Cotizacion', i + 2, 7, newStatus);
    }

    // Update ticket status
    const solicitudes = await getSheetData('Solicitudes');
    for (let i = 0; i < solicitudes.length; i++) {
      if (String(solicitudes[i][0]) === String(idTicket)) {
        await updateCell('Solicitudes', i + 2, 5, 'Autorizado');
        break;
      }
    }

    await registrarLog(userAuth.name, idTicket, 'Autorizó opciones');
    return { status: 'success', data: { idTicket } };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Error al autorizar.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REJECT OPTIONS (all)
// ─────────────────────────────────────────────────────────────────────────────
export async function handleRejectOptions(authParams: any, data: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth) return { status: 'error', message: 'Sesión inválida.' };

  try {
    const { idTicket, motivo } = data;
    const rows = await getSheetData('Opciones_Cotizacion');

    for (let i = 0; i < rows.length; i++) {
      const ticketId = String(rows[i][0] || '').trim();
      if (ticketId !== String(idTicket)) continue;
      await updateCell('Opciones_Cotizacion', i + 2, 7, 'Rechazada');
    }

    // Ticket back to Cotizado (or Pendiente depending on flow)
    const solicitudes = await getSheetData('Solicitudes');
    for (let i = 0; i < solicitudes.length; i++) {
      if (String(solicitudes[i][0]) === String(idTicket)) {
        await updateCell('Solicitudes', i + 2, 5, 'Cotizado');
        if (motivo) await updateCell('Solicitudes', i + 2, 6, motivo);
        break;
      }
    }

    await registrarLog(userAuth.name, idTicket, `Rechazó opciones: ${motivo || ''}`);
    return { status: 'success', data: { idTicket } };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Error al rechazar.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REJECT SPECIFIC OPTIONS
// ─────────────────────────────────────────────────────────────────────────────
export async function handleRejectSpecificOptions(authParams: any, data: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth) return { status: 'error', message: 'Sesión inválida.' };

  try {
    const { idTicket, optionIds } = data; // optionIds: string[]
    const rows = await getSheetData('Opciones_Cotizacion');

    for (let i = 0; i < rows.length; i++) {
      const idOp = String(rows[i][1] || '').trim();
      if (optionIds.includes(idOp)) {
        await updateCell('Opciones_Cotizacion', i + 2, 7, 'Rechazada');
      }
    }

    await registrarLog(userAuth.name, idTicket, `Rechazó opciones específicas: ${optionIds.join(',')}`);
    return { status: 'success', data: { idTicket } };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Error al rechazar opciones.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARK PURCHASED
// ─────────────────────────────────────────────────────────────────────────────
export async function handleMarkPurchased(authParams: any, data: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth) return { status: 'error', message: 'Sesión inválida.' };

  try {
    const { idTicket, comprobanteUrl } = data;
    const solicitudes = await getSheetData('Solicitudes');
    for (let i = 0; i < solicitudes.length; i++) {
      if (String(solicitudes[i][0]) === String(idTicket)) {
        await updateCell('Solicitudes', i + 2, 5, 'Comprado');
        break;
      }
    }

    // Update authorized options to 'Comprado' and save receipt image at col 12 (index 11)
    const options = await getSheetData('Opciones_Cotizacion');
    for (let i = 0; i < options.length; i++) {
      const ticketId = String(options[i][0] || '').trim();
      const estado = String(options[i][6] || '').trim();
      if (ticketId === String(idTicket) && estado === 'Autorizada') {
        await updateCell('Opciones_Cotizacion', i + 2, 7, 'Comprado'); // col 7 is Estado_Opcion
        if (comprobanteUrl) {
          await updateCell('Opciones_Cotizacion', i + 2, 12, comprobanteUrl); // col 12 is receipt image
        }
      }
    }

    await registrarLog(userAuth.name, idTicket, 'Marcó como Comprado' + (comprobanteUrl ? ' (con comprobante)' : ''));
    return { status: 'success', data: { idTicket } };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Error al marcar como comprado.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AJUSTAR PRECIO
// ─────────────────────────────────────────────────────────────────────────────
export async function handleAjustarPrecio(authParams: any, data: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth) return { status: 'error', message: 'Sesión inválida.' };

  try {
    const { idTicket, ajustes } = data; // ajustes: [{idOpcion, nuevoCosto, nuevoFee, nuevoTotal}]
    const rows = await getSheetData('Opciones_Cotizacion');

    for (const ajuste of ajustes) {
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][0]) === String(ajuste.idOpcion)) {
          await updateCell('Opciones_Cotizacion', i + 2, 4, ajuste.nuevoCosto);
          await updateCell('Opciones_Cotizacion', i + 2, 5, ajuste.nuevoFee);
          await updateCell('Opciones_Cotizacion', i + 2, 6, ajuste.nuevoTotal);
          // Removed status reset to 'Pendiente' to maintain 'Autorizada'
          break;
        }
      }
    }

    // Removed ticket status reset to 'Cotizado'

    await registrarLog(userAuth.name, idTicket, 'Ajustó precios');
    return { status: 'success', data: { idTicket } };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Error al ajustar precio.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AGREGAR EXTRA
// ─────────────────────────────────────────────────────────────────────────────
export async function handleAgregarExtra(authParams: any, data: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth) return { status: 'error', message: 'Sesión inválida.' };

  try {
    const { idTicket, desc, costo, fee, total, idServicio } = data;
    const idOpcion = `EXT-${Date.now()}`;
    const row = [idOpcion, idTicket, idServicio || '', costo || 0, fee || 0, total || 0, 'Pendiente', desc || '', '', 0, new Date().toISOString()];
    await appendRow('Opciones_Cotizacion', row);
    await registrarLog(userAuth.name, idTicket, `Agregó extra: ${desc}`);
    return { status: 'success', data: { idOpcion } };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Error al agregar extra.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE EXTRA
// ─────────────────────────────────────────────────────────────────────────────
export async function handleDeleteExtra(authParams: any, data: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth) return { status: 'error', message: 'Sesión inválida.' };

  try {
    const { idTicket, idOpcion } = data;
    const rows = await getSheetData('Opciones_Cotizacion');
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]) === String(idOpcion)) {
        // Mark as deleted (set status = 'Eliminado') instead of actually deleting rows to avoid index shifts
        await updateCell('Opciones_Cotizacion', i + 2, 7, 'Eliminado');
        break;
      }
    }
    await registrarLog(userAuth.name, idTicket, `Eliminó extra: ${idOpcion}`);
    return { status: 'success', data: { idOpcion } };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Error al eliminar extra.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE PNR
// ─────────────────────────────────────────────────────────────────────────────
export async function handleUpdatePNR(authParams: any, data: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth) return { status: 'error', message: 'Sesión inválida.' };

  try {
    const { idTicket, ajustes } = data; // ajustes: [{ idOpcion, nuevaDesc }]
    const rows = await getSheetData('Opciones_Cotizacion');
    
    for (const ajuste of ajustes) {
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][1]) === String(ajuste.idOpcion)) {
          await updateCell('Opciones_Cotizacion', i + 2, 3, ajuste.nuevaDesc); // column 3 (C) is Descripcion
          break;
        }
      }
    }

    await registrarLog(userAuth.name, idTicket, `Actualizó PNR/Vuelo de opciones: ${ajustes.map((a: any) => a.idOpcion).join(', ')}`);
    return { status: 'success', data: { idTicket } };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Error al actualizar PNR.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE TICKET EVENTO
// ─────────────────────────────────────────────────────────────────────────────
export async function handleUpdateTicketEvento(authParams: any, data: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth) return { status: 'error', message: 'Sesión inválida.' };

  try {
    const { idTicket, evento } = data;
    const rows = await getSheetData('Solicitudes');
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]) === String(idTicket)) {
        await updateCell('Solicitudes', i + 2, 10, evento); // col 10 (J) is Evento
        break;
      }
    }
    await registrarLog(userAuth.name, idTicket, `Actualizó evento a: ${evento}`);
    return { status: 'success', data: { idTicket } };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Error al actualizar evento del ticket.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMBIAR ESTADO
// ─────────────────────────────────────────────────────────────────────────────
export async function handleCambiarEstado(authParams: any, data: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth) return { status: 'error', message: 'Sesión inválida.' };

  try {
    const { idTicket, estado, nuevoEstado, motivo } = data;
    const finalEstado = estado || nuevoEstado;
    const rows = await getSheetData('Solicitudes');
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]) === String(idTicket)) {
        await updateCell('Solicitudes', i + 2, 5, finalEstado);
        if (motivo) await updateCell('Solicitudes', i + 2, 6, motivo);
        break;
      }
    }
    await registrarLog(userAuth.name, idTicket, `Cambió estado a ${estado}`);
    return { status: 'success', data: { idTicket } };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Error al cambiar estado.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL REQUEST
// ─────────────────────────────────────────────────────────────────────────────
export async function handleCancelRequest(authParams: any, data: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth) return { status: 'error', message: 'Sesión inválida.' };

  try {
    const { idTicket, motivo } = data;
    const rows = await getSheetData('Solicitudes');
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][0]) === String(idTicket)) {
        await updateCell('Solicitudes', i + 2, 5, 'Cancelado');
        if (motivo) await updateCell('Solicitudes', i + 2, 6, motivo);
        break;
      }
    }
    await registrarLog(userAuth.name, idTicket, `Canceló solicitud: ${motivo || ''}`);
    return { status: 'success', data: { idTicket } };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Error al cancelar.' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE SERVICES (edit servicios)
// ─────────────────────────────────────────────────────────────────────────────
export async function handleUpdateServices(authParams: any, data: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth) return { status: 'error', message: 'Sesión inválida.' };
  return { status: 'error', message: 'No implementado aún.' };
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE PASSENGERS
// ─────────────────────────────────────────────────────────────────────────────
export async function handleUpdatePassengers(authParams: any, data: any) {
  const userAuth = await authenticateUser(authParams);
  if (!userAuth) return { status: 'error', message: 'Sesión inválida.' };
  return { status: 'error', message: 'No implementado aún.' };
}
