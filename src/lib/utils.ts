import { appendRow, getSheetData, updateCell } from './sheets';
import crypto from 'crypto';

export async function actualizarEstadoTicket(idTicket: string, nuevoEstado: string) {
  const data = await getSheetData('Solicitudes');
  // Row 1 is header, data[0] is Row 2
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(idTicket)) {
      // Column E is index 4, which is col 5 in 1-based
      await updateCell('Solicitudes', i + 2, 5, nuevoEstado);
      break;
    }
  }
}

export async function registrarLog(usuario: string, idTicket: string, accion: string) {
  await appendRow('Logs', [new Date().toISOString(), usuario, idTicket, accion]);
}

export function computeSHA256(texto: string) {
  return crypto.createHash('sha256').update(texto).digest('hex');
}
