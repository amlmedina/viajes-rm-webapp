'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MobileDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  useEffect(() => {
    const authRaw = localStorage.getItem('indipris_session_secure');
    if (!authRaw) {
      router.push('/m/login');
      return;
    }
    
    const auth = JSON.parse(authRaw);
    
    fetch('/api/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getDashboard', auth: { u: auth.name, h: auth.hash } })
    })
    .then(r => r.json())
    .then(res => {
      if (res.status === 'success') {
        setData(res.data);
      } else {
        router.push('/m/login');
      }
    })
    .catch(() => router.push('/m/login'))
    .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return <div className="flex justify-center items-center h-full pt-32"><div className="animate-spin text-pink-500 text-4xl">❖</div></div>;
  }

  const solicitudes = data?.solicitudes || [];

  return (
    <div className="p-4 space-y-6 relative overflow-hidden min-h-[calc(100vh-64px)]">
      <header className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Inicio</h1>
          <p className="text-slate-400 font-bold text-xs">Mis solicitudes recientes</p>
        </div>
        <div className="h-10 w-10 bg-slate-200 rounded-full flex items-center justify-center font-black text-slate-500 shadow-inner">
          {typeof window !== 'undefined' && localStorage.getItem('indipris_session_secure') ? (JSON.parse(localStorage.getItem('indipris_session_secure')!)?.name?.charAt(0)?.toUpperCase() || 'U') : 'U'}
        </div>
      </header>

      <div className="flex flex-col gap-4 pb-20">
        {solicitudes.slice().reverse().slice(0, 10).map((sol: any, idx: number) => (
          <TicketCard key={idx} ticket={sol} onClick={() => setSelectedTicket(sol)} />
        ))}
        {solicitudes.length === 0 && (
          <p className="text-center text-slate-400 font-bold py-10">No hay viajes recientes.</p>
        )}
      </div>

      {/* Bottom Sheet Overlay */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 z-[60] transition-opacity duration-300 ${selectedTicket ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSelectedTicket(null)}
      >
        {/* Bottom Sheet Body */}
        <div 
          className={`absolute bottom-0 left-0 w-full bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 flex flex-col max-h-[80vh] ${selectedTicket ? 'translate-y-0' : 'translate-y-full'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Grabber */}
          <div className="pt-3 pb-2 shrink-0">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto" />
          </div>

          {/* Scrollable Content */}
          <div className="px-6 pb-4 space-y-4 overflow-y-auto flex-1 min-h-0">
            {selectedTicket && (
              <>
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">{selectedTicket[0]}</span>
                    <span className="text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider bg-slate-100 text-slate-600">
                      {selectedTicket[4]}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-800">{selectedTicket[3]}</h2>
                  <p className="text-sm font-bold text-slate-500 mt-1">Solicitado por {selectedTicket[2]}</p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3 text-sm font-bold text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fecha Creado</span>
                    <span className="text-slate-800">{new Date(selectedTicket[1]).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pasajeros</span>
                    <span className="text-slate-800">{data?.pasajerosResumen?.[selectedTicket[0]]?.join(', ') || 'Sin pasajeros'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total (aprox)</span>
                    <span className="text-slate-800">${selectedTicket[6] || '0.00'}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sticky Action Buttons — always visible */}
          {selectedTicket && (
            <div className="px-6 pt-3 pb-6 border-t border-slate-100 bg-white shrink-0 rounded-b-none">
              {selectedTicket[4] === 'Cotizado' ? (
                <div className="grid grid-cols-2 gap-3">
                  <button className="bg-white border-2 border-red-500 text-red-600 font-black p-4 rounded-2xl active:scale-95 transition-transform uppercase tracking-widest text-xs">
                    Rechazar
                  </button>
                  <button className="bg-emerald-500 text-white font-black p-4 rounded-2xl shadow-lg active:scale-95 transition-transform uppercase tracking-widest text-xs">
                    Aprobar
                  </button>
                </div>
              ) : (
                <button className="w-full bg-slate-900 text-white font-black p-4 rounded-2xl shadow-lg active:scale-95 transition-transform uppercase tracking-widest text-xs">
                  Ver Detalles Completos
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TicketCard({ ticket, onClick }: { ticket: any[], onClick: () => void }) {
  const [id, date, solicitante, empresa, estado, _, total] = ticket;

  let color = 'bg-slate-100 text-slate-600';
  if (estado === 'Cotizado') color = 'bg-amber-100 text-amber-700 border border-amber-200';
  if (estado === 'Autorizado') color = 'bg-emerald-100 text-emerald-700 border border-emerald-200';
  if (estado === 'Comprado') color = 'bg-blue-100 text-blue-700 border border-blue-200';

  return (
    <div onClick={onClick} className="bg-white rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 active:scale-95 transition-transform flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{id}</span>
          <h3 className="font-bold text-slate-800 leading-tight">{empresa}</h3>
        </div>
        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${color}`}>
          {estado}
        </span>
      </div>
      
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 p-3 rounded-2xl">
        <span>👤 {solicitante}</span>
        <span className="text-slate-300">•</span>
        <span>📅 {new Date(date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}
