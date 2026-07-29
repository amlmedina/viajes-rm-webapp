'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isLogin = pathname === '/m/login' || pathname === '/login';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Contenido Principal */}
      <main className={`flex-1 flex flex-col ${!isLogin ? 'pb-20' : ''}`}>
        {children}
      </main>

      {/* Bottom Navigation Bar */}
      {!isLogin && (
        <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-50">
          <NavItem 
            icon="🏠" 
            label="Inicio" 
            isActive={pathname === '/m/dashboard'} 
            onClick={() => router.push('/m/dashboard')}
          />
          <NavItem 
            icon="🎫" 
            label="Solicitudes" 
            isActive={pathname === '/m/solicitudes'} 
            onClick={() => router.push('/m/solicitudes')}
          />
          <NavItem 
            icon="💰" 
            label="Finanzas" 
            isActive={pathname === '/m/finanzas'} 
            onClick={() => router.push('/m/finanzas')}
          />
          <NavItem 
            icon="👤" 
            label="Perfil" 
            isActive={pathname === '/m/perfil'} 
            onClick={() => router.push('/m/perfil')}
          />
        </nav>
      )}
    </div>
  );
}

function NavItem({ icon, label, isActive, onClick }: { icon: string, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-pink-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}
    >
      <span className="text-xl">{icon}</span>
      <span className={`text-[10px] font-bold ${isActive ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
        {label}
      </span>
    </button>
  );
}
