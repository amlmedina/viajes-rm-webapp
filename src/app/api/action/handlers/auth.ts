import crypto from 'crypto';
import { getSheetData, getCompaniesMap, updateCell, invalidateSheetCache } from '@/lib/sheets';

const OTP_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 'indipris-otp-salt-secure-key';

// In-memory OTP store kept as fallback for legacy clients on single-instance
const otpStore: Record<string, { code: string; expires: number }> = {};

// ─── Cryptographic Helpers for Stateless OTP ────────────────────────────────

function signOTP(usuario: string, otp: string, expires: number): string {
  const data = `${usuario.toLowerCase()}:${otp}:${expires}`;
  const hmac = crypto.createHmac('sha256', OTP_SECRET).update(data).digest('hex');
  return `${expires}.${hmac}`;
}

function verifySignedOTP(usuario: string, otp: string, token: string): boolean {
  try {
    const [expiresStr, hmac] = token.split('.');
    const expires = Number(expiresStr);
    if (!expires || Date.now() > expires) return false;
    const expectedHmac = crypto.createHmac('sha256', OTP_SECRET)
      .update(`${usuario.toLowerCase()}:${otp}:${expires}`)
      .digest('hex');
    const a = Buffer.from(hmac, 'utf-8');
    const b = Buffer.from(expectedHmac, 'utf-8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function signResetToken(usuario: string, expires: number): string {
  const data = `${usuario.toLowerCase()}:reset:${expires}`;
  const hmac = crypto.createHmac('sha256', OTP_SECRET).update(data).digest('hex');
  return `${expires}.${hmac}`;
}

function verifySignedResetToken(usuario: string, token: string): boolean {
  try {
    const [expiresStr, hmac] = token.split('.');
    const expires = Number(expiresStr);
    if (!expires || Date.now() > expires) return false;
    const expectedHmac = crypto.createHmac('sha256', OTP_SECRET)
      .update(`${usuario.toLowerCase()}:reset:${expires}`)
      .digest('hex');
    const a = Buffer.from(hmac, 'utf-8');
    const b = Buffer.from(expectedHmac, 'utf-8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ─── Authentication & User Lookup ───────────────────────────────────────────

/**
 * Helper to authenticate user for internal API calls.
 * Uses cached 'Usuarios' sheet (sub-millisecond lookup).
 */
export async function authenticateUser(auth: { u: string; h: string }) {
  if (!auth || !auth.u || !auth.h) return null;
  const users = await getSheetData('Usuarios');
  const targetUser = String(auth.u).toLowerCase().trim();
  const user = users.find((row) => {
    return String(row[0] || '').toLowerCase().trim() === targetUser && row[1] === auth.h;
  });
  if (user) {
    return {
      name:       user[0],
      username:   user[0],
      role:       user[2],
      empresa:    user[3],
      email:      user[4],
      telefono:   user[5]
    };
  }
  return null;
}

export async function handleLogin(data: any) {
  const { u, h } = data;
  if (!u || !h) return { status: 'error', message: 'Credenciales incompletas.' };

  const users = await getSheetData('Usuarios');
  const targetUser = String(u).toLowerCase().trim();
  const user = users.find((row) => {
    return String(row[0] || '').toLowerCase().trim() === targetUser && row[1] === h;
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

// ─── OTP Handlers (Stateless with In-Memory Fallback) ─────────────────────────

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

  // Generate 6-digit numeric OTP
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Stateless signed token (survives across serverless lambda instances)
  const token = signOTP(usuario, otp, expires);

  // In-memory fallback for local dev / single instance
  otpStore[usuario.toLowerCase()] = {
    code: otp,
    expires
  };

  console.log(`[OTP] Generated for ${usuario} (${telRegistrado}): ${otp}`);

  return { 
    status: 'success', 
    data: { 
      message: 'OTP enviado.',
      token 
    } 
  };
}

export async function handleVerifyOTP(data: any) {
  const usuario = String(data.usuario || '').trim().toLowerCase();
  const otp = String(data.otp || '').trim();
  const token = String(data.token || data.otpToken || '').trim();

  if (!usuario || !otp) return { status: 'error', message: 'Datos incompletos.' };

  let isValid = false;

  // 1. Try stateless cryptographic verification first (serverless-ready)
  if (token) {
    isValid = verifySignedOTP(usuario, otp, token);
  }

  // 2. Fall back to in-memory store if stateless token wasn't provided or failed
  if (!isValid) {
    const stored = otpStore[usuario];
    if (stored) {
      if (Date.now() <= stored.expires && stored.code === otp) {
        isValid = true;
      }
    }
  }

  if (!isValid) {
    // Check if in-memory was simply expired to give a helpful message
    const stored = otpStore[usuario];
    if (stored && Date.now() > stored.expires) {
      delete otpStore[usuario];
      return { status: 'error', message: 'El OTP expiró. Solicita uno nuevo.' };
    }
    return { status: 'error', message: 'Código incorrecto o expirado. Solicita uno nuevo si es necesario.' };
  }

  // Cleanup in-memory record
  delete otpStore[usuario];

  // Generate signed resetToken valid for 15 minutes to authorize the subsequent password reset
  const resetToken = signResetToken(usuario, Date.now() + 15 * 60 * 1000);

  return { 
    status: 'success', 
    data: {
      message: 'OTP verificado correctamente.',
      resetToken
    }
  };
}

export async function handleResetPassword(data: any) {
  const usuario = String(data.usuario || '').trim();
  const newPassHash = String(data.newPassHash || '').trim();
  const resetToken = String(data.resetToken || '').trim();

  if (!usuario || !newPassHash) return { status: 'error', message: 'Datos incompletos.' };

  // If a resetToken was provided, verify it statelessly
  if (resetToken && !verifySignedResetToken(usuario, resetToken)) {
    return { status: 'error', message: 'Token de restablecimiento inválido o expirado. Vuelve a solicitar el código.' };
  }

  const users = await getSheetData('Usuarios');
  const rowIndex = users.findIndex(u => String(u[0] || '').toLowerCase().trim() === usuario.toLowerCase());
  
  if (rowIndex === -1) return { status: 'error', message: 'Usuario no encontrado.' };

  // Row 1 is header, data starts at row 2 -> rowIndex + 2. Col 2 is Password Hash (column B).
  await updateCell('Usuarios', rowIndex + 2, 2, newPassHash);
  invalidateSheetCache('Usuarios');

  return { status: 'success', data: 'Contraseña actualizada.' };
}
