// =====================================================================
// HERRAMIENTAS Y UTILIDADES
// =====================================================================
function jsonResponse(status, dataOrMessage) {
  var resp = { status: status };
  if (status === "success") resp.data    = dataOrMessage;
  else                      resp.message = dataOrMessage;
  return ContentService
    .createTextOutput(JSON.stringify(resp))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheetData(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  return data.slice(1);
}

function actualizarEstadoTicket(idTicket, nuevoEstado) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SOLICITUDES);
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(idTicket)) {
      sheet.getRange(i + 1, 5).setValue(nuevoEstado);
      break;
    }
  }
}

function registrarLog(usuario, idTicket, accion) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.LOGS);
  if (sheet) sheet.appendRow([new Date(), usuario, idTicket, accion]);
}

function computeSHA256(texto) {
  var signature = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, texto);
  var hexString = '';
  for (var i = 0; i < signature.length; i++) {
    var byte = signature[i];
    if (byte < 0) byte += 256;
    var hex = byte.toString(16);
    if (hex.length === 1) hex = '0' + hex;
    hexString += hex;
  }
  return hexString;
}