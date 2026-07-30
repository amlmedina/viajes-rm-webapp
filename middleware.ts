import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Detect mobile user agent
  const userAgent = request.headers.get('user-agent') || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // ── 1. ROUTING MÓVIL ──────────────────────────────────────────────
  // Si es móvil y está intentando acceder a la raíz o a rutas de escritorio, redirigir a /m/dashboard
  if (isMobile && !path.startsWith('/m') && !path.startsWith('/api') && !path.startsWith('/_next')) {
    return NextResponse.redirect(new URL('/m/dashboard', request.url));
  }

  // ── 2. PROTECCIÓN DE RUTAS DE ESCRITORIO (NEXT.JS APP) ─────────────
  // Si el usuario usa el frontend de Next.js (no la raíz / de Google Apps Script)
  const token = request.cookies.get('indipris_session');

  if (path.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (path === '/login' && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
