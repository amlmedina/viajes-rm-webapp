'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MobileLogin() {
  const router = useRouter();
  const [step, setStep] = useState<'LOGIN' | 'OTP_REQUEST' | 'OTP_VERIFY'>('LOGIN');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const hashPassword = async (p: string) => {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(p));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !password) return;
    setLoading(true); setError('');
    
    try {
      const hash = await hashPassword(password);
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', u: user, h: hash })
      });
      
      const data = await res.json();
      
      if (res.ok && data.status === 'success') {
        localStorage.setItem('indipris_session_secure', JSON.stringify({
          name: data.data.username,
          role: data.data.role,
          empresa: data.data.empresa,
          email: data.data.email,
          phone: data.data.telefono,
          hash: data.data.hash
        }));
        
        document.cookie = `indipris_session=${data.data.hash}; path=/; max-age=86400`;
        router.push('/m/dashboard');
      } else {
        setError(data.message || 'Credenciales incorrectas.');
      }
    } catch (err) {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !phone) return;
    setLoading(true); setError('');
    
    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'requestOTP', usuario: user, telefono: phone })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setStep('OTP_VERIFY');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
      
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-xl border border-slate-100 flex flex-col gap-8">
        
        <div className="flex flex-col items-center">
          <div className="h-20 w-20 rounded-full bg-pink-100 mb-4 flex items-center justify-center shadow-inner overflow-hidden">
             <img src="https://media.licdn.com/dms/image/v2/D4E0BAQGi5xB-88mWyg/company-logo_200_200/B4EZXs45i2HMAI-/0/1743436094484/indipris_travel_logo?e=2147483647&v=beta&t=qjIrXCyI31f9YqjKpcmrJZJtbDNKyblQ_1tpTXUOwLI" className="object-cover w-full h-full" alt="Indipris"/>
          </div>
          <h1 className="text-2xl font-black text-slate-800">Indipris ERP</h1>
          <p className="text-slate-400 font-bold text-xs">Acceso Móvil Corporativo</p>
        </div>

        {error && <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl text-center">{error}</div>}

        {step === 'LOGIN' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input 
              type="text" 
              placeholder="Usuario o correo" 
              value={user} onChange={e => setUser(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold outline-none focus:border-pink-500 transition-colors"
            />
            <input 
              type="password" 
              placeholder="Contraseña" 
              value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold outline-none focus:border-pink-500 transition-colors"
            />
            <button 
              disabled={loading}
              className="w-full bg-pink-500 text-white font-black p-4 rounded-2xl shadow-lg shadow-pink-200 mt-2 active:scale-95 transition-transform uppercase tracking-widest text-sm"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
            <button type="button" onClick={() => setStep('OTP_REQUEST')} className="text-xs font-bold text-slate-400 mt-2 text-center underline">
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        )}

        {step === 'OTP_REQUEST' && (
          <form onSubmit={handleOTPRequest} className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <p className="text-xs font-bold text-slate-500 text-center mb-2">Te enviaremos un código por WhatsApp.</p>
            <input 
              type="text" 
              placeholder="Tu Usuario" 
              value={user} onChange={e => setUser(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold outline-none focus:border-pink-500"
            />
            <input 
              type="tel" 
              placeholder="Teléfono a 10 dígitos" 
              value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold outline-none focus:border-pink-500"
            />
            <button 
              disabled={loading}
              className="w-full bg-slate-900 text-white font-black p-4 rounded-2xl shadow-lg mt-2 active:scale-95 transition-transform uppercase tracking-widest text-sm"
            >
              {loading ? 'Enviando...' : 'Pedir Código'}
            </button>
            <button type="button" onClick={() => setStep('LOGIN')} className="text-xs font-bold text-slate-400 mt-2 text-center underline">
              Volver al Login
            </button>
          </form>
        )}

        {step === 'OTP_VERIFY' && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-200">
             <p className="text-xs font-bold text-emerald-600 text-center mb-2">Código enviado a {phone}</p>
             <input 
              type="number"
              autoComplete="one-time-code" 
              placeholder="6 Dígitos" 
              value={otp} onChange={e => setOtp(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-black text-2xl tracking-[0.5em] text-center outline-none focus:border-emerald-500 transition-colors"
            />
            <button className="w-full bg-emerald-500 text-white font-black p-4 rounded-2xl shadow-lg mt-2 active:scale-95 uppercase tracking-widest text-sm">
              Verificar
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
