'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const hashPassword = async (p: string) => {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(p));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !password) return;
    
    setLoading(true);
    setError('');
    
    try {
      const hash = await hashPassword(password);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ u: user, h: hash })
      });
      
      const data = await res.json();
      
      if (res.ok && data.status === 'success') {
        router.push('/dashboard');
      } else {
        setError(data.message || 'Credenciales incorrectas.');
      }
    } catch (err) {
      setError('Error de red. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-slate-50">
      <div className="absolute top-0 left-0 w-full h-3 bg-pink-500"></div>
      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 p-10 space-y-8 relative border border-slate-100">
        <div className="text-center">
          <img
            src="https://media.licdn.com/dms/image/v2/D4E0BAQGi5xB-88mWyg/company-logo_200_200/B4EZXs45i2HMAI-/0/1743436094484/indipris_travel_logo?e=2147483647&v=beta&t=qjIrXCyI31f9YqjKpcmrJZJtbDNKyblQ_1tpTXUOwLI"
            className="h-28 w-28 mx-auto rounded-full shadow-lg border-4 border-pink-50 object-cover" 
            alt="Logo"
          />
          <h1 className="text-3xl font-black mt-6 tracking-tight text-slate-800">Indipris ERP</h1>
          <p className="text-slate-400 text-sm font-bold mt-1">Gestión Corporativa de Viajes</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <input 
            type="text" 
            placeholder="Usuario o correo"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            className="w-full rounded-2xl border-2 border-slate-100 p-4 bg-slate-50 font-bold text-slate-700 outline-none focus:border-pink-500 transition-colors"
          />
          <input 
            type="password" 
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border-2 border-slate-100 p-4 bg-slate-50 font-bold text-slate-700 outline-none focus:border-pink-500 transition-colors"
          />
          {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-pink-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-pink-200 active:scale-95 transition uppercase tracking-widest text-sm disabled:opacity-50"
          >
            {loading ? 'VERIFICANDO...' : 'Entrar al Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}
