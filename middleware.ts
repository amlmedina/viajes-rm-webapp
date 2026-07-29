import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Detect mobile user agent
  const userAgent = request.headers.get('user-agent') || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // Si es móvil y está intentando acceder a la raíz o a rutas no móviles, reescribir a la vista móvil
  if (isMobile && !path.startsWith('/m') && !path.startsWith('/api') && !path.startsWith('/_next')) {
    // Rewrite transparente para que la URL se mantenga igual pero sirva la vista móvil
    return NextResponse.rewrite(new URL(`/m${path === '/' ? '' : path}`, request.url));
  }

  // Si no es móvil, pero intenta entrar a /m manualmente, podemos dejarlo pasar o redirigirlo,
  // por ahora lo dejamos pasar para pruebas en escritorio.
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
