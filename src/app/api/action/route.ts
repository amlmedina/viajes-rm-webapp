import { NextResponse } from 'next/server';
import { handleLogin, handleRequestOTP, handleVerifyOTP, handleResetPassword } from './handlers/auth';
import {
  handleGetDashboard,
  handleGetTicketDetails,
  handleGetFinanzas,
  handleGetCompanies,
  handleGetCatalogos,
  handleGetNotificaciones,
  handleGetLogsWhatsapp
} from './handlers/getters';
import {
  handleCreateRequest,
  handleSaveAllOptions,
  handleUploadFile,
  handleAuthorizeOptions,
  handleRejectOptions,
  handleRejectSpecificOptions,
  handleMarkPurchased,
  handleAjustarPrecio,
  handleAgregarExtra,
  handleDeleteExtra,
  handleUpdatePNR,
  handleCambiarEstado,
  handleCancelRequest,
  handleUpdateServices,
  handleUpdatePassengers,
  handleUpdateTicketEvento,
} from './handlers/writers';
import { handleExportarALegacy } from './handlers/orbix';
import {
  handleGetConfigWA,
  handleGetContactosNotificacion,
  handleSendWhatsapp
} from './handlers/whatsapp';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action;
    
    // Auth actions don't require pre-validation
    if (action === 'login') return NextResponse.json(await handleLogin(body));
    if (action === 'requestOTP') return NextResponse.json(await handleRequestOTP(body));
    if (action === 'verifyOTP') return NextResponse.json(await handleVerifyOTP(body));
    if (action === 'resetPassword') return NextResponse.json(await handleResetPassword(body));
    
    // For other actions, we need auth payload
    const auth = body.auth;
    if (!auth || !auth.u || !auth.h) {
      return NextResponse.json({ status: 'error', message: 'Sesión inválida o expirada. Por favor, inicia sesión de nuevo.' });
    }
    
    switch (action) {
      // ── Getters ──────────────────────────────────────────────────────────
      case 'getDashboard':         return NextResponse.json(await handleGetDashboard(auth));
      case 'getTicketDetails':     return NextResponse.json(await handleGetTicketDetails(auth, body));
      case 'getFinanzas':          return NextResponse.json(await handleGetFinanzas(auth));
      case 'getCompanies':         return NextResponse.json(await handleGetCompanies(auth));
      case 'getCatalogos':         return NextResponse.json(await handleGetCatalogos(auth));
      case 'getNotificaciones':    return NextResponse.json(await handleGetNotificaciones(auth, body));
      case 'getLogsWhatsapp':           return NextResponse.json(await handleGetLogsWhatsapp(auth, body));
      case 'getConfigWA':               return NextResponse.json(await handleGetConfigWA(auth));
      case 'getContactosNotificacion':  return NextResponse.json(await handleGetContactosNotificacion(auth, body));
      case 'sendWhatsapp':              return NextResponse.json(await handleSendWhatsapp(auth, body));

      // ── Cotizaciones & Opciones ───────────────────────────────────────────
      case 'saveAllOptions':       return NextResponse.json(await handleSaveAllOptions(auth, body));
      case 'uploadFile':           return NextResponse.json(await handleUploadFile(auth, body));
      case 'authorizeOptions':     return NextResponse.json(await handleAuthorizeOptions(auth, body));
      case 'rejectOptions':        return NextResponse.json(await handleRejectOptions(auth, body));
      case 'rejectSpecificOptions':return NextResponse.json(await handleRejectSpecificOptions(auth, body));
      case 'ajustarPrecio':        return NextResponse.json(await handleAjustarPrecio(auth, body));
      case 'agregarExtra':         return NextResponse.json(await handleAgregarExtra(auth, body));
      case 'deleteExtra':          return NextResponse.json(await handleDeleteExtra(auth, body));
      case 'updatePNR':            return NextResponse.json(await handleUpdatePNR(auth, body));

      // ── Ticket State ──────────────────────────────────────────────────────
      case 'cambiarEstado':        return NextResponse.json(await handleCambiarEstado(auth, body));
      case 'cancelRequest':        return NextResponse.json(await handleCancelRequest(auth, body));
      case 'markPurchased':        return NextResponse.json(await handleMarkPurchased(auth, body));
      case 'exportarALegacy':      return NextResponse.json(await handleExportarALegacy(auth, body));

      // ── Solicitudes ───────────────────────────────────────────────────────
      case 'createRequest':        return NextResponse.json(await handleCreateRequest(auth, body));
      case 'updateTicketEvento':   return NextResponse.json(await handleUpdateTicketEvento(auth, body));
      case 'updateServices':       return NextResponse.json(await handleUpdateServices(auth, body));
      case 'updatePassengers':     return NextResponse.json(await handleUpdatePassengers(auth, body));

      default:
        return NextResponse.json({ status: 'error', message: `Acción no soportada: ${action}` });
    }
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ status: 'error', message: error.message || 'Error interno del servidor.' }, { status: 500 });
  }
}
