// =====================================================================
// AUTENTICACIÓN
// =====================================================================
function authenticateUser(auth) {
  if (!auth || !auth.u || !auth.h) return null;
  const users = getSheetData(CONFIG.SHEETS.USUARIOS);
  const user = users.find(function(row) {
    return String(row[0]).toLowerCase().trim() === String(auth.u).toLowerCase().trim()
        && row[1] === auth.h;
  });
  if (user) return {
    name:       user[0],
    username:   user[0],
    role:       user[2],
    empresa:    user[3],
    email:      user[4],
    telefono:   user[5]
  };
  return null;
}

function handleLogin(data) {
  const u = data.u;
  const h = data.h;
  const users = getSheetData(CONFIG.SHEETS.USUARIOS);
  const user = users.find(function(row) {
    return String(row[0]).toLowerCase() === String(u).toLowerCase() && row[1] === h;
  });
  if (user) {
    var empresaCSV = String(user[3] || '').trim();
    var empresaIds = empresaCSV ? empresaCSV.split(',').map(function(s){return s.trim();}) : [];
    
    // Resolver nombre legible de la primera empresa
    var companiesMap = getCompaniesMap();
    var empresaNombre = '';
    if (empresaIds.length > 0 && companiesMap[empresaIds[0]]) {
      empresaNombre = companiesMap[empresaIds[0]];
    } else if (empresaIds.length > 0) {
      empresaNombre = empresaIds[0];
    }

    return jsonResponse("success", {
      name:           user[0],
      username:       user[0],
      hash:           user[1],
      role:           user[2],
      empresa:        empresaCSV,
      empresaIds:     empresaIds,
      empresaNombre:  empresaNombre,
      email:          user[4],
      telefono:       user[5]
    });
  }
  return jsonResponse("error", "Credenciales incorrectas");
}


// =====================================================================
// OTP — Solicitar código de verificación
// =====================================================================
function handleRequestOTP(data) {
  var usuario  = String(data.usuario || '').trim();
  var telefono = String(data.telefono || '').trim();
  if (!usuario || !telefono) return jsonResponse("error", "Datos incompletos.");

  var usuarios = getSheetData(CONFIG.SHEETS.USUARIOS);
  var userRow  = null;
  for (var i = 0; i < usuarios.length; i++) {
    if (String(usuarios[i][0] || '').toLowerCase().trim() === usuario.toLowerCase()) {
      userRow = usuarios[i];
      break;
    }
  }
  if (!userRow) return jsonResponse("error", "Usuario no encontrado.");

  var telRegistrado = String(userRow[5] || '').trim();
  var limpiar = function(t) { return t.replace(/\D/g, '').slice(-10); };
  if (limpiar(telefono) !== limpiar(telRegistrado)) {
    return jsonResponse("error", "El teléfono no coincide con el registrado.");
  }

  var otp = String(Math.floor(100000 + Math.random() * 900000));

  var props = PropertiesService.getScriptProperties();
  props.setProperty('OTP_' + usuario.toLowerCase(), JSON.stringify({
    code: otp,
    expires: Date.now() + 600000
  }));

  try {
    if (WHATSAPP_API_KEY) {
      var msg = '*Indipris Travel*\nTu codigo de verificacion es: *' + otp + '*\n\nExpira en 10 minutos.';
      var url = 'https://api.textmebot.com/send.php?recipient=' + telRegistrado
              + '&apikey=' + WHATSAPP_API_KEY
              + '&text=' + encodeURIComponent(msg);
      UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    }
  } catch (e) { /* si falla el envío, el OTP ya está guardado */ }

  return jsonResponse("success", { message: "OTP enviado." });
}


// =====================================================================
// OTP — Verificar código
// =====================================================================
function handleVerifyOTP(data) {
  var usuario = String(data.usuario || '').trim().toLowerCase();
  var otp     = String(data.otp || '').trim();
  if (!usuario || !otp) return jsonResponse("error", "Datos incompletos.");

  var props  = PropertiesService.getScriptProperties();
  var stored = props.getProperty('OTP_' + usuario);

  if (!stored) return jsonResponse("error", "No hay OTP activo para este usuario. Solicita uno nuevo.");

  var parsed = JSON.parse(stored);

  if (Date.now() > parsed.expires) {
    props.deleteProperty('OTP_' + usuario);
    return jsonResponse("error", "El OTP expiró. Solicita uno nuevo.");
  }

  if (parsed.code !== otp) return jsonResponse("error", "Código incorrecto.");

  props.deleteProperty('OTP_' + usuario);
  return jsonResponse("success", "OTP verificado correctamente.");
}


// =====================================================================
// Restablecer contraseña (post-OTP o forzado)
// =====================================================================
function handleResetPassword(data) {
  var usuario     = String(data.usuario || '').trim();
  var newPassHash = String(data.newPassHash || '').trim();
  if (!usuario || !newPassHash) return jsonResponse("error", "Datos incompletos.");

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.USUARIOS);
  var rows  = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || '').toLowerCase().trim() === usuario.toLowerCase().trim()) {
      sheet.getRange(i + 1, 2).setValue(newPassHash);
      registrarLog(usuario, '-', "Cambió su contraseña");
      return jsonResponse("success", "Contraseña actualizada.");
    }
  }

  return jsonResponse("error", "Usuario no encontrado.");
}