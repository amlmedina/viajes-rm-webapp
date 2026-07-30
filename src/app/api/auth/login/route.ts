import { NextResponse } from 'next/server';
import { handleLogin } from '../../action/handlers/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Our existing handleLogin takes { u, h }
    const result = await handleLogin(body);
    
    if (result.status === 'success') {
      const response = NextResponse.json(result);
      // Set the session cookie for Next.js Desktop Middleware
      response.cookies.set('indipris_session', result.data?.hash || '', {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
      return response;
    }
    
    return NextResponse.json(result, { status: 401 });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
