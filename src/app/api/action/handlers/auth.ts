import { getSheetData, getCompaniesMap } from '@/lib/sheets';

// Helper to authenticate user for internal API calls
export async function authenticateUser(auth: { u: string, h: string }) {
  if (!auth || !auth.u || !auth.h) return null;
  const users = await getSheetData('Usuarios');
  const user = users.find((row) => {
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

export async function handleLogin(data: any) {
  const { u, h } = data;
  const users = await getSheetData('Usuarios');
  const user = users.find((row) => {
    return String(row[0]).toLowerCase().trim() === String(u).toLowerCase().trim() && row[1] === h;
  });
  if (user) {
    const empresaCSV = String(user[3] || '').trim();
    const empresaIds = empresaCSV ? empresaCSV.split(',').map(s => s.trim()) : [];
    const companiesMap = await getCompaniesMap();
    let empresaNombre = '';
    if (empresaIds.length > 0 && companiesMap[empresaIds[0]]) {
      empresaNombre = companiesMap[empresaIds[0]];
    } else if (empresaIds.length > 0) {
      empresaNombre = empresaIds[0];
    }
    return {
      status: 'success',
      data: {
        name:           user[0],
        username:       user[0],
        hash:           user[1],
        role:           user[2],
        empresa:        empresaCSV,
        empresaIds:     empresaIds,
        empresaNombre:  empresaNombre,
        email:          user[4],
        telefono:       user[5]
      }
    };
  }
  return { status: 'error', message: 'Credenciales incorrectas' };
}

// In-memory OTP store (since we don't have PropertiesService)
const otpStore: Record<string, { code: string, expires: number }> = {};

export async function handleRequestOTP(data: any) {
  const usuario = String(data.usuario || '').trim();
  const telefono = String(data.telefono || '').trim();
  if (!usuario || !telefono) return { status: 'error', message: 'Datos incompletos.' };

  const usuarios = await getSheetData('Usuarios');
  const userRow = usuarios.find(row => String(row[0] || '').toLowerCase().trim() === usuario.toLowerCase());
  
  if (!userRow) return { status: 'error', message: 'Usuario no encontrado.' };

  const telRegistrado = String(userRow[5] || '').trim();
  const limpiar = (t: string) => t.replace(/\D/g, '').slice(-10);
  if (limpiar(telefono) !== limpiar(telRegistrado)) {
    return { status: 'error', message: 'El teléfono no coincide con el registrado.' };
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  
  otpStore[usuario.toLowerCase()] = {
    code: otp,
    expires: Date.now() + 600000 // 10 minutes
  };

  // Skip WhatsApp actual sending for now, just mock success
  console.log(`[OTP] Sent to ${telRegistrado}: ${otp}`);

  return { status: 'success', data: { message: 'OTP enviado.' } };
}

export async function handleVerifyOTP(data: any) {
  const usuario = String(data.usuario || '').trim().toLowerCase();
  const otp = String(data.otp || '').trim();
  if (!usuario || !otp) return { status: 'error', message: 'Datos incompletos.' };

  const stored = otpStore[usuario];
  if (!stored) return { status: 'error', message: 'No hay OTP activo para este usuario. Solicita uno nuevo.' };

  if (Date.now() > stored.expires) {
    delete otpStore[usuario];
    return { status: 'error', message: 'El OTP expiró. Solicita uno nuevo.' };
  }

  if (stored.code !== otp) return { status: 'error', message: 'Código incorrecto.' };

  delete otpStore[usuario];
  return { status: 'success', data: 'OTP verificado correctamente.' };
}

export async function handleResetPassword(data: any) {
  return { status: 'error', message: 'Not implemented fully yet.' };
}
