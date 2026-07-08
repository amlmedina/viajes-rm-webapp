
  
  // =====================================================================
// CONFIGURACIÓN GLOBAL
// =====================================================================
const CONFIG = {
  SHEETS: {
    USUARIOS:       'Usuarios',
    SOLICITUDES:    'Solicitudes',
    SERVICIOS:      'Servicios_Detalle',
    PASAJEROS:      'Pasajeros',
    OPCIONES:       'Opciones_Cotizacion',
    LOGS:           'Logs',
    // ─── NUEVAS HOJAS ───
    LOGS_ESTADO:    'Logs_Estado',
    NOTIFICACIONES: 'Notificaciones',
    EVENTOS:        'Eventos',
    POLITICAS:      'Politicas',
    LOGS_WHATSAPP:  'Logs_Whatsapp',
    CONFIG_WA:      'Config_Whatsapp'
  },
  COMPANIES_SS_ID:  '19M9mCVrYBzCYDQlIz-tiDks-sXcOc4F8wucjAMPZeeQ',
  COMPANIES_SHEET:  'Companies',
  DRIVE_FOLDER_ID:  '1SalfWTHMSUVHuaemuyCdY2iUsqAsq4Q2',
  LEGACY_SS_ID:     '19M9mCVrYBzCYDQlIz-tiDks-sXcOc4F8wucjAMPZeeQ'   // ← ID de tu Google Sheet Legacy (Orbix) si lo usas
};

// API Key para envío de WhatsApp via textmebot.com
const WHATSAPP_API_KEY = '';  // ← Pon aquí tu API key

// =====================================================================
// HOJAS NUEVAS — Créalas en tu Spreadsheet con estos encabezados:
// =====================================================================
// Logs_Estado    → IdTicket | Estado | Timestamp | Usuario | EmpresaId | AsignadoA
// Notificaciones → EmpresaId | EjecutivoUsername | CREACION | AUTORIZADO | RECHAZADO | CANCELADO
// Eventos        → Nombre | EmpresaId | FechaCreacion | CreadoPor  (se auto-crea)
// Politicas      → EmpresaId | MontoMaxSinAuth | FeeVuelo | FeeHotel | FeeBus | FeeOtro | Notas
// Logs_Whatsapp  → Timestamp | Telefono | Mensaje | Evento | IdTicket | Enviado Por
// =====================================================================

function getCompaniesMap() {
  var map = {};
  try {
    var sheet = SpreadsheetApp
      .openById(CONFIG.COMPANIES_SS_ID)
      .getSheetByName(CONFIG.COMPANIES_SHEET);
    if (!sheet) return map;
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      var id = String(rows[i][0] || '').trim();
      var nombre = String(rows[i][1] || '').trim();
      if (id) map[id] = nombre || id;
    }
  } catch(e) {}
  return map;
}