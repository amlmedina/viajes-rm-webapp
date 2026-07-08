// =====================================================================
// RUTAS Y PLANTILLAS
// =====================================================================
function doGet(e) {
  // Si piden ?action=script, servir todos los módulos JS concatenados
  if (e && e.parameter && e.parameter.action === 'script') {
    var modules = [
      'Scripts_core', 'Scripts_auth', 'Scipts_init', 'Scripts_nav',
      'Scripts_dashboard', 'Scripts_detalles', 'Scripts_cotizar',
      'Scripts_acciones', 'Scripts_edit', 'Scripts_admin'
    ];
    var jsContent = '';
    for (var i = 0; i < modules.length; i++) {
      try {
        var raw = HtmlService.createTemplateFromFile(modules[i]).getRawContent();
        raw = raw.replace(/^<script>\s*/i, '').replace(/\s*<\/script>\s*$/i, '');
        jsContent += '\n// ── ' + modules[i] + ' ──\n' + raw + '\n';
      } catch (err) {
        jsContent += '\nconsole.error("[ERROR] No se pudo cargar: ' + modules[i] + ' - ' + err.message.replace(/'/g, "\\'") + '");\n';
      }
    }
    return ContentService.createTextOutput(jsContent).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Travel ERP')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function doPost(e) {
  try {
    const data   = JSON.parse(e.postData.contents);
    const action = data.action;

    // ══════════════════════════════════════════════════════════════════
    // RUTAS PÚBLICAS (sin sesión)
    // ══════════════════════════════════════════════════════════════════
    if (action === "login")          return handleLogin(data);
    if (action === "requestOTP")     return handleRequestOTP(data);
    if (action === "verifyOTP")      return handleVerifyOTP(data);
    if (action === "resetPassword")  return handleResetPassword(data);

    // ══════════════════════════════════════════════════════════════════
    // VALIDACIÓN DE SESIÓN
    // ══════════════════════════════════════════════════════════════════
    const userAuth = authenticateUser(data.auth);
    if (!userAuth) {
      return jsonResponse("error", "Sesión inválida o expirada. Por favor, inicia sesión de nuevo.");
    }

    // ══════════════════════════════════════════════════════════════════
    // LECTURA (Getters.gs)
    // ══════════════════════════════════════════════════════════════════
    if (action === "getDashboard")              return handleGetDashboard(userAuth);
    if (action === "getCatalogos")              return handleGetCatalogos(userAuth);
    if (action === "getTicketDetails")          return handleGetTicketDetails(userAuth, data);
    if (action === "getContactosNotificacion")  return handleGetContactosNotificacion(userAuth, data);
    if (action === "getFinanzas")               return handleGetFinanzas(userAuth);
    if (action === "getCompanies")              return handleGetCompanies(userAuth);
    if (action === "getUsuarios")               return handleGetUsuarios(userAuth);
    if (action === "getPasajeroDetalle")        return handleGetPasajeroDetalle(userAuth, data);
    if (action === "getUsuarioDetalle")         return handleGetUsuarioDetalle(userAuth, data);
    if (action === "getMetricasTiempos")        return handleGetMetricasTiempos(userAuth, data);
    if (action === "getNotificaciones")         return handleGetNotificaciones(userAuth, data);
    if (action === "getLogsWhatsapp")           return handleGetLogsWhatsapp(userAuth, data);
    if (action === "getConfigWA")               return handleGetConfigWA(userAuth, data);
    if (action === "getReporteDetallado")       return handleGetReporteDetallado(userAuth, data);

    // ══════════════════════════════════════════════════════════════════
    // ESCRITURA — Tickets (Código.gs)
    // ══════════════════════════════════════════════════════════════════
    if (action === "createRequest")             return handleCreateRequest(userAuth, data);
    if (action === "editTicket")                return handleEditTicket(userAuth, data);
    if (action === "cancelRequest")             return handleCancelRequest(userAuth, data);
    if (action === "cambiarEstado")             return handleCambiarEstado(userAuth, data);
    if (action === "updateTicketEvento")        return handleUpdateTicketEvento(userAuth, data);
    if (action === "reasignarEjecutivo")        return handleReasignarEjecutivo(userAuth, data);

    // ══════════════════════════════════════════════════════════════════
    // ESCRITURA — Cotizaciones y Opciones (Código.gs)
    // ══════════════════════════════════════════════════════════════════
    if (action === "saveAllOptions")            return handleSaveAllOptions(userAuth, data);
    if (action === "authorizeOptions")          return handleAuthorizeOptions(userAuth, data);
    if (action === "rejectOptions")             return handleRejectOptions(userAuth, data);
    if (action === "rejectSpecificOptions")     return handleRejectSpecificOptions(userAuth, data);
    if (action === "ajustarPrecio")             return handleAjustarPrecio(userAuth, data);
    if (action === "agregarExtra")              return handleAgregarExtra(userAuth, data);
    if (action === "updatePNR")                 return handleUpdatePNR(userAuth, data);
    if (action === "markPurchased")             return handleMarkPurchased(userAuth, data);

    // ══════════════════════════════════════════════════════════════════
    // ESCRITURA — Usuarios y Config (Código.gs)
    // ══════════════════════════════════════════════════════════════════
    if (action === "saveUser")                  return handleSaveUser(userAuth, data);
    if (action === "saveEvento")                return handleSaveEvento(userAuth, data);
    if (action === "saveNotificacion")          return handleSaveNotificacion(userAuth, data);
    if (action === "deleteNotificacion")        return handleDeleteNotificacion(userAuth, data);
    if (action === "sendTestWhatsapp")          return handleSendTestWhatsapp(userAuth, data);
    if (action === "logWhatsapp")               return handleLogWhatsapp(userAuth, data);
    if (action === "sendWhatsapp")              return handleSendWhatsapp(userAuth, data);
    if (action === "toggleVacaciones")          return handleToggleVacaciones(userAuth, data);
    if (action === "deleteExtra")               return handleDeleteExtra(userAuth, data);
    if (action === "saveConfigWA")              return handleSaveConfigWA(userAuth, data);

    // ══════════════════════════════════════════════════════════════════
    // UTILIDADES (Código.gs / posters.gs)
    // ══════════════════════════════════════════════════════════════════
    if (action === "uploadFile")                return handleUploadFile(userAuth, data);
    if (action === "generateItineraryPDF")      return handleGenerateItineraryPDF(userAuth, data);
    if (action === "exportarALegacy")           return handleExportarALegacy(userAuth, data);

    return jsonResponse("error", "Acción no encontrada en el servidor: " + action);
  } catch (err) {
    return jsonResponse("error", "Error del servidor: " + err.message);
  }
}