// =====================================================================
// GENERACIÓN DE ITINERARIO PDF
// =====================================================================
function handleGenerateItineraryPDF(userAuth, data) {
  if (userAuth.role !== 'indipris' && userAuth.role !== 'super' && userAuth.role !== 'admin') {
    return jsonResponse("error", "No tienes permisos para generar itinerarios.");
  }

  var idTicket    = data.idTicket;
  var TEMPLATE_ID = '1MWOSRL8RQS9KUjN0CQs1Pp4Ov2vJ2gCr9jH8bScdZrY';

  var allTickets = getSheetData(CONFIG.SHEETS.SOLICITUDES);
  var ticket = null;
  for (var i = 0; i < allTickets.length; i++) {
    if (String(allTickets[i][0]) === String(idTicket)) { ticket = allTickets[i]; break; }
  }
  if (!ticket) return jsonResponse("error", "Ticket no encontrado.");

  var servicios = getSheetData(CONFIG.SHEETS.SERVICIOS).filter(function(s) {
    return String(s[0]) === String(idTicket);
  });
  var pasajeros = getSheetData(CONFIG.SHEETS.PASAJEROS).filter(function(p) {
    return String(p[0]) === String(idTicket);
  });
  var opcionesCompradas = getSheetData(CONFIG.SHEETS.OPCIONES).filter(function(o) {
    return String(o[0]) === String(idTicket) && o[6] === 'Comprado';
  });

  if (opcionesCompradas.length === 0) {
    return jsonResponse("error", "No hay servicios marcados como 'Comprado' en este ticket.");
  }

  var nombreViajero = pasajeros.length > 0 ? pasajeros[0][1] : ticket[2];
  var equipaje      = pasajeros.length > 0 ? pasajeros[0][4] : "";
  var empresa       = ticket[3];

  var destinosUnicos = [];
  var destVisto = {};
  servicios.forEach(function(s) {
    var d = String(s[3]).toUpperCase();
    if (!destVisto[d]) { destVisto[d] = true; destinosUnicos.push(d); }
  });
  var destinosStr = destinosUnicos.join(", ");

  var parseDate = function(dStr) {
    var p = String(dStr).split(' ')[0].split('/');
    return p.length === 3 ? new Date(p[2], p[1]-1, p[0]) : new Date(dStr);
  };
  var fechas = servicios.map(function(s) { return parseDate(s[4]); }).filter(function(d) { return !isNaN(d); });
  var minDate = fechas.length > 0 ? new Date(Math.min.apply(null, fechas)) : new Date();
  var maxDate = fechas.length > 0 ? new Date(Math.max.apply(null, fechas)) : new Date();

  var meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  var formatoFecha = function(d) {
    return d.getDate() + " " + meses[d.getMonth()] + " " + d.getFullYear();
  };

  var plantilla = DriveApp.getFileById(TEMPLATE_ID);
  var copia     = plantilla.makeCopy("Itinerario_" + idTicket + "_" + empresa);
  var doc       = DocumentApp.openById(copia.getId());
  var body      = doc.getBody();
  body.clear();

  body.appendParagraph("ITINERARIO DE VIAJE")
    .setFontSize(18).setBold(true)
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER)
    .setSpacingBefore(12).setSpacingAfter(14);

  var addCampo = function(label, valor) {
    if (!valor) return;
    var p = body.appendParagraph(label + ": ").setFontSize(11).setBold(true);
    p.appendText(valor).setBold(false);
    p.setSpacingAfter(2);
  };

  addCampo("Viajero",            nombreViajero);
  addCampo("Empresa",            empresa);
  addCampo("Destino(s)",         destinosStr);
  addCampo("Inicio",             formatoFecha(minDate));
  addCampo("Fin",                formatoFecha(maxDate));
  addCampo("Ejecutivo Asignado", userAuth.username);

  body.appendParagraph("Detalle de reservas:")
    .setFontSize(10).setBold(true)
    .setSpacingBefore(10).setSpacingAfter(10);

  opcionesCompradas.forEach(function(op) {
    var descLimpia = String(op[2]).replace(/<\/p>|<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
    var svcInfo = null;
    for (var i = 0; i < servicios.length; i++) {
      if (servicios[i][7] === op[7]) { svcInfo = servicios[i]; break; }
    }
    var tipo = svcInfo ? svcInfo[1] : 'SERVICIO';
    var label = tipo === 'VUELO' ? "Vuelo Confirmado" : tipo === 'HOTEL' ? "Hotel Confirmado" : tipo === 'BUS' ? "Autobus Confirmado" : "Confirmacion";

    var tabla  = body.appendTable();
    var header = tabla.appendTableRow();
    header.appendTableCell(label)
      .setBackgroundColor('#E9EDF8').setBold(true);

    var content = descLimpia;
    if (tipo === 'VUELO' && equipaje && equipaje !== 'N/A') {
      content += "\n\nEquipaje permitido: " + equipaje;
    }
    tabla.appendTableRow().appendTableCell(content).setFontSize(10);
    body.appendParagraph('');
  });

  doc.saveAndClose();

  var pdfBlob   = DriveApp.getFileById(copia.getId()).getAs('application/pdf');
  var folder    = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  var finalFile = folder.createFile(pdfBlob);
  finalFile.setName("Itinerario_" + idTicket + "_" + nombreViajero + ".pdf");
  finalFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var urlPDF = finalFile.getUrl();

  DriveApp.getFileById(copia.getId()).setTrashed(true);
  registrarLog(userAuth.username, idTicket, "Itinerario PDF generado");
  return jsonResponse("success", { url: urlPDF });
}