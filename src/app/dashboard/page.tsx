'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import NuevaSolicitudModal from '@/components/NuevaSolicitudModal';

const ESTADOS: Record<string, { badge: string; dot: string }> = {
  Pendiente:  { badge: 'badge badge-pendiente',  dot: 'bg-amber-400' },
  Cotizado:   { badge: 'badge badge-cotizado',   dot: 'bg-blue-500'  },
  Autorizado: { badge: 'badge badge-autorizado', dot: 'bg-violet-500'},
  Comprado:   { badge: 'badge badge-comprado',   dot: 'bg-emerald-500'},
  Cancelado:  { badge: 'badge badge-cancelado',  dot: 'bg-slate-300' },
};

const TIPO_ICON: Record<string, string> = {
  VUELO: '✈️', HOTEL: '🏨', BUS: '🚌', Extra: '➕',
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '—'; }
}

function fmtCurrency(n: number | null | undefined) {
  if (!n) return '—';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

export default function DashboardPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterMes, setFilterMes] = useState('');
  const [showNueva, setShowNueva] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, ticketsRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/tickets'),
      ]);
      if (!dashRes.ok) { router.push('/login'); return; }
      const dashData = await dashRes.json();
      const ticketsData = await ticketsRes.json();
      setUser(dashData.data?.user);
      const t = ticketsData.data || [];
      setTickets(t);
      setFiltered(t);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData, refreshKey]);

  useEffect(() => {
    let data = [...tickets];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(t =>
        t.idTicket?.toLowerCase().includes(q) ||
        t.solicitante?.toLowerCase().includes(q) ||
        t.empresa?.toLowerCase().includes(q) ||
        t.pasajeros?.some((p: any) => p.nombre?.toLowerCase().includes(q))
      );
    }
    if (filterEstado) data = data.filter(t => t.estado === filterEstado);
    if (filterMes) {
      data = data.filter(t => {
        if (!t.fecha) return false;
        const d = new Date(t.fecha);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === filterMes;
      });
    }
    setFiltered(data);
  }, [search, filterEstado, filterMes, tickets]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const role = user?.role;
  const isSuper = role === 'super' || role === 'indipris';

  const stats = {
    pendiente:  tickets.filter(t => t.estado === 'Pendiente').length,
    cotizado:   tickets.filter(t => t.estado === 'Cotizado').length,
    autorizado: tickets.filter(t => t.estado === 'Autorizado').length,
    comprado:   tickets.filter(t => t.estado === 'Comprado').length,
  };

  const totalAutorizado = tickets
    .filter(t => t.estado === 'Autorizado' || t.estado === 'Comprado')
    .flatMap(t => t.opciones || [])
    .filter((o: any) => o.estadoOpcion === 'Autorizada' || o.estadoOpcion === 'Comprado')
    .reduce((sum: number, o: any) => sum + (o.totalIva || 0), 0);

  const meses = Array.from(new Set(
    tickets.map(t => {
      if (!t.fecha) return null;
      const d = new Date(t.fecha);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }).filter(Boolean)
  )) as string[];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500"></div>
        <p className="text-slate-400 font-bold text-xs animate-pulse uppercase tracking-widest">Cargando...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* ── HEADER ──────────────────────────────────── */}
      <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto fade-in">
        <header className="flex flex-col md:flex-row justify-between items-center mb-6 gap-5 bg-white p-5 md:p-6 rounded-[2rem] card-shadow">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="p-1 bg-pink-50 rounded-full shadow-inner hidden md:block">
              <img
                src="https://media.licdn.com/dms/image/v2/D4E0BAQGi5xB-88mWyg/company-logo_200_200/B4EZXs45i2HMAI-/0/1743436094484/indipris_travel_logo?e=2147483647&v=beta&t=qjIrXCyI31f9YqjKpcmrJZJtbDNKyblQ_1tpTXUOwLI"
                className="h-14 w-14 rounded-full object-cover" alt="Logo"
              />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-800">{user?.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="px-3 py-0.5 bg-slate-800 text-white rounded-full text-[9px] font-black uppercase tracking-wider">
                  {role}
                </span>
                {user?.empresa && (
                  <span className="text-xs font-bold text-slate-400">{user.empresa}</span>
                )}
                <button onClick={logout}
                  className="text-[9px] font-black text-pink-600 hover:text-pink-800 transition underline ml-1 uppercase tracking-wider">
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto shrink-0">
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              className="bg-white text-slate-500 border-2 border-slate-200 px-4 py-3.5 rounded-2xl font-black shadow-sm hover:bg-slate-50 active:scale-95 transition"
              title="Actualizar"
            >↻</button>
            <button
              onClick={() => setShowNueva(true)}
              className="flex-1 md:flex-none bg-indipris text-white px-7 py-3.5 rounded-2xl font-black shadow-lg shadow-pink-200 active:scale-95 transition flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
            >
              + Nueva Solicitud
            </button>
          </div>
        </header>

        {/* ── STATS (solo admins/super) ─────────────── */}
        {isSuper && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            <div className="bg-white p-6 rounded-3xl card-shadow border-l-4 border-emerald-500">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inversión Autorizada</p>
              <p className="text-3xl font-black text-slate-800 mt-2">{fmtCurrency(totalAutorizado)}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl card-shadow border-l-4 border-amber-400">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tickets Pendientes</p>
              <p className="text-3xl font-black text-slate-800 mt-2">{stats.pendiente}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl card-shadow border-l-4 border-blue-500">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tickets Comprados</p>
              <p className="text-3xl font-black text-slate-800 mt-2">{stats.comprado}</p>
            </div>
          </div>
        )}

        {/* ── TABLA PRINCIPAL ──────────────────────── */}
        <div className="bg-white rounded-[2rem] card-shadow border border-slate-100 overflow-hidden">
          {/* Filtros */}
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/50 gap-3">
            <h3 className="font-black text-slate-700 text-lg tracking-tight shrink-0">Solicitudes en Curso</h3>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <select
                value={filterEstado}
                onChange={e => setFilterEstado(e.target.value)}
                className="px-3 py-2 rounded-xl border-2 border-slate-200 text-xs font-bold outline-none bg-white"
              >
                <option value="">Todos los Estados</option>
                {Object.keys(ESTADOS).map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <select
                value={filterMes}
                onChange={e => setFilterMes(e.target.value)}
                className="px-3 py-2 rounded-xl border-2 border-slate-200 text-xs font-bold outline-none bg-white"
              >
                <option value="">Todos los Meses</option>
                {meses.map(m => {
                  const [y, mo] = m.split('-');
                  return (
                    <option key={m} value={m}>
                      {new Date(+y, +mo - 1).toLocaleString('es-MX', { month: 'long', year: 'numeric' })}
                    </option>
                  );
                })}
              </select>
              <input
                type="text"
                placeholder="Buscar ticket..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="px-3 py-2 rounded-xl border-2 border-slate-200 text-xs font-bold outline-none flex-1 min-w-[160px]"
              />
              {(search || filterEstado || filterMes) && (
                <button
                  onClick={() => { setSearch(''); setFilterEstado(''); setFilterMes(''); }}
                  className="px-3 py-2 rounded-xl border-2 border-rose-200 bg-rose-50 text-rose-500 text-xs font-black"
                >✕</button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-white text-slate-400 text-[9px] uppercase font-black tracking-widest border-b border-slate-100">
                  <th className="px-5 py-4">ID Ticket</th>
                  <th className="px-5 py-4">Solicitante</th>
                  <th className="px-5 py-4">Pasajeros</th>
                  <th className="px-5 py-4">Resumen</th>
                  <th className="px-5 py-4">Estado</th>
                  <th className="px-5 py-4">Fecha</th>
                  <th className="px-5 py-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-16 text-center text-slate-300 font-black italic text-xs">
                      {tickets.length === 0 ? 'No hay solicitudes.' : 'Sin resultados para tu búsqueda.'}
                    </td>
                  </tr>
                ) : filtered.map((t) => {
                  const est = ESTADOS[t.estado] || ESTADOS['Pendiente'];
                  const paxNames = t.pasajeros?.slice(0, 2).map((p: any) => p.nombre?.split(' ')[0]).join(', ') || '—';
                  const extraPax = t.pasajeros?.length > 2 ? ` +${t.pasajeros.length - 2}` : '';
                  const tipos = [...new Set((t.servicios || []).map((s: any) => s.tipo))];

                  return (
                    <tr
                      key={t.id}
                      onClick={() => router.push(`/dashboard/ticket/${t.idTicket}`)}
                      className="border-b border-slate-50 hover:bg-slate-50/80 transition cursor-pointer group"
                    >
                      <td className="px-5 py-3.5">
                        <span className="font-mono font-black text-indipris text-xs">{t.idTicket}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-700 text-xs">{t.solicitante}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{t.empresa}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs font-bold text-slate-600">{paxNames}{extraPax}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1">
                          {tipos.map((tipo: any) => (
                            <span key={tipo} title={tipo}>{TIPO_ICON[tipo] || '📋'}</span>
                          ))}
                          {tipos.length === 0 && <span className="text-slate-300 text-xs">—</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={est.badge}>{t.estado}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[10px] font-bold text-slate-400">{fmtDate(t.fecha)}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={e => { e.stopPropagation(); router.push(`/dashboard/ticket/${t.idTicket}`); }}
                          className="bg-slate-100 group-hover:bg-pink-50 group-hover:text-indipris text-slate-500 px-4 py-1.5 rounded-xl text-[10px] font-black transition uppercase tracking-widest"
                        >
                          Ver →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-50 bg-slate-50/50">
              <p className="text-[10px] font-bold text-slate-400">
                {filtered.length} de {tickets.length} solicitudes
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Nueva Solicitud modal */}
      {showNueva && (
        <NuevaSolicitudModal
          user={user}
          onClose={() => setShowNueva(false)}
          onSuccess={() => { setShowNueva(false); setRefreshKey(k => k + 1); }}
        />
      )}
    </div>
  );
}
