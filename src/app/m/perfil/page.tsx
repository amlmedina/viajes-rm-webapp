'use client';
import { useRouter } from 'next/navigation';

export default function MobilePerfil() {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('indipris_session_secure');
    document.cookie = 'indipris_session=; path=/; max-age=0';
    router.push('/m/login');
  };

  return (
    <div className="p-4 space-y-6">
      <header className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Perfil</h1>
        <p className="text-slate-400 font-bold text-xs">Ajustes y Cuenta</p>
      </header>
      
      <div className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex items-center gap-4">
        <div className="h-16 w-16 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center text-2xl font-black">
          {localStorage.getItem('indipris_session_secure') ? JSON.parse(localStorage.getItem('indipris_session_secure')!).name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div>
          <h2 className="font-black text-slate-800 text-lg">
            {localStorage.getItem('indipris_session_secure') ? JSON.parse(localStorage.getItem('indipris_session_secure')!).name : 'Usuario'}
          </h2>
          <p className="font-bold text-slate-400 text-sm">
            {localStorage.getItem('indipris_session_secure') ? JSON.parse(localStorage.getItem('indipris_session_secure')!).empresa : 'Empresa'}
          </p>
        </div>
      </div>

      <button onClick={handleLogout} className="w-full bg-slate-100 text-red-500 font-black p-4 rounded-2xl active:scale-95 transition-transform uppercase tracking-widest text-xs">
        Cerrar Sesión
      </button>
    </div>
  );
}
